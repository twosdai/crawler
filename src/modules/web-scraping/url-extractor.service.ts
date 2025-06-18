import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';

@Injectable()
export class UrlExtractorService {
  private readonly logger = new Logger(UrlExtractorService.name);
  
  private readonly importantPatterns = [
    /about/i,
    /team/i,
    /leadership/i,
    /executives/i,
    /management/i,
    /contact/i,
    /news/i,
    /press/i,
    /blog/i,
    /products/i,
    /services/i,
    /solutions/i,
    /careers/i,
    /investors/i,
    /partners/i,
  ];

  extractImportantUrls(html: string, baseUrl: string, currentUrl: string): string[] {
    const $ = cheerio.load(html);
    const urls = new Set<string>();
    const baseDomain = new URL(baseUrl).hostname;

    // Extract all links
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (!href) return;

      try {
        // Resolve relative URLs
        const absoluteUrl = new URL(href, currentUrl);
        
        // Only include URLs from the same domain
        if (absoluteUrl.hostname !== baseDomain) return;
        
        // Skip anchors, mailto, tel, etc.
        if (absoluteUrl.protocol !== 'http:' && absoluteUrl.protocol !== 'https:') return;
        
        // Normalize URL (remove hash, trailing slash)
        absoluteUrl.hash = '';
        const normalizedUrl = absoluteUrl.href.replace(/\/$/, '');
        
        urls.add(normalizedUrl);
      } catch (error) {
        // Invalid URL, skip
      }
    });

    // Filter and prioritize important URLs
    const urlArray = Array.from(urls);
    const importantUrls = this.prioritizeUrls(urlArray, baseUrl);
    
    return importantUrls;
  }

  private prioritizeUrls(urls: string[], baseUrl: string): string[] {
    const scored = urls.map(url => {
      let score = 0;
      const urlLower = url.toLowerCase();
      
      // Check against important patterns
      this.importantPatterns.forEach(pattern => {
        if (pattern.test(urlLower)) {
          score += 10;
        }
      });
      
      // Prefer shorter URLs (likely main pages)
      const depth = url.split('/').length - 3; // Subtract protocol and domain
      score -= depth;
      
      // Deprioritize certain patterns
      if (/\.(pdf|doc|docx|xls|xlsx|zip|jpg|jpeg|png|gif)$/i.test(url)) {
        score -= 20;
      }
      
      if (/privacy|terms|cookie|legal|disclaimer/i.test(url)) {
        score -= 15;
      }
      
      return { url, score };
    });
    
    // Sort by score and return top URLs
    return scored
      .sort((a, b) => b.score - a.score)
      .map(item => item.url);
  }

  identifyPageType(url: string, html: string): string {
    const urlLower = url.toLowerCase();
    const $ = cheerio.load(html);
    const title = $('title').text().toLowerCase();
    const h1 = $('h1').first().text().toLowerCase();
    
    // Check URL patterns
    if (/about|who-we-are|company/i.test(url)) return 'about';
    if (/team|leadership|executives|management|people/i.test(url)) return 'team';
    if (/contact|get-in-touch/i.test(url)) return 'contact';
    if (/news|press|blog|insights|articles/i.test(url)) return 'news';
    if (/products|services|solutions|offerings/i.test(url)) return 'products';
    if (/careers|jobs|work-with-us/i.test(url)) return 'careers';
    
    // Check page content
    if (/about|who we are|our story|company/i.test(title + h1)) return 'about';
    if (/team|meet.*team|leadership|our people/i.test(title + h1)) return 'team';
    if (/contact|get in touch|reach us/i.test(title + h1)) return 'contact';
    if (/news|blog|insights|latest/i.test(title + h1)) return 'news';
    
    return 'general';
  }

  extractSitemapUrls(robotsTxt: string, baseUrl: string): string[] {
    const sitemapUrls = [];
    const lines = robotsTxt.split('\n');
    
    lines.forEach(line => {
      const match = line.match(/^Sitemap:\s*(.+)$/i);
      if (match) {
        const sitemapUrl = match[1].trim();
        try {
          const absoluteUrl = new URL(sitemapUrl, baseUrl);
          sitemapUrls.push(absoluteUrl.href);
        } catch (error) {
          // Invalid URL
        }
      }
    });
    
    return sitemapUrls;
  }
}