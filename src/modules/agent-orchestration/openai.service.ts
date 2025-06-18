import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('app.openai.apiKey');
    
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    this.openai = new OpenAI({
      apiKey,
    });
  }

  async analyzeBusinessData(
    prompt: string,
    data: any,
    model: string = 'gpt-4-turbo-preview',
  ): Promise<string> {
    try {
      const systemPrompt = `You are a business intelligence analyst agent. Analyze the provided data and extract relevant business information. Be precise, factual, and structure your response clearly.`;
      
      const completion = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${prompt}\n\nData to analyze:\n${JSON.stringify(data, null, 2)}` },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      return completion.choices[0].message.content || '';
    } catch (error) {
      this.logger.error(`OpenAI API error: ${error.message}`);
      throw error;
    }
  }

  async extractStructuredData<T>(
    prompt: string,
    data: any,
    schema: Record<string, any>,
    model: string = 'gpt-4-turbo-preview',
  ): Promise<T> {
    try {
      const systemPrompt = `You are a data extraction agent. Extract structured information from the provided data according to the given schema. Return only valid JSON that matches the schema.`;
      
      const completion = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `${prompt}\n\nExpected schema:\n${JSON.stringify(schema, null, 2)}\n\nData to analyze:\n${JSON.stringify(data, null, 2)}` 
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0].message.content || '{}';
      return JSON.parse(content) as T;
    } catch (error) {
      this.logger.error(`OpenAI API error: ${error.message}`);
      throw error;
    }
  }

  async evaluateDataQuality(
    data: any,
    criteria: string[],
    model: string = 'gpt-4-turbo-preview',
  ): Promise<{ score: number; missing: string[]; recommendations: string[] }> {
    try {
      const systemPrompt = `You are a data quality assessment agent. Evaluate the completeness and quality of the provided business data.`;
      
      const prompt = `
Evaluate the following business data against these criteria:
${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Return a JSON object with:
- score: A quality score from 0 to 1
- missing: Array of missing or incomplete data points
- recommendations: Array of recommendations to improve data completeness
`;

      const completion = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${prompt}\n\nData:\n${JSON.stringify(data, null, 2)}` },
        ],
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0].message.content || '{}';
      return JSON.parse(content);
    } catch (error) {
      this.logger.error(`OpenAI API error: ${error.message}`);
      throw error;
    }
  }
}