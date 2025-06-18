import { Injectable } from '@nestjs/common';
import { BaseAgent } from './base.agent';
import { AgentContext, AgentResult, AgentType } from '../../../common/interfaces/agent.interface';
import { OpenAIService } from '../openai.service';
import { Person, KeyPersonnel } from '../../../common/interfaces/business-report.interface';

@Injectable()
export class PersonnelResearchAgent extends BaseAgent {
  constructor(private openAIService: OpenAIService) {
    super(
      'personnel-research-001',
      AgentType.PERSONNEL_RESEARCH,
      'Personnel Research Agent',
      'Identifies key personnel, owners, and decision makers',
    );
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      if (!this.validateInput(context)) {
        return this.createResult(false, null, 'Invalid input context');
      }

      this.logger.log(`Starting personnel research for ${context.website}`);

      // Get scraped data from context
      const scrapedPages = context.collectedData.get('scrapedPages');
      const extractedWebData = context.collectedData.get('extractedWebData');

      if (!scrapedPages || scrapedPages.length === 0) {
        return this.createResult(false, null, 'No scraped data available for analysis');
      }

      const { result, duration } = await this.measureExecutionTime(async () => {
        return await this.identifyKeyPersonnel(scrapedPages, extractedWebData);
      });

      // Store personnel data in context
      context.collectedData.set('keyPersonnel', result);

      const confidence = this.calculatePersonnelConfidence(result);

      this.logger.log(`Identified ${result.totalPersonnel} personnel with confidence ${confidence}`);

      return this.createResult(
        true,
        result,
        undefined,
        confidence,
        duration,
      );
    } catch (error) {
      this.logger.error(`Personnel research failed: ${error.message}`);
      return this.createResult(false, null, error.message, 0, 0);
    }
  }

  private async identifyKeyPersonnel(
    scrapedPages: any[],
    extractedWebData: any,
  ): Promise<KeyPersonnel & { totalPersonnel: number }> {
    // Collect all personnel mentions
    const personnelMentions = extractedWebData?.personnelMentions || [];
    
    // Find team/about pages for focused analysis
    const teamPages = scrapedPages.filter(page => 
      ['team', 'about'].includes(page.metadata?.pageType)
    );

    // Prepare data for AI analysis
    const analysisData = {
      personnelMentions,
      teamPagesContent: teamPages.map(page => ({
        url: page.url,
        title: page.title,
        content: page.content.substring(0, 3000), // Limit content length
      })),
      structuredData: extractedWebData?.structuredData?.filter(data => 
        data['@type'] === 'Person' || data['@type'] === 'Organization'
      ),
    };

    // Use OpenAI to analyze and categorize personnel
    const prompt = `
Analyze the following business website data and identify key personnel.
Categorize them into:
1. Owners/Founders
2. Executives (C-suite, VP level)
3. Decision Makers (Directors, Managers, Key roles)

For each person, extract:
- name (required)
- title/role
- department (if mentioned)
- any contact information (email, phone, LinkedIn)

Return the data structured according to the KeyPersonnel interface.
`;

    const personnelData = await this.openAIService.extractStructuredData<KeyPersonnel>(
      prompt,
      analysisData,
      {
        owners: [{ name: 'string', title: 'string', role: 'string', email: 'string', linkedInUrl: 'string' }],
        executives: [{ name: 'string', title: 'string', role: 'string', email: 'string', linkedInUrl: 'string' }],
        decisionMakers: [{ name: 'string', title: 'string', role: 'string', email: 'string', linkedInUrl: 'string' }],
      },
    );

    // Deduplicate and clean data
    const cleanedData = this.cleanPersonnelData(personnelData);
    
    const totalPersonnel = 
      cleanedData.owners.length + 
      cleanedData.executives.length + 
      cleanedData.decisionMakers.length;

    return {
      ...cleanedData,
      totalPersonnel,
    };
  }

  private cleanPersonnelData(data: KeyPersonnel): KeyPersonnel {
    const seen = new Set<string>();
    
    const deduplicatePeople = (people: Person[]): Person[] => {
      return people.filter(person => {
        const key = person.name.toLowerCase().trim();
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
    };

    return {
      owners: deduplicatePeople(data.owners || []),
      executives: deduplicatePeople(data.executives || []),
      decisionMakers: deduplicatePeople(data.decisionMakers || []),
    };
  }

  private calculatePersonnelConfidence(result: any): number {
    const { owners, executives, decisionMakers, totalPersonnel } = result;
    
    let confidence = 0;

    // Base confidence for finding any personnel
    if (totalPersonnel > 0) confidence += 0.3;

    // Additional confidence for finding owners/founders
    if (owners.length > 0) confidence += 0.25;

    // Additional confidence for finding executives
    if (executives.length > 0) confidence += 0.2;

    // Additional confidence for finding decision makers
    if (decisionMakers.length > 0) confidence += 0.15;

    // Bonus for comprehensive personnel data
    if (totalPersonnel >= 5) confidence += 0.1;

    return Math.min(confidence, 1);
  }
}