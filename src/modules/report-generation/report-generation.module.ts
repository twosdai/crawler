import { Module } from '@nestjs/common';
import { ReportGenerationService } from './report-generation.service';

@Module({
  providers: [ReportGenerationService],
  exports: [ReportGenerationService],
})
export class ReportGenerationModule {}