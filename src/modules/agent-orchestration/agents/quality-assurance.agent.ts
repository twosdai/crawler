import { Injectable } from '@nestjs/common';
import { BaseAgent } from './base.agent';
import { AgentContext, AgentResult, AgentType } from '../../../common/interfaces/agent.interface';
import { OpenAIService } from '../openai.service';
import { CompletionReason } from '../../../common/interfaces/business-report.interface';

@Injectable()
export class QualityAssuranceAgent extends BaseAgent {
  constructor(private openAIService: OpenAIService) {
    super(
      'quality-assurance-001',
      AgentType.QUALITY_ASSURANCE,
      'Quality Assurance Agent',
      'Evaluates data completeness and determines when to generate report',
    );
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      if (!this.validateInput(context)) {
        return this.createResult(false, null, 'Invalid input context');
      }

      this.logger.log(`Starting quality assessment for ${context.website}`);

      const { result, duration } = await this.measureExecutionTime(async () => {
        return await this.assessDataQuality(context);
      });

      // Store quality assessment in context
      context.collectedData.set('qualityAssessment', result);

      this.logger.log(`Quality assessment complete: ${result.completionReason} (${result.overallScore})`);

      return this.createResult(
        true,
        result,
        undefined,
        result.overallScore,
        duration,
      );
    } catch (error) {
      this.logger.error(`Quality assessment failed: ${error.message}`);
      return this.createResult(false, null, error.message, 0, 0);
    }
  }

  private async assessDataQuality(context: AgentContext): Promise<{
    overallScore: number;
    completionReason: CompletionReason;
    missingData: string[];
    recommendations: string[];
    dataCompleteness: Record<string, boolean>;
  }> {
    // Collect all data from context
    const collectedData = {
      scrapedPages: context.collectedData.get('scrapedPages'),
      businessOverview: context.collectedData.get('businessOverview'),
      keyPersonnel: context.collectedData.get('keyPersonnel'),
      marketStrategy: context.collectedData.get('marketStrategy'),
      currentStatus: context.collectedData.get('currentStatus'),
    };

    // Check data completeness
    const dataCompleteness = this.checkDataCompleteness(collectedData);

    // Define quality criteria
    const qualityCriteria = [
      'Has business name and industry classification',
      'Has clear business description and operations',
      'Has identified key personnel (owners, executives, or decision makers)',
      'Has contact information (email, phone, or address)',
      'Has identified target market and GTM strategy',
      'Has marketing channels and value proposition',
      'Has recent news or developments',
      'Has identified challenges and opportunities',
      'Has sufficient website coverage (multiple pages analyzed)',
      'Has high confidence scores from individual agents',
    ];

    // Use OpenAI to evaluate quality
    const evaluation = await this.openAIService.evaluateDataQuality(
      collectedData,
      qualityCriteria,
    );

    // Determine completion reason
    const completionReason = this.determineCompletionReason(
      evaluation.score,
      context,
      dataCompleteness,
    );

    // Calculate overall score
    const overallScore = this.calculateOverallScore(
      evaluation.score,
      dataCompleteness,
      context,
    );

    return {
      overallScore,
      completionReason,
      missingData: evaluation.missing || [],
      recommendations: evaluation.recommendations || [],
      dataCompleteness,
    };
  }

  private checkDataCompleteness(data: any): Record<string, boolean> {
    return {
      hasBusinessName: !!data.businessOverview?.name && data.businessOverview.name !== 'Unknown',
      hasIndustry: !!data.businessOverview?.industry && data.businessOverview.industry !== 'Not specified',
      hasDescription: !!data.businessOverview?.description && data.businessOverview.description !== 'No description available',
      hasOperations: data.businessOverview?.operations?.length > 0,
      hasPersonnel: (data.keyPersonnel?.totalPersonnel || 0) > 0,
      hasOwners: data.keyPersonnel?.owners?.length > 0,
      hasExecutives: data.keyPersonnel?.executives?.length > 0,
      hasContactInfo: (
        data.scrapedPages?.[0]?.metadata?.contactInfo?.emails?.length > 0 ||
        data.scrapedPages?.[0]?.metadata?.contactInfo?.phones?.length > 0
      ),
      hasTargetMarket: !!data.marketStrategy?.targetMarket && data.marketStrategy.targetMarket !== 'Not specified',
      hasGTMStrategy: !!data.marketStrategy?.goToMarketStrategy && data.marketStrategy.goToMarketStrategy !== 'Not specified',
      hasMarketingChannels: data.marketStrategy?.marketingChannels?.length > 0,
      hasValueProposition: !!data.marketStrategy?.valueProposition,
      hasNews: data.currentStatus?.recentNews?.length > 0,
      hasChallenges: data.currentStatus?.challenges?.length > 0,
      hasOpportunities: data.currentStatus?.opportunities?.length > 0,
      hasSufficientPages: (data.scrapedPages?.length || 0) >= 3,
    };
  }

  private determineCompletionReason(
    aiScore: number,
    context: AgentContext,
    dataCompleteness: Record<string, boolean>,
  ): CompletionReason {
    // Check if timeout is approaching
    const elapsedTime = Date.now() - context.collectedData.get('startTime');
    const timeoutApproaching = elapsedTime > context.timeoutMs * 0.9;

    if (timeoutApproaching) {
      return 'timeout';
    }

    // Check minimum data requirements
    const criticalData = [
      dataCompleteness.hasBusinessName,
      dataCompleteness.hasIndustry,
      dataCompleteness.hasDescription,
      dataCompleteness.hasSufficientPages,
    ];

    const hasCriticalData = criticalData.every(v => v);

    if (!hasCriticalData) {
      return 'insufficient_sources';
    }

    // If AI score is high enough and we have critical data
    if (aiScore >= 0.7) {
      return 'sufficient_data';
    }

    // If we've scraped maximum pages but still don't have enough data
    if (context.currentPageCount >= context.maxPages) {
      return aiScore >= 0.5 ? 'sufficient_data' : 'insufficient_sources';
    }

    return 'insufficient_sources';
  }

  private calculateOverallScore(
    aiScore: number,
    dataCompleteness: Record<string, boolean>,
    context: AgentContext,
  ): number {
    // Calculate completeness percentage
    const completenessValues = Object.values(dataCompleteness);
    const completenessScore = completenessValues.filter(v => v).length / completenessValues.length;

    // Get average agent confidence
    const agentResults = context.collectedData.get('agentResults') || [];
    const avgAgentConfidence = agentResults.length > 0
      ? agentResults.reduce((sum, r) => sum + (r.confidence || 0), 0) / agentResults.length
      : 0.5;

    // Weighted average
    const weights = {
      aiScore: 0.4,
      completeness: 0.3,
      agentConfidence: 0.3,
    };

    const overallScore = 
      (aiScore * weights.aiScore) +
      (completenessScore * weights.completeness) +
      (avgAgentConfidence * weights.agentConfidence);

    return Math.round(overallScore * 100) / 100; // Round to 2 decimals
  }
}