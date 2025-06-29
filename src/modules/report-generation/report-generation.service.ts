import { Injectable, Logger } from '@nestjs/common';
import { BusinessReport, BusinessReportMetadata } from '../../common/interfaces/business-report.interface';

@Injectable()
export class ReportGenerationService {
  private readonly logger = new Logger(ReportGenerationService.name);

  formatReport(report: BusinessReport): any {
    return {
      website: report.website,
      analysisDate: report.analysisTimestamp,
      confidence: `${Math.round(report.dataConfidence * 100)}%`,
      completionStatus: report.completionReason.replace('_', ' '),
      pagesAnalyzed: report.sourceCount,
      
      businessOverview: {
        name: report.businessOverview.name,
        industry: report.businessOverview.industry,
        description: report.businessOverview.description,
        operations: report.businessOverview.operations,
        ...(report.businessOverview.foundedYear && { foundedYear: report.businessOverview.foundedYear }),
        ...(report.businessOverview.headquarters && { headquarters: report.businessOverview.headquarters }),
        ...(report.businessOverview.employeeCount && { employeeCount: report.businessOverview.employeeCount }),
      },
      
      keyPersonnel: {
        totalIdentified: 
          report.keyPersonnel.owners.length + 
          report.keyPersonnel.executives.length + 
          report.keyPersonnel.decisionMakers.length,
        owners: report.keyPersonnel.owners.map(p => this.formatPerson(p)),
        executives: report.keyPersonnel.executives.map(p => this.formatPerson(p)),
        decisionMakers: report.keyPersonnel.decisionMakers.map(p => this.formatPerson(p)),
      },
      
      marketStrategy: {
        targetMarket: report.marketStrategy.targetMarket,
        goToMarketStrategy: report.marketStrategy.goToMarketStrategy,
        marketingChannels: report.marketStrategy.marketingChannels,
        ...(report.marketStrategy.competitiveAdvantages && { 
          competitiveAdvantages: report.marketStrategy.competitiveAdvantages 
        }),
        ...(report.marketStrategy.valueProposition && { 
          valueProposition: report.marketStrategy.valueProposition 
        }),
      },
      
      currentStatus: {
        recentNewsCount: report.currentStatus.recentNews.length,
        recentNews: report.currentStatus.recentNews.slice(0, 5).map(news => ({
          title: news.title,
          date: news.date,
          source: news.source,
          summary: news.summary,
          relevance: news.relevance,
          ...(news.url && { url: news.url }),
        })),
        challenges: report.currentStatus.challenges,
        opportunities: report.currentStatus.opportunities,
        ...(report.currentStatus.trends && { trends: report.currentStatus.trends }),
      },
    };
  }

  private formatPerson(person: any): any {
    return {
      name: person.name,
      ...(person.title && { title: person.title }),
      ...(person.role && { role: person.role }),
      ...(person.email && { email: person.email }),
      ...(person.phone && { phone: person.phone }),
      ...(person.linkedInUrl && { linkedIn: person.linkedInUrl }),
    };
  }

  generateSummary(report: BusinessReport): string {
    const { businessOverview, keyPersonnel, marketStrategy, currentStatus } = report;
    
    const personnelCount = 
      keyPersonnel.owners.length + 
      keyPersonnel.executives.length + 
      keyPersonnel.decisionMakers.length;
    
    return `
${businessOverview.name} operates in the ${businessOverview.industry} industry. 
${businessOverview.description}

The analysis identified ${personnelCount} key personnel members, including ${keyPersonnel.owners.length} owners/founders, 
${keyPersonnel.executives.length} executives, and ${keyPersonnel.decisionMakers.length} decision makers.

Their target market is ${marketStrategy.targetMarket}, and they employ a ${marketStrategy.goToMarketStrategy} go-to-market strategy.
${marketStrategy.marketingChannels.length > 0 ? `Marketing channels include: ${marketStrategy.marketingChannels.join(', ')}.` : ''}

${currentStatus.recentNews.length > 0 ? `Recent developments include ${currentStatus.recentNews.length} news items.` : ''}
${currentStatus.challenges.length > 0 ? `Key challenges: ${currentStatus.challenges.slice(0, 3).join(', ')}.` : ''}
${currentStatus.opportunities.length > 0 ? `Key opportunities: ${currentStatus.opportunities.slice(0, 3).join(', ')}.` : ''}

Data confidence: ${Math.round(report.dataConfidence * 100)}%
Analysis status: ${report.completionReason.replace('_', ' ')}
    `.trim();
  }

  formatMetadata(metadata: BusinessReportMetadata): any {
    const duration = metadata.endTime.getTime() - metadata.startTime.getTime();
    
    return {
      requestId: metadata.requestId,
      startTime: metadata.startTime,
      endTime: metadata.endTime,
      duration: `${Math.round(duration / 1000)}s`,
      pagesAnalyzed: metadata.totalPagesAnalyzed,
      errors: metadata.errors.length,
      warnings: metadata.warnings.length,
      ...(metadata.errors.length > 0 && { errorDetails: metadata.errors }),
      ...(metadata.warnings.length > 0 && { warningDetails: metadata.warnings }),
    };
  }
}