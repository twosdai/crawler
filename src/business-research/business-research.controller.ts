import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Param,
  Logger,
  ValidationPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AnalyzeBusinessDto } from '../common/dto/analyze-business.dto';
import { AgentOrchestrationService } from '../modules/agent-orchestration/agent-orchestration.service';
import { ReportGenerationService } from '../modules/report-generation/report-generation.service';

@ApiTags('business-research')
@Controller('api/business-research')
export class BusinessResearchController {
  private readonly logger = new Logger(BusinessResearchController.name);

  constructor(
    private agentOrchestrationService: AgentOrchestrationService,
    private reportGenerationService: ReportGenerationService,
  ) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze a business website' })
  @ApiResponse({ status: 201, description: 'Analysis started successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async analyzeBusinessWebsite(
    @Body(new ValidationPipe()) dto: AnalyzeBusinessDto,
  ) {
    try {
      this.logger.log(`Received analysis request for ${dto.website}`);

      const { report, metadata } = await this.agentOrchestrationService.analyzeBusinessWebsite(
        dto.website,
        dto.maxPages,
        dto.timeoutMinutes,
      );

      const formattedReport = this.reportGenerationService.formatReport(report);
      const formattedMetadata = this.reportGenerationService.formatMetadata(metadata);
      const summary = this.reportGenerationService.generateSummary(report);

      return {
        success: true,
        metadata: formattedMetadata,
        summary,
        report: formattedReport,
      };
    } catch (error) {
      this.logger.error(`Analysis failed: ${error.message}`, error.stack);
      throw new HttpException(
        {
          success: false,
          message: 'Analysis failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date(),
      service: 'business-research-api',
    };
  }

  @Get('test-scrape/:encodedUrl')
  @ApiOperation({ summary: 'Test web scraping functionality' })
  @ApiResponse({ status: 200, description: 'Scraping test result' })
  async testScraping(@Param('encodedUrl') encodedUrl: string) {
    try {
      const url = decodeURIComponent(encodedUrl);
      this.logger.log(`Testing scraping for ${url}`);
      
      // This would use WebScrapingService.testScraping method
      // For now, returning mock response
      return {
        success: true,
        message: 'Test endpoint - implement with WebScrapingService',
        url,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Test failed',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}