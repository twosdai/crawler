import { Logger } from '@nestjs/common';
import { 
  BaseAgent as IBaseAgent, 
  AgentContext, 
  AgentResult, 
  AgentType 
} from '../../../common/interfaces/agent.interface';

export abstract class BaseAgent implements IBaseAgent {
  protected readonly logger: Logger;
  
  constructor(
    public readonly id: string,
    public readonly type: AgentType,
    public readonly name: string,
    public readonly description: string,
  ) {
    this.logger = new Logger(`${this.constructor.name}-${this.id}`);
  }

  abstract execute(context: AgentContext): Promise<AgentResult>;

  validateInput(context: AgentContext): boolean {
    if (!context.website || !context.requestId) {
      this.logger.error('Invalid context: missing website or requestId');
      return false;
    }

    if (context.timeoutMs <= 0 || context.maxPages <= 0) {
      this.logger.error('Invalid context: timeout or maxPages must be positive');
      return false;
    }

    return true;
  }

  protected createResult(
    success: boolean,
    data?: any,
    error?: string,
    confidence: number = 0,
    processingTime: number = 0,
  ): AgentResult {
    return {
      agentId: this.id,
      success,
      data,
      error,
      confidence,
      processingTime,
    };
  }

  protected async measureExecutionTime<T>(
    operation: () => Promise<T>,
  ): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    const result = await operation();
    const duration = Date.now() - startTime;
    return { result, duration };
  }

  protected calculateConfidence(dataPoints: Record<string, any>): number {
    const weights = {
      hasBusinessName: 0.1,
      hasIndustry: 0.1,
      hasDescription: 0.1,
      hasPersonnel: 0.15,
      hasContactInfo: 0.1,
      hasMarketStrategy: 0.15,
      hasNews: 0.1,
      hasProducts: 0.1,
      hasStructuredData: 0.1,
    };

    let score = 0;
    for (const [key, weight] of Object.entries(weights)) {
      if (dataPoints[key]) {
        score += weight;
      }
    }

    return Math.min(score, 1);
  }
}