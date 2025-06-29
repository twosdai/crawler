import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WebScrapingModule } from '../web-scraping/web-scraping.module';
import { AgentOrchestrationService } from './agent-orchestration.service';
import { WebCrawlerAgent } from './agents/web-crawler.agent';
import { PersonnelResearchAgent } from './agents/personnel-research.agent';
import { BusinessAnalysisAgent } from './agents/business-analysis.agent';
import { NewsResearchAgent } from './agents/news-research.agent';
import { QualityAssuranceAgent } from './agents/quality-assurance.agent';
import { OpenAIService } from './openai.service';

@Module({
  imports: [ConfigModule, WebScrapingModule],
  providers: [
    AgentOrchestrationService,
    OpenAIService,
    WebCrawlerAgent,
    PersonnelResearchAgent,
    BusinessAnalysisAgent,
    NewsResearchAgent,
    QualityAssuranceAgent,
  ],
  exports: [AgentOrchestrationService],
})
export class AgentOrchestrationModule {}