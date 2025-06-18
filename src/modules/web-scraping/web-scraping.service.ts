import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PuppeteerService } from './puppeteer.service';
import { CheerioService } from './cheerio.service';
import { UrlExtractorService } from './url-extractor.service';
import { ScrapedPage, ScrapingResult, ScrapingError } from './interfaces/scraped-data.interface';
import axios from 'axios';

@Injectable()
export class WebScrapingService {
  private readonly logger = new Logger(WebScrapingService.name);
  
  constructor(
    private puppeteerService: PuppeteerService,
    private cheerioService: CheerioService,
    private urlExtractorService: UrlExtractorService,
    private configService: ConfigService,
  ) {}

  async scrapeWebsite(
    websiteUrl: string,
    maxPages: number = 10,
  ): Promise<ScrapingResult> {
    const scrapedPages: ScrapedPage[] = [];
    const errors: ScrapingError[] = [];
    const visitedUrls = new Set<string>();
    const urlsToVisit: string[] = [websiteUrl];
    
    try {
      // Initialize browser
      await this.puppeteerService.initBrowser();
      
      // Check robots.txt
      const robotsUrl = new URL('/robots.txt', websiteUrl).href;
      try {
        const robotsResponse = await axios.get(robotsUrl, { timeout: 5000 });
        const sitemapUrls = this.urlExtractorService.extractSitemapUrls(
          robotsResponse.data,
          websiteUrl
        );
        // Add sitemap URLs to visit queue
        urlsToVisit.push(...sitemapUrls);
      } catch (error) {
        this.logger.debug(`Could not fetch robots.txt: ${error.message}`);
      }
      
      // Start scraping
      while (urlsToVisit.length > 0 && scrapedPages.length < maxPages) {
        const currentUrl = urlsToVisit.shift();
        
        if (!currentUrl || visitedUrls.has(currentUrl)) {
          continue;
        }
        
        visitedUrls.add(currentUrl);
        
        try {
          const scrapedPage = await this.scrapePage(currentUrl, websiteUrl);
          scrapedPages.push(scrapedPage);
          
          // Extract new URLs to visit
          const importantUrls = this.urlExtractorService.extractImportantUrls(
            scrapedPage.html,
            websiteUrl,
            currentUrl
          );
          
          // Add new URLs to the queue
          for (const url of importantUrls) {
            if (!visitedUrls.has(url) && urlsToVisit.length < maxPages * 2) {
              urlsToVisit.push(url);
            }
          }
          
          // Small delay to avoid rate limiting
          await this.delay(500);
          
        } catch (error) {
          errors.push({
            url: currentUrl,
            error: error.message,
            timestamp: new Date(),
            retryCount: 0,
          });
          this.logger.error(`Error scraping ${currentUrl}: ${error.message}`);
        }
      }
      
    } catch (error) {
      this.logger.error(`Fatal error during scraping: ${error.message}`);
      throw error;
    } finally {
      // Clean up
      await this.puppeteerService.close();
    }
    
    return {
      success: scrapedPages.length > 0,
      pages: scrapedPages,
      errors,
      totalPagesScraped: scrapedPages.length,
    };
  }

  private async scrapePage(url: string, baseUrl: string): Promise<ScrapedPage> {
    this.logger.debug(`Scraping page: ${url}`);
    
    // Use Puppeteer to get the rendered HTML
    const { html, title } = await this.puppeteerService.scrapePageContent(url);
    
    // Extract content and metadata using Cheerio
    const content = this.cheerioService.extractTextContent(html);
    const metadata = this.cheerioService.extractMetadata(html);
    const contactInfo = this.cheerioService.extractContactInfo(html);
    const socialLinks = this.cheerioService.extractSocialLinks(html, baseUrl);
    const structuredData = this.cheerioService.extractStructuredData(html);
    const personnelInfo = this.cheerioService.extractPersonnelInfo(html);
    
    // Extract links
    const links = await this.puppeteerService.extractLinks(url);
    
    // Identify page type
    const pageType = this.urlExtractorService.identifyPageType(url, html);
    
    return {
      url,
      title,
      content,
      html,
      links,
      metadata: {
        ...metadata,
        pageType,
        contactInfo,
        socialLinks,
        structuredData,
        personnelInfo,
      } as any,
      scrapedAt: new Date(),
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testScraping(url: string): Promise<any> {
    try {
      await this.puppeteerService.initBrowser();
      const result = await this.scrapePage(url, url);
      await this.puppeteerService.close();
      return {
        success: true,
        title: result.title,
        contentLength: result.content.length,
        linksCount: result.links.length,
        metadata: result.metadata,
      };
    } catch (error) {
      await this.puppeteerService.close();
      return {
        success: false,
        error: error.message,
      };
    }
  }
}