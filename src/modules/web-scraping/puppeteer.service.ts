import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as puppeteer from 'puppeteer';

@Injectable()
export class PuppeteerService {
  private readonly logger = new Logger(PuppeteerService.name);
  private browser: puppeteer.Browser;

  constructor(private configService: ConfigService) {}

  async initBrowser(): Promise<void> {
    if (this.browser) {
      return;
    }

    try {
      const puppeteerConfig = this.configService.get('app.puppeteer');
      
      this.browser = await puppeteer.launch({
        headless: puppeteerConfig.headless,
        args: puppeteerConfig.args,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      });

      this.logger.log('Puppeteer browser initialized');
    } catch (error) {
      this.logger.error(`Failed to initialize browser: ${error.message}`);
      throw error;
    }
  }

  async scrapePageContent(url: string, waitForSelector?: string): Promise<{ html: string; title: string }> {
    if (!this.browser) {
      await this.initBrowser();
    }

    const page = await this.browser.newPage();
    
    try {
      const puppeteerConfig = this.configService.get('app.puppeteer');
      
      // Set user agent
      await page.setUserAgent(puppeteerConfig.userAgent);
      
      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Navigate to the page
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: puppeteerConfig.timeoutMs,
      });

      // Wait for specific selector if provided
      if (waitForSelector) {
        await page.waitForSelector(waitForSelector, {
          timeout: 5000,
        }).catch(() => {
          this.logger.warn(`Selector ${waitForSelector} not found on ${url}`);
        });
      }

      // Get page content
      const html = await page.content();
      const title = await page.title();

      return { html, title };
    } catch (error) {
      this.logger.error(`Error scraping ${url}: ${error.message}`);
      throw error;
    } finally {
      await page.close();
    }
  }

  async extractLinks(url: string): Promise<string[]> {
    if (!this.browser) {
      await this.initBrowser();
    }

    const page = await this.browser.newPage();
    
    try {
      const puppeteerConfig = this.configService.get('app.puppeteer');
      
      await page.setUserAgent(puppeteerConfig.userAgent);
      
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: puppeteerConfig.timeoutMs,
      });

      // Extract all links
      const links = await page.evaluate(() => {
        const anchors = document.querySelectorAll('a[href]');
        return Array.from(anchors)
          .map(anchor => (anchor as HTMLAnchorElement).href)
          .filter(href => href && !href.startsWith('#') && !href.startsWith('javascript:'));
      });

      return links;
    } catch (error) {
      this.logger.error(`Error extracting links from ${url}: ${error.message}`);
      return [];
    } finally {
      await page.close();
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.logger.log('Puppeteer browser closed');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }
}