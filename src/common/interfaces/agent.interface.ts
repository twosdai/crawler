export interface AgentMessage {
  agentId: string;
  type: 'request' | 'response' | 'error' | 'status';
  content: any;
  timestamp: Date;
  correlationId?: string;
}

export interface AgentContext {
  website: string;
  requestId: string;
  timeoutMs: number;
  maxPages: number;
  currentPageCount: number;
  collectedData: Map<string, any>;
}

export interface AgentResult {
  agentId: string;
  success: boolean;
  data?: any;
  error?: string;
  confidence: number;
  processingTime: number;
}

export enum AgentType {
  WEB_CRAWLER = 'web_crawler',
  PERSONNEL_RESEARCH = 'personnel_research',
  BUSINESS_ANALYSIS = 'business_analysis',
  NEWS_RESEARCH = 'news_research',
  QUALITY_ASSURANCE = 'quality_assurance'
}

export interface BaseAgent {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  execute(context: AgentContext): Promise<AgentResult>;
  validateInput(context: AgentContext): boolean;
}