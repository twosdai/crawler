import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WebScrapingService } from './web-scraping.service';
import { PuppeteerService } from './puppeteer.service';
import { CheerioService } from './cheerio.service';
import { UrlExtractorService } from './url-extractor.service';

@Module({
  imports: [ConfigModule],
  providers: [
    WebScrapingService,
    PuppeteerService,
    CheerioService,
    UrlExtractorService,
  ],
  exports: [WebScrapingService],
})
export class WebScrapingModule {}