import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  analysis: {
    maxPagesPerAnalysis: parseInt(process.env.MAX_PAGES_PER_ANALYSIS, 10) || 10,
    timeoutMinutes: parseInt(process.env.ANALYSIS_TIMEOUT_MINUTES, 10) || 5,
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 10,
  },
  puppeteer: {
    timeoutMs: parseInt(process.env.PUPPETEER_TIMEOUT_MS, 10) || 30000,
    userAgent: process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    headless: process.env.NODE_ENV === 'production' ? 'new' : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
}));