import { Injectable } from '@nestjs/common';
import { BaseAgent } from './base.agent';
import { AgentContext, AgentResult, AgentType } from '../../../common/interfaces/agent.interface';
import { OpenAIService } from '../openai.service';
import { CurrentStatus, NewsItem } from '../../../common/interfaces/business-report.interface';
import axios from 'axios';

@Injectable()
export class NewsResearchAgent extends BaseAgent {
  constructor(private openAIService: OpenAIService) {
    super(
      'news-research-001',
      AgentType.NEWS_RESEARCH,
      'News Research Agent',
      'Finds recent news, developments, challenges, and opportunities',
    );
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      if (!this.validateInput(context)) {
        return this.createResult(false, null, 'Invalid input context');
      }

      this.logger.log(`Starting news research for ${context.website}`);

      // Get business data from context
      const businessOverview = context.collectedData.get('businessOverview');
      const scrapedPages = context.collectedData.get('scrapedPages');

      if (!businessOverview) {
        return this.createResult(false, null, 'Business overview not available for news research');
      }

      const { result, duration } = await this.measureExecutionTime(async () => {
        return await this.analyzeCurrentStatus(businessOverview, scrapedPages);
      });

      // Store news data in context
      context.collectedData.set('currentStatus', result);

      const confidence = this.calculateNewsConfidence(result);

      this.logger.log(`Found ${result.recentNews.length} news items with confidence ${confidence}`);

      return this.createResult(
        true,
        result,
        undefined,
        confidence,
        duration,
      );
    } catch (error) {
      this.logger.error(`News research failed: ${error.message}`);
      return this.createResult(false, null, error.message, 0, 0);
    }
  }

  private async analyzeCurrentStatus(
    businessOverview: any,
    scrapedPages: any[],
  ): Promise<CurrentStatus> {
    // Find news/blog pages
    const newsPages = scrapedPages.filter(page => 
      page.metadata?.pageType === 'news' || 
      page.url.toLowerCase().includes('news') ||
      page.url.toLowerCase().includes('blog') ||
      page.url.toLowerCase().includes('press') ||
      page.url.toLowerCase().includes('insights')
    );

    // Extract news items from pages
    const newsFromPages = await this.extractNewsFromPages(newsPages);

    // Search for external news (simplified for MVP - in production, would use news API)
    const externalNews = await this.searchExternalNews(businessOverview.name);

    // Combine and deduplicate news
    const allNews = [...newsFromPages, ...externalNews]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10); // Keep top 10 most recent

    // Analyze challenges and opportunities
    const analysisData = {
      businessName: businessOverview.name,
      industry: businessOverview.industry,
      recentNews: allNews,
      websiteContent: scrapedPages.slice(0, 5).map(p => ({
        title: p.title,
        content: p.content.substring(0, 1000),
      })),
    };

    const prompt = `
Based on the business information and recent news, identify:
1. Current challenges the business might be facing
2. Opportunities for growth or improvement
3. Industry trends affecting this business

Be specific and base your analysis on the actual content provided.
`;

    const analysis = await this.openAIService.extractStructuredData<{
      challenges: string[];
      opportunities: string[];
      trends: string[];
    }>(
      prompt,
      analysisData,
      {
        challenges: ['string'],
        opportunities: ['string'],
        trends: ['string'],
      },
    );

    return {
      recentNews: allNews,
      challenges: analysis.challenges || [],
      opportunities: analysis.opportunities || [],
      trends: analysis.trends || [],
    };
  }

  private async extractNewsFromPages(newsPages: any[]): Promise<NewsItem[]> {
    const newsItems: NewsItem[] = [];

    for (const page of newsPages) {
      try {
        // Use AI to extract news items from page content
        const prompt = `
Extract news items from this webpage content. For each news item, extract:
- title
- date (if available)
- summary (2-3 sentences)
- relevance to the business (high/medium/low)

Focus on recent developments, announcements, and updates.
`;

        const extractedNews = await this.openAIService.extractStructuredData<{
          newsItems: Array<{
            title: string;
            date?: string;
            summary: string;
            relevance: 'high' | 'medium' | 'low';
          }>;
        }>(
          prompt,
          {
            url: page.url,
            title: page.title,
            content: page.content.substring(0, 3000),
            metadata: page.metadata,
          },
          {
            newsItems: [{
              title: 'string',
              date: 'string',
              summary: 'string',
              relevance: 'string',
            }],
          },
        );

        // Convert to NewsItem format
        if (extractedNews.newsItems) {
          for (const item of extractedNews.newsItems) {
            newsItems.push({
              title: item.title,
              date: item.date ? new Date(item.date) : new Date(),
              source: new URL(page.url).hostname,
              url: page.url,
              summary: item.summary,
              relevance: item.relevance || 'medium',
            });
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to extract news from ${page.url}: ${error.message}`);
      }
    }

    return newsItems;
  }

  private async searchExternalNews(businessName: string): Promise<NewsItem[]> {
    // Simplified external news search
    // In production, this would use a proper news API
    try {
      // For MVP, we'll return empty array
      // In production, integrate with NewsAPI, Google News API, etc.
      return [];
    } catch (error) {
      this.logger.warn(`External news search failed: ${error.message}`);
      return [];
    }
  }

  private calculateNewsConfidence(result: CurrentStatus): number {
    let confidence = 0;

    // Base confidence for having any data
    if (result.recentNews.length > 0) confidence += 0.3;
    if (result.challenges.length > 0) confidence += 0.2;
    if (result.opportunities.length > 0) confidence += 0.2;
    if (result.trends && result.trends.length > 0) confidence += 0.1;

    // Additional confidence for comprehensive news
    if (result.recentNews.length >= 5) confidence += 0.1;
    
    // High relevance news adds confidence
    const highRelevanceCount = result.recentNews.filter(n => n.relevance === 'high').length;
    if (highRelevanceCount > 0) confidence += 0.1;

    return Math.min(confidence, 1);
  }
}