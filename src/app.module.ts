import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WebScrapingModule } from './modules/web-scraping/web-scraping.module';
import { AgentOrchestrationModule } from './modules/agent-orchestration/agent-orchestration.module';
import { ReportGenerationModule } from './modules/report-generation/report-generation.module';
import { BusinessResearchController } from './business-research/business-research.controller';
import appConfig from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    WebScrapingModule,
    AgentOrchestrationModule,
    ReportGenerationModule,
  ],
  controllers: [AppController, BusinessResearchController],
  providers: [AppService],
})
export class AppModule {}
