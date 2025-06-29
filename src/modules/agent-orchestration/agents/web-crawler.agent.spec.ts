import { Test, TestingModule } from '@nestjs/testing';
import { WebCrawlerAgent } from './web-crawler.agent';
import { WebScrapingService } from '../../web-scraping/web-scraping.service';
import { AgentContext, AgentType } from '../../../common/interfaces/agent.interface';

describe('WebCrawlerAgent', () => {
  let agent: WebCrawlerAgent;
  let webScrapingService: jest.Mocked<WebScrapingService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebCrawlerAgent,
        {
          provide: WebScrapingService,
          useFactory: () => ({
            scrapeWebsite: jest.fn(),
          }),
        },
      ],
    }).compile();

    agent = module.get<WebCrawlerAgent>(WebCrawlerAgent);
    webScrapingService = module.get(WebScrapingService);
  });

  it('should be defined with correct properties', () => {
    expect(agent).toBeDefined();
    expect(agent.id).toBe('web-crawler-001');
    expect(agent.type).toBe(AgentType.WEB_CRAWLER);
    expect(agent.name).toBe('Web Crawler Agent');
  });

  describe('execute', () => {
    let context: AgentContext;

    beforeEach(() => {
      context = {
        website: 'https://example.com',
        requestId: 'test-request-123',
        timeoutMs: 300000,
        maxPages: 10,
        currentPageCount: 0,
        collectedData: new Map(),
      };
    });

    it('should successfully crawl a website', async () => {
      const mockScrapingResult = {
        success: true,
        pages: [
          {
            url: 'https://example.com',
            title: 'Example Site',
            content: 'Example content',
            html: '<html>...</html>',
            links: ['https://example.com/about'],
            metadata: {
              pageType: 'general',
              contactInfo: {
                emails: ['contact@example.com'],
                phones: [],
                addresses: [],
              },
            },
            scrapedAt: new Date(),
          },
        ],
        errors: [],
        totalPagesScraped: 1,
      };

      webScrapingService.scrapeWebsite.mockResolvedValue(mockScrapingResult as any);

      const result = await agent.execute(context);

      expect(result.success).toBe(true);
      expect(result.agentId).toBe('web-crawler-001');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.data.pagesScraped).toBe(1);
      
      // Check context was updated
      expect(context.collectedData.has('scrapedPages')).toBe(true);
      expect(context.collectedData.has('extractedWebData')).toBe(true);
      expect(context.currentPageCount).toBe(1);
    });

    it('should handle scraping failures', async () => {
      const mockFailureResult = {
        success: false,
        pages: [],
        errors: [
          {
            url: 'https://example.com',
            error: 'Connection refused',
            timestamp: new Date(),
            retryCount: 0,
          },
        ],
        totalPagesScraped: 0,
      };

      webScrapingService.scrapeWebsite.mockResolvedValue(mockFailureResult as any);

      const result = await agent.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to scrape any pages');
      expect(result.confidence).toBe(0);
    });

    it('should validate input context', () => {
      const invalidContext = {
        ...context,
        website: '',
      };

      expect(agent.validateInput(invalidContext)).toBe(false);
    });

    it('should extract key information from scraped pages', async () => {
      const mockScrapingResult = {
        success: true,
        pages: [
          {
            url: 'https://example.com',
            title: 'Home',
            content: 'Content',
            html: '<html>...</html>',
            links: [],
            metadata: {
              pageType: 'general',
              contactInfo: {
                emails: ['test@example.com', 'info@example.com'],
                phones: ['123-456-7890'],
                addresses: ['123 Main St'],
              },
              socialLinks: {
                twitter: 'https://twitter.com/example',
                linkedin: 'https://linkedin.com/company/example',
              },
              structuredData: [
                { '@type': 'Organization', name: 'Example Corp' },
              ],
              personnelInfo: [
                { name: 'John Doe', title: 'CEO' },
              ],
            },
            scrapedAt: new Date(),
          },
          {
            url: 'https://example.com/about',
            title: 'About Us',
            content: 'About content',
            html: '<html>...</html>',
            links: [],
            metadata: {
              pageType: 'about',
            },
            scrapedAt: new Date(),
          },
        ],
        errors: [],
        totalPagesScraped: 2,
      };

      webScrapingService.scrapeWebsite.mockResolvedValue(mockScrapingResult as any);

      const result = await agent.execute(context);

      expect(result.success).toBe(true);
      
      const extractedData = result.data.extractedData;
      expect(extractedData.pageTypes).toEqual({ general: 1, about: 1 });
      expect(extractedData.contactInfo.emails).toHaveLength(2);
      expect(extractedData.contactInfo.phones).toHaveLength(1);
      expect(extractedData.socialLinks).toHaveProperty('twitter');
      expect(extractedData.structuredData).toHaveLength(1);
      expect(extractedData.personnelMentions).toHaveLength(1);
    });
  });

  describe('confidence calculation', () => {
    let context: AgentContext;

    beforeEach(() => {
      context = {
        website: 'https://example.com',
        requestId: 'test-request-123',
        timeoutMs: 300000,
        maxPages: 10,
        currentPageCount: 0,
        collectedData: new Map(),
      };
    });

    it('should calculate higher confidence for more pages and important page types', async () => {
      const mockResult = {
        success: true,
        pages: [
          { metadata: { pageType: 'about' } },
          { metadata: { pageType: 'team' } },
          { metadata: { pageType: 'contact' } },
          { metadata: { pageType: 'general' } },
          { metadata: { pageType: 'general' } },
        ],
        errors: [],
        totalPagesScraped: 5,
      };

      webScrapingService.scrapeWebsite.mockResolvedValue(mockResult as any);

      const result = await agent.execute(context);

      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should reduce confidence for high error rate', async () => {
      const mockResult = {
        success: true,
        pages: [
          { metadata: { pageType: 'general' } },
        ],
        errors: [
          { url: 'error1', error: 'Failed', timestamp: new Date(), retryCount: 0 },
          { url: 'error2', error: 'Failed', timestamp: new Date(), retryCount: 0 },
        ],
        totalPagesScraped: 1,
      };

      webScrapingService.scrapeWebsite.mockResolvedValue(mockResult as any);

      const result = await agent.execute(context);

      expect(result.confidence).toBeLessThan(0.5);
    });
  });
});