import { Injectable } from '@nestjs/common';
import { BaseAgent } from './base.agent';
import { AgentContext, AgentResult, AgentType } from '../../../common/interfaces/agent.interface';
import { WebScrapingService } from '../../web-scraping/web-scraping.service';

@Injectable()
export class WebCrawlerAgent extends BaseAgent {
  constructor(private webScrapingService: WebScrapingService) {
    super(
      'web-crawler-001',
      AgentType.WEB_CRAWLER,
      'Web Crawler Agent',
      'Extracts content from target website and related pages',
    );
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      if (!this.validateInput(context)) {
        return this.createResult(false, null, 'Invalid input context');
      }

      this.logger.log(`Starting web crawling for ${context.website}`);

      const { result, duration } = await this.measureExecutionTime(async () => {
        return await this.webScrapingService.scrapeWebsite(
          context.website,
          context.maxPages,
        );
      });

      if (!result.success || result.pages.length === 0) {
        return this.createResult(
          false,
          null,
          'Failed to scrape any pages from the website',
          0,
          duration,
        );
      }

      // Store scraped data in context
      context.collectedData.set('scrapedPages', result.pages);
      context.collectedData.set('scrapingErrors', result.errors);
      context.currentPageCount = result.totalPagesScraped;

      // Extract key information from scraped pages
      const extractedData = this.extractKeyInformation(result.pages);
      context.collectedData.set('extractedWebData', extractedData);

      this.logger.log(`Successfully scraped ${result.totalPagesScraped} pages`);

      return this.createResult(
        true,
        {
          pagesScraped: result.totalPagesScraped,
          errors: result.errors.length,
          extractedData,
        },
        undefined,
        this.calculateCrawlerConfidence(result),
        duration,
      );
    } catch (error) {
      this.logger.error(`Web crawling failed: ${error.message}`);
      return this.createResult(false, null, error.message, 0, 0);
    }
  }

  private extractKeyInformation(pages: any[]): any {
    const data = {
      urls: pages.map(p => p.url),
      titles: pages.map(p => p.title),
      pageTypes: {},
      contactInfo: {
        emails: [] as string[],
        phones: [] as string[],
        addresses: [] as string[],
      },
      socialLinks: {},
      structuredData: [],
      personnelMentions: [],
    };

    // Use temporary sets for deduplication
    const emailSet = new Set<string>();
    const phoneSet = new Set<string>();
    const addressSet = new Set<string>();

    pages.forEach(page => {
      // Page types
      const pageType = page.metadata?.pageType || 'general';
      data.pageTypes[pageType] = (data.pageTypes[pageType] || 0) + 1;

      // Contact info
      if (page.metadata?.contactInfo) {
        page.metadata.contactInfo.emails?.forEach(e => emailSet.add(e));
        page.metadata.contactInfo.phones?.forEach(p => phoneSet.add(p));
        page.metadata.contactInfo.addresses?.forEach(a => addressSet.add(a));
      }

      // Social links
      if (page.metadata?.socialLinks) {
        Object.assign(data.socialLinks, page.metadata.socialLinks);
      }

      // Structured data
      if (page.metadata?.structuredData) {
        data.structuredData.push(...page.metadata.structuredData);
      }

      // Personnel mentions
      if (page.metadata?.personnelInfo) {
        data.personnelMentions.push(...page.metadata.personnelInfo);
      }
    });

    // Convert sets to arrays
    data.contactInfo.emails = Array.from(emailSet);
    data.contactInfo.phones = Array.from(phoneSet);
    data.contactInfo.addresses = Array.from(addressSet);

    return data;
  }

  private calculateCrawlerConfidence(result: any): number {
    let confidence = 0.3; // Base confidence for successful crawl

    // Add confidence based on pages scraped
    confidence += Math.min(result.totalPagesScraped * 0.05, 0.3);

    // Add confidence for finding important page types
    const hasImportantPages = result.pages.some(p => 
      ['about', 'team', 'contact', 'products'].includes(p.metadata?.pageType)
    );
    if (hasImportantPages) confidence += 0.2;

    // Reduce confidence for errors
    const errorRate = result.errors.length / (result.totalPagesScraped + result.errors.length);
    confidence -= errorRate * 0.2;

    return Math.max(0, Math.min(1, confidence));
  }
}