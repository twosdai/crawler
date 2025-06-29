export interface ScrapedPage {
  url: string;
  title: string;
  content: string;
  html: string;
  links: string[];
  metadata: PageMetadata;
  scrapedAt: Date;
}

export interface PageMetadata {
  description?: string;
  keywords?: string[];
  author?: string;
  publishedDate?: Date;
  modifiedDate?: Date;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

export interface ScrapingResult {
  success: boolean;
  pages: ScrapedPage[];
  errors: ScrapingError[];
  totalPagesScraped: number;
}

export interface ScrapingError {
  url: string;
  error: string;
  timestamp: Date;
  retryCount: number;
}