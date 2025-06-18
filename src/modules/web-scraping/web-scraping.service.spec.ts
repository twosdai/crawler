import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WebScrapingService } from './web-scraping.service';
import { PuppeteerService } from './puppeteer.service';
import { CheerioService } from './cheerio.service';
import { UrlExtractorService } from './url-extractor.service';

describe('WebScrapingService', () => {
  let service: WebScrapingService;
  let puppeteerService: jest.Mocked<PuppeteerService>;
  let cheerioService: jest.Mocked<CheerioService>;
  let urlExtractorService: jest.Mocked<UrlExtractorService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebScrapingService,
        {
          provide: PuppeteerService,
          useFactory: () => ({
            initBrowser: jest.fn(),
            scrapePageContent: jest.fn(),
            extractLinks: jest.fn(),
            close: jest.fn(),
          }),
        },
        {
          provide: CheerioService,
          useFactory: () => ({
            extractTextContent: jest.fn(),
            extractMetadata: jest.fn(),
            extractContactInfo: jest.fn(),
            extractSocialLinks: jest.fn(),
            extractStructuredData: jest.fn(),
            extractPersonnelInfo: jest.fn(),
          }),
        },
        {
          provide: UrlExtractorService,
          useFactory: () => ({
            extractImportantUrls: jest.fn(),
            identifyPageType: jest.fn(),
            extractSitemapUrls: jest.fn(),
          }),
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WebScrapingService>(WebScrapingService);
    puppeteerService = module.get(PuppeteerService);
    cheerioService = module.get(CheerioService);
    urlExtractorService = module.get(UrlExtractorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('scrapeWebsite', () => {
    it('should successfully scrape a website', async () => {
      const testUrl = 'https://example.com';
      const mockHtml = '<html><body>Test content</body></html>';
      const mockContent = 'Test content';
      
      puppeteerService.initBrowser.mockResolvedValue(undefined);
      puppeteerService.scrapePageContent.mockResolvedValue({
        html: mockHtml,
        title: 'Test Page',
      });
      puppeteerService.extractLinks.mockResolvedValue(['https://example.com/about']);
      
      cheerioService.extractTextContent.mockReturnValue(mockContent);
      cheerioService.extractMetadata.mockReturnValue({});
      cheerioService.extractContactInfo.mockReturnValue({
        emails: [],
        phones: [],
        addresses: [],
      });
      cheerioService.extractSocialLinks.mockReturnValue({});
      cheerioService.extractStructuredData.mockReturnValue([]);
      cheerioService.extractPersonnelInfo.mockReturnValue([]);
      
      urlExtractorService.extractImportantUrls.mockReturnValue([]);
      urlExtractorService.identifyPageType.mockReturnValue('general');
      
      const result = await service.scrapeWebsite(testUrl, 1);
      
      expect(result.success).toBe(true);
      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].url).toBe(testUrl);
      expect(result.pages[0].title).toBe('Test Page');
      expect(puppeteerService.initBrowser).toHaveBeenCalled();
      expect(puppeteerService.close).toHaveBeenCalled();
    });

    it('should handle scraping errors gracefully', async () => {
      const testUrl = 'https://example.com';
      
      puppeteerService.initBrowser.mockResolvedValue(undefined);
      puppeteerService.scrapePageContent.mockRejectedValue(
        new Error('Page load timeout'),
      );
      
      const result = await service.scrapeWebsite(testUrl, 1);
      
      expect(result.success).toBe(false);
      expect(result.pages).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Page load timeout');
    });
  });

  describe('testScraping', () => {
    it('should return test results for a URL', async () => {
      const testUrl = 'https://example.com';
      const mockHtml = '<html><body>Test</body></html>';
      
      puppeteerService.initBrowser.mockResolvedValue(undefined);
      puppeteerService.scrapePageContent.mockResolvedValue({
        html: mockHtml,
        title: 'Test',
      });
      puppeteerService.extractLinks.mockResolvedValue(['link1', 'link2']);
      
      cheerioService.extractTextContent.mockReturnValue('Test content');
      cheerioService.extractMetadata.mockReturnValue({ description: 'Test site' });
      
      const result = await service.testScraping(testUrl);
      
      expect(result.success).toBe(true);
      expect(result.title).toBe('Test');
      expect(result.contentLength).toBeGreaterThan(0);
      expect(result.linksCount).toBe(2);
    });
  });
});