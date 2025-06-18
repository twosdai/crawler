export interface Person {
  name: string;
  title?: string;
  role?: string;
  linkedInUrl?: string;
  email?: string;
  phone?: string;
}

export interface NewsItem {
  title: string;
  date: Date;
  source: string;
  url?: string;
  summary: string;
  relevance: 'high' | 'medium' | 'low';
}

export interface BusinessOverview {
  name: string;
  industry: string;
  description: string;
  operations: string[];
  foundedYear?: number;
  headquarters?: string;
  employeeCount?: string;
}

export interface KeyPersonnel {
  owners: Person[];
  executives: Person[];
  decisionMakers: Person[];
}

export interface MarketStrategy {
  targetMarket: string;
  goToMarketStrategy: string;
  marketingChannels: string[];
  competitiveAdvantages?: string[];
  valueProposition?: string;
}

export interface CurrentStatus {
  recentNews: NewsItem[];
  challenges: string[];
  opportunities: string[];
  trends?: string[];
}

export type CompletionReason = 'sufficient_data' | 'timeout' | 'insufficient_sources';

export interface BusinessReport {
  website: string;
  businessOverview: BusinessOverview;
  keyPersonnel: KeyPersonnel;
  marketStrategy: MarketStrategy;
  currentStatus: CurrentStatus;
  dataConfidence: number; // 0-1 scale
  completionReason: CompletionReason;
  analysisTimestamp: Date;
  sourceCount: number;
}

export interface BusinessReportMetadata {
  requestId: string;
  startTime: Date;
  endTime: Date;
  totalPagesAnalyzed: number;
  errors: string[];
  warnings: string[];
}