import { Injectable, Logger } from '@nestjs/common';
import { CompletionReason } from '../../common/interfaces/business-report.interface';

@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);

  /**
   * Evaluates if we have sufficient data to generate a comprehensive report
   */
  evaluateDataSufficiency(collectedData: Map<string, any>): {
    isSufficient: boolean;
    completionReason: CompletionReason;
    confidence: number;
    missingElements: string[];
  } {
    const requiredElements = [
      'businessOverview',
      'keyPersonnel',
      'marketStrategy',
      'scrapedPages',
    ];

    const missingElements = requiredElements.filter(
      element => !collectedData.has(element) || !collectedData.get(element)
    );

    const hasMinimumData = missingElements.length === 0;
    const scrapedPages = collectedData.get('scrapedPages') || [];
    const hasEnoughPages = scrapedPages.length >= 3;

    // Calculate confidence based on data quality
    let confidence = 0;
    if (collectedData.has('businessOverview')) confidence += 0.25;
    if (collectedData.has('keyPersonnel')) confidence += 0.25;
    if (collectedData.has('marketStrategy')) confidence += 0.25;
    if (collectedData.has('currentStatus')) confidence += 0.15;
    if (hasEnoughPages) confidence += 0.1;

    let completionReason: CompletionReason = 'insufficient_sources';
    
    if (hasMinimumData && confidence >= 0.7) {
      completionReason = 'sufficient_data';
    } else if (hasMinimumData && confidence >= 0.5) {
      completionReason = 'sufficient_data';
    } else if (scrapedPages.length === 0) {
      completionReason = 'insufficient_sources';
    }

    return {
      isSufficient: hasMinimumData && confidence >= 0.5,
      completionReason,
      confidence: Math.round(confidence * 100) / 100,
      missingElements,
    };
  }

  /**
   * Evaluates the quality of a specific data component
   */
  evaluateComponentQuality(component: any, componentType: string): number {
    switch (componentType) {
      case 'businessOverview':
        return this.evaluateBusinessOverview(component);
      case 'keyPersonnel':
        return this.evaluateKeyPersonnel(component);
      case 'marketStrategy':
        return this.evaluateMarketStrategy(component);
      case 'currentStatus':
        return this.evaluateCurrentStatus(component);
      default:
        return 0.5;
    }
  }

  private evaluateBusinessOverview(data: any): number {
    let score = 0;
    if (data?.name && data.name !== 'Unknown') score += 0.2;
    if (data?.industry && data.industry !== 'Not specified') score += 0.2;
    if (data?.description && data.description !== 'No description available') score += 0.2;
    if (data?.operations?.length > 0) score += 0.2;
    if (data?.headquarters || data?.foundedYear) score += 0.2;
    return score;
  }

  private evaluateKeyPersonnel(data: any): number {
    let score = 0;
    const totalPersonnel = 
      (data?.owners?.length || 0) + 
      (data?.executives?.length || 0) + 
      (data?.decisionMakers?.length || 0);
    
    if (totalPersonnel > 0) score += 0.4;
    if (data?.owners?.length > 0) score += 0.3;
    if (data?.executives?.length > 0) score += 0.2;
    if (totalPersonnel >= 5) score += 0.1;
    
    return Math.min(score, 1);
  }

  private evaluateMarketStrategy(data: any): number {
    let score = 0;
    if (data?.targetMarket && data.targetMarket !== 'Not specified') score += 0.25;
    if (data?.goToMarketStrategy && data.goToMarketStrategy !== 'Not specified') score += 0.25;
    if (data?.marketingChannels?.length > 0) score += 0.25;
    if (data?.valueProposition) score += 0.25;
    return score;
  }

  private evaluateCurrentStatus(data: any): number {
    let score = 0;
    if (data?.recentNews?.length > 0) score += 0.3;
    if (data?.challenges?.length > 0) score += 0.25;
    if (data?.opportunities?.length > 0) score += 0.25;
    if (data?.trends?.length > 0) score += 0.2;
    return score;
  }

  /**
   * Determines if analysis should continue or stop
   */
  shouldContinueAnalysis(
    context: any,
    elapsedTime: number,
    pagesAnalyzed: number,
  ): boolean {
    // Check timeout
    if (elapsedTime >= context.timeoutMs * 0.9) {
      this.logger.warn('Approaching timeout, stopping analysis');
      return false;
    }

    // Check page limit
    if (pagesAnalyzed >= context.maxPages) {
      this.logger.log('Reached maximum page limit');
      return false;
    }

    // Check data sufficiency
    const evaluation = this.evaluateDataSufficiency(context.collectedData);
    if (evaluation.isSufficient && evaluation.confidence >= 0.8) {
      this.logger.log('Sufficient data collected with high confidence');
      return false;
    }

    return true;
  }
}