import { IsUrl, IsNotEmpty, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AnalyzeBusinessDto {
  @ApiProperty({
    description: 'The business website URL to analyze',
    example: 'https://example.com'
  })
  @IsUrl()
  @IsNotEmpty()
  website: string;

  @ApiProperty({
    description: 'Maximum number of pages to analyze',
    default: 10,
    minimum: 1,
    maximum: 50,
    required: false
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  maxPages?: number = 10;

  @ApiProperty({
    description: 'Analysis timeout in minutes',
    default: 5,
    minimum: 1,
    maximum: 30,
    required: false
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  timeoutMinutes?: number = 5;
}

export class AnalysisStatusDto {
  @ApiProperty({
    description: 'The request ID for the analysis',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsNotEmpty()
  requestId: string;
}