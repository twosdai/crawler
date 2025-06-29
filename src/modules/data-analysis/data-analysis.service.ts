import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DataAnalysisService {
  private readonly logger = new Logger(DataAnalysisService.name);

  /**
   * Analyzes scraped data to extract patterns and insights
   */
  analyzeScrapedData(pages: any[]): any {
    const analysis = {
      totalPages: pages.length,
      pageTypes: this.analyzePageTypes(pages),
      contentPatterns: this.analyzeContentPatterns(pages),
      dataCompleteness: this.assessDataCompleteness(pages),
    };

    return analysis;
  }

  private analyzePageTypes(pages: any[]): Record<string, number> {
    const pageTypes: Record<string, number> = {};
    
    pages.forEach(page => {
      const type = page.metadata?.pageType || 'unknown';
      pageTypes[type] = (pageTypes[type] || 0) + 1;
    });

    return pageTypes;
  }

  private analyzeContentPatterns(pages: any[]): any {
    const patterns = {
      hasContactInfo: false,
      hasSocialLinks: false,
      hasStructuredData: false,
      hasPersonnelInfo: false,
      averageContentLength: 0,
    };

    let totalContentLength = 0;

    pages.forEach(page => {
      if (page.metadata?.contactInfo?.emails?.length > 0) {
        patterns.hasContactInfo = true;
      }
      if (page.metadata?.socialLinks && Object.keys(page.metadata.socialLinks).length > 0) {
        patterns.hasSocialLinks = true;
      }
      if (page.metadata?.structuredData?.length > 0) {
        patterns.hasStructuredData = true;
      }
      if (page.metadata?.personnelInfo?.length > 0) {
        patterns.hasPersonnelInfo = true;
      }
      totalContentLength += page.content?.length || 0;
    });

    patterns.averageContentLength = Math.round(totalContentLength / pages.length);

    return patterns;
  }

  private assessDataCompleteness(pages: any[]): number {
    const requiredPageTypes = ['about', 'contact', 'products', 'team'];
    const foundPageTypes = new Set(pages.map(p => p.metadata?.pageType).filter(Boolean));
    
    const foundRequired = requiredPageTypes.filter(type => foundPageTypes.has(type));
    const completeness = foundRequired.length / requiredPageTypes.length;

    return Math.round(completeness * 100);
  }

  /**
   * Merges data from multiple sources for comprehensive analysis
   */
  mergeAnalysisData(sources: Record<string, any>): any {
    const merged = {
      timestamp: new Date(),
      sources: Object.keys(sources),
      data: {},
    };

    // Merge all source data
    Object.entries(sources).forEach(([key, value]) => {
      merged.data[key] = value;
    });

    return merged;
  }
}