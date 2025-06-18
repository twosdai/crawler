import { Module } from '@nestjs/common';
import { DataAnalysisService } from './data-analysis.service';

@Module({
  providers: [DataAnalysisService],
  exports: [DataAnalysisService],
})
export class DataAnalysisModule {}