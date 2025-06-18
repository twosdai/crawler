import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { PageMetadata } from './interfaces/scraped-data.interface';

@Injectable()
export class CheerioService {
  private readonly logger = new Logger(CheerioService.name);

  extractTextContent(html: string): string {
    const $ = cheerio.load(html);
    
    // Remove script and style elements
    $('script, style, noscript').remove();
    
    // Get text from body
    const bodyText = $('body').text();
    
    // Clean up whitespace
    return bodyText
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  extractMetadata(html: string): PageMetadata {
    const $ = cheerio.load(html);
    
    const metadata: PageMetadata = {};
    
    // Basic meta tags
    metadata.description = $('meta[name="description"]').attr('content') || 
                          $('meta[property="og:description"]').attr('content');
    
    metadata.author = $('meta[name="author"]').attr('content');
    
    // Keywords
    const keywordsStr = $('meta[name="keywords"]').attr('content');
    if (keywordsStr) {
      metadata.keywords = keywordsStr.split(',').map(k => k.trim()).filter(k => k);
    }
    
    // Open Graph meta tags
    metadata.ogTitle = $('meta[property="og:title"]').attr('content');
    metadata.ogDescription = $('meta[property="og:description"]').attr('content');
    metadata.ogImage = $('meta[property="og:image"]').attr('content');
    
    // Dates
    const publishedDate = $('meta[property="article:published_time"]').attr('content') ||
                         $('meta[name="publish_date"]').attr('content');
    if (publishedDate) {
      metadata.publishedDate = new Date(publishedDate);
    }
    
    const modifiedDate = $('meta[property="article:modified_time"]').attr('content') ||
                        $('meta[name="last_modified"]').attr('content');
    if (modifiedDate) {
      metadata.modifiedDate = new Date(modifiedDate);
    }
    
    return metadata;
  }

  extractStructuredData(html: string): any[] {
    const $ = cheerio.load(html);
    const structuredData = [];
    
    // Extract JSON-LD structured data
    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        const data = JSON.parse($(element).html());
        structuredData.push(data);
      } catch (error) {
        this.logger.warn('Failed to parse structured data');
      }
    });
    
    return structuredData;
  }

  extractContactInfo(html: string): { emails: string[]; phones: string[]; addresses: string[] } {
    const $ = cheerio.load(html);
    const text = $('body').text();
    
    // Email regex
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const emails = [...new Set(text.match(emailRegex) || [])];
    
    // Phone regex (simplified - handles common formats)
    const phoneRegex = /(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const phones = [...new Set(text.match(phoneRegex) || [])];
    
    // Look for address patterns in common containers
    const addresses = [];
    $('.address, .contact-info, [itemtype*="PostalAddress"], address').each((_, element) => {
      const addressText = $(element).text().trim();
      if (addressText.length > 10 && addressText.length < 200) {
        addresses.push(addressText);
      }
    });
    
    return { emails, phones, addresses: [...new Set(addresses)] };
  }

  extractSocialLinks(html: string, baseUrl: string): Record<string, string> {
    const $ = cheerio.load(html);
    const socialPlatforms = {
      facebook: /facebook\.com/i,
      twitter: /twitter\.com|x\.com/i,
      linkedin: /linkedin\.com/i,
      instagram: /instagram\.com/i,
      youtube: /youtube\.com/i,
      github: /github\.com/i,
    };
    
    const socialLinks: Record<string, string> = {};
    
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        for (const [platform, regex] of Object.entries(socialPlatforms)) {
          if (regex.test(href) && !socialLinks[platform]) {
            socialLinks[platform] = href.startsWith('http') ? href : new URL(href, baseUrl).href;
          }
        }
      }
    });
    
    return socialLinks;
  }

  extractPersonnelInfo(html: string): Array<{ name: string; title?: string; department?: string }> {
    const $ = cheerio.load(html);
    const personnel = [];
    
    // Common patterns for team/about pages
    const selectors = [
      '.team-member',
      '.staff-member',
      '.person',
      '.employee',
      '[itemtype*="Person"]',
      '.leadership',
      '.executive',
    ];
    
    selectors.forEach(selector => {
      $(selector).each((_, element) => {
        const $el = $(element);
        const name = $el.find('.name, h3, h4, [itemprop="name"]').first().text().trim() ||
                    $el.find('strong').first().text().trim();
        const title = $el.find('.title, .position, .role, [itemprop="jobTitle"]').first().text().trim();
        const department = $el.find('.department, .team').first().text().trim();
        
        if (name && name.length > 2 && name.length < 100) {
          personnel.push({
            name,
            ...(title && { title }),
            ...(department && { department }),
          });
        }
      });
    });
    
    return personnel;
  }
}