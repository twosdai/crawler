import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentContext, AgentResult } from '../../common/interfaces/agent.interface';
import { BusinessReport, BusinessReportMetadata } from '../../common/interfaces/business-report.interface';
import { WebCrawlerAgent } from './agents/web-crawler.agent';
import { PersonnelResearchAgent } from './agents/personnel-research.agent';
import { BusinessAnalysisAgent } from './agents/business-analysis.agent';
import { NewsResearchAgent } from './agents/news-research.agent';
import { QualityAssuranceAgent } from './agents/quality-assurance.agent';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AgentOrchestrationService {
  private readonly logger = new Logger(AgentOrchestrationService.name);

  constructor(
    private configService: ConfigService,
    private webCrawlerAgent: WebCrawlerAgent,
    private personnelResearchAgent: PersonnelResearchAgent,
    private businessAnalysisAgent: BusinessAnalysisAgent,
    private newsResearchAgent: NewsResearchAgent,
    private qualityAssuranceAgent: QualityAssuranceAgent,
  ) {}

  async analyzeBusinessWebsite(
    website: string,
    maxPages?: number,
    timeoutMinutes?: number,
  ): Promise<{ report: BusinessReport; metadata: BusinessReportMetadata }> {
    const requestId = uuidv4();
    const startTime = new Date();
    
    const analysisConfig = this.configService.get('app.analysis');
    const timeoutMs = (timeoutMinutes || analysisConfig.timeoutMinutes) * 60 * 1000;
    const maxPagesToAnalyze = maxPages || analysisConfig.maxPagesPerAnalysis;

    this.logger.log(`Starting business analysis for ${website} (Request: ${requestId})`);

    // Initialize agent context
    const context: AgentContext = {
      website,
      requestId,
      timeoutMs,
      maxPages: maxPagesToAnalyze,
      currentPageCount: 0,
      collectedData: new Map(),
    };

    // Store start time in context
    context.collectedData.set('startTime', Date.now());

    const errors: string[] = [];
    const warnings: string[] = [];
    const agentResults: AgentResult[] = [];

    try {
      // Phase 1: Web Crawling
      this.logger.log('Phase 1: Web Crawling');
      const crawlerResult = await this.executeAgent(
        this.webCrawlerAgent,
        context,
        'Web crawling',
      );
      agentResults.push(crawlerResult);

      if (!crawlerResult.success) {
        throw new Error(`Web crawling failed: ${crawlerResult.error}`);
      }

      // Phase 2: Parallel Agent Execution
      this.logger.log('Phase 2: Running analysis agents in parallel');
      const [personnelResult, businessResult, newsResult] = await Promise.all([
        this.executeAgent(this.personnelResearchAgent, context, 'Personnel research'),
        this.executeAgent(this.businessAnalysisAgent, context, 'Business analysis'),
        this.executeAgent(this.newsResearchAgent, context, 'News research'),
      ]);

      agentResults.push(personnelResult, businessResult, newsResult);

      // Store agent results for quality assessment
      context.collectedData.set('agentResults', agentResults);

      // Phase 3: Quality Assessment
      this.logger.log('Phase 3: Quality Assessment');
      const qaResult = await this.executeAgent(
        this.qualityAssuranceAgent,
        context,
        'Quality assessment',
      );
      agentResults.push(qaResult);

      // Collect any warnings
      agentResults.forEach(result => {
        if (!result.success && result.error) {
          warnings.push(result.error);
        }
      });

      // Generate final report
      const report = this.compileBusinessReport(context, qaResult);
      
      const endTime = new Date();
      const metadata: BusinessReportMetadata = {
        requestId,
        startTime,
        endTime,
        totalPagesAnalyzed: context.currentPageCount,
        errors,
        warnings,
      };

      this.logger.log(`Analysis complete for ${website} in ${endTime.getTime() - startTime.getTime()}ms`);

      return { report, metadata };

    } catch (error) {
      this.logger.error(`Analysis failed for ${website}: ${error.message}`);
      errors.push(error.message);
      
      // Return partial report with error
      const endTime = new Date();
      const report = this.compilePartialReport(context, error.message);
      const metadata: BusinessReportMetadata = {
        requestId,
        startTime,
        endTime,
        totalPagesAnalyzed: context.currentPageCount,
        errors,
        warnings,
      };

      return { report, metadata };
    }
  }

  private async executeAgent(
    agent: any,
    context: AgentContext,
    phaseName: string,
  ): Promise<AgentResult> {
    try {
      this.logger.debug(`Executing ${phaseName}`);
      const result = await agent.execute(context);
      
      if (result.success) {
        this.logger.debug(`${phaseName} completed successfully (confidence: ${result.confidence})`);
      } else {
        this.logger.warn(`${phaseName} failed: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`${phaseName} threw error: ${error.message}`);
      return {
        agentId: agent.id,
        success: false,
        error: error.message,
        confidence: 0,
        processingTime: 0,
      };
    }
  }

  private compileBusinessReport(context: AgentContext, qaResult: AgentResult): BusinessReport {
    const businessOverview = context.collectedData.get('businessOverview') || {
      name: 'Unknown',
      industry: 'Not specified',
      description: 'No description available',
      operations: [],
    };

    const keyPersonnel = context.collectedData.get('keyPersonnel') || {
      owners: [],
      executives: [],
      decisionMakers: [],
    };

    const marketStrategy = context.collectedData.get('marketStrategy') || {
      targetMarket: 'Not specified',
      goToMarketStrategy: 'Not specified',
      marketingChannels: [],
    };

    const currentStatus = context.collectedData.get('currentStatus') || {
      recentNews: [],
      challenges: [],
      opportunities: [],
    };

    const qualityAssessment = context.collectedData.get('qualityAssessment') || {
      overallScore: 0,
      completionReason: 'insufficient_sources',
    };

    return {
      website: context.website,
      businessOverview,
      keyPersonnel,
      marketStrategy,
      currentStatus,
      dataConfidence: qualityAssessment.overallScore,
      completionReason: qualityAssessment.completionReason,
      analysisTimestamp: new Date(),
      sourceCount: context.currentPageCount,
    };
  }

  private compilePartialReport(context: AgentContext, error: string): BusinessReport {
    // Similar to compileBusinessReport but with defaults and error handling
    return this.compileBusinessReport(context, {
      agentId: 'qa',
      success: false,
      error,
      confidence: 0,
      processingTime: 0,
    });
  }
}