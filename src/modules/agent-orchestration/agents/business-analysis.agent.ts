import { Injectable } from '@nestjs/common';
import { BaseAgent } from './base.agent';
import { AgentContext, AgentResult, AgentType } from '../../../common/interfaces/agent.interface';
import { OpenAIService } from '../openai.service';
import { BusinessOverview, MarketStrategy } from '../../../common/interfaces/business-report.interface';

@Injectable()
export class BusinessAnalysisAgent extends BaseAgent {
  constructor(private openAIService: OpenAIService) {
    super(
      'business-analysis-001',
      AgentType.BUSINESS_ANALYSIS,
      'Business Analysis Agent',
      'Analyzes business operations, GTM strategy, and marketing approach',
    );
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      if (!this.validateInput(context)) {
        return this.createResult(false, null, 'Invalid input context');
      }

      this.logger.log(`Starting business analysis for ${context.website}`);

      // Get scraped data from context
      const scrapedPages = context.collectedData.get('scrapedPages');
      const extractedWebData = context.collectedData.get('extractedWebData');

      if (!scrapedPages || scrapedPages.length === 0) {
        return this.createResult(false, null, 'No scraped data available for analysis');
      }

      const { result, duration } = await this.measureExecutionTime(async () => {
        const businessOverview = await this.analyzeBusinessOverview(scrapedPages, extractedWebData);
        const marketStrategy = await this.analyzeMarketStrategy(scrapedPages, extractedWebData);
        
        return {
          businessOverview,
          marketStrategy,
        };
      });

      // Store analysis results in context
      context.collectedData.set('businessOverview', result.businessOverview);
      context.collectedData.set('marketStrategy', result.marketStrategy);

      const confidence = this.calculateAnalysisConfidence(result);

      this.logger.log(`Completed business analysis with confidence ${confidence}`);

      return this.createResult(
        true,
        result,
        undefined,
        confidence,
        duration,
      );
    } catch (error) {
      this.logger.error(`Business analysis failed: ${error.message}`);
      return this.createResult(false, null, error.message, 0, 0);
    }
  }

  private async analyzeBusinessOverview(
    scrapedPages: any[],
    extractedWebData: any,
  ): Promise<BusinessOverview> {
    // Find relevant pages
    const aboutPages = scrapedPages.filter(page => 
      ['about', 'general'].includes(page.metadata?.pageType)
    );
    const homepage = scrapedPages.find(page => 
      new URL(page.url).pathname === '/'
    ) || scrapedPages[0];

    // Prepare data for analysis
    const analysisData = {
      homepageContent: homepage ? {
        title: homepage.title,
        content: homepage.content.substring(0, 3000),
        metadata: homepage.metadata,
      } : null,
      aboutPagesContent: aboutPages.map(page => ({
        url: page.url,
        title: page.title,
        content: page.content.substring(0, 2000),
      })),
      structuredData: extractedWebData?.structuredData?.filter(data => 
        data['@type'] === 'Organization' || data['@type'] === 'Corporation'
      ),
    };

    const prompt = `
Analyze the following business website data and extract:
1. Business name
2. Industry/sector
3. Comprehensive business description (2-3 sentences)
4. Main business operations/activities (list of key activities)
5. Founded year (if mentioned)
6. Headquarters location (if mentioned)
7. Company size/employee count (if mentioned)

Focus on factual information found in the content.
`;

    const businessOverview = await this.openAIService.extractStructuredData<BusinessOverview>(
      prompt,
      analysisData,
      {
        name: 'string',
        industry: 'string',
        description: 'string',
        operations: ['string'],
        foundedYear: 'number',
        headquarters: 'string',
        employeeCount: 'string',
      },
    );

    return this.validateBusinessOverview(businessOverview);
  }

  private async analyzeMarketStrategy(
    scrapedPages: any[],
    extractedWebData: any,
  ): Promise<MarketStrategy> {
    // Find relevant pages
    const productPages = scrapedPages.filter(page => 
      page.metadata?.pageType === 'products' || 
      page.url.toLowerCase().includes('product') ||
      page.url.toLowerCase().includes('service') ||
      page.url.toLowerCase().includes('solution')
    );

    // Prepare data for analysis
    const analysisData = {
      productPagesContent: productPages.map(page => ({
        url: page.url,
        title: page.title,
        content: page.content.substring(0, 2000),
      })),
      allPageTitles: scrapedPages.map(p => p.title),
      socialLinks: extractedWebData?.socialLinks || {},
      structuredData: extractedWebData?.structuredData?.filter(data => 
        data['@type'] === 'Product' || data['@type'] === 'Service'
      ),
    };

    const prompt = `
Analyze the following business website data and determine:
1. Target market (who are their customers?)
2. Go-to-market strategy (how do they reach customers?)
3. Marketing channels used (website, social media, content, etc.)
4. Competitive advantages (what makes them unique?)
5. Value proposition (what value do they provide?)

Base your analysis on the actual content and evidence found.
`;

    const marketStrategy = await this.openAIService.extractStructuredData<MarketStrategy>(
      prompt,
      analysisData,
      {
        targetMarket: 'string',
        goToMarketStrategy: 'string',
        marketingChannels: ['string'],
        competitiveAdvantages: ['string'],
        valueProposition: 'string',
      },
    );

    return this.validateMarketStrategy(marketStrategy);
  }

  private validateBusinessOverview(data: BusinessOverview): BusinessOverview {
    return {
      name: data.name || 'Unknown',
      industry: data.industry || 'Not specified',
      description: data.description || 'No description available',
      operations: Array.isArray(data.operations) ? data.operations : [],
      foundedYear: data.foundedYear && !isNaN(data.foundedYear) ? data.foundedYear : undefined,
      headquarters: data.headquarters || undefined,
      employeeCount: data.employeeCount || undefined,
    };
  }

  private validateMarketStrategy(data: MarketStrategy): MarketStrategy {
    return {
      targetMarket: data.targetMarket || 'Not specified',
      goToMarketStrategy: data.goToMarketStrategy || 'Not specified',
      marketingChannels: Array.isArray(data.marketingChannels) ? data.marketingChannels : [],
      competitiveAdvantages: Array.isArray(data.competitiveAdvantages) ? data.competitiveAdvantages : [],
      valueProposition: data.valueProposition || undefined,
    };
  }

  private calculateAnalysisConfidence(result: any): number {
    const { businessOverview, marketStrategy } = result;
    
    let confidence = 0;

    // Business overview scoring
    if (businessOverview.name !== 'Unknown') confidence += 0.15;
    if (businessOverview.industry !== 'Not specified') confidence += 0.15;
    if (businessOverview.description !== 'No description available') confidence += 0.1;
    if (businessOverview.operations.length > 0) confidence += 0.1;

    // Market strategy scoring
    if (marketStrategy.targetMarket !== 'Not specified') confidence += 0.15;
    if (marketStrategy.goToMarketStrategy !== 'Not specified') confidence += 0.15;
    if (marketStrategy.marketingChannels.length > 0) confidence += 0.1;
    if (marketStrategy.valueProposition) confidence += 0.1;

    return Math.min(confidence, 1);
  }
}