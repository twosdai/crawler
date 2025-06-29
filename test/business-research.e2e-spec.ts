import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Business Research API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/business-research/health (GET)', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/api/business-research/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('service', 'business-research-api');
        });
    });
  });

  describe('/api/business-research/analyze (POST)', () => {
    it('should validate request body', () => {
      return request(app.getHttpServer())
        .post('/api/business-research/analyze')
        .send({
          // Missing required 'website' field
          maxPages: 5,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('error');
          expect(res.body).toHaveProperty('message');
        });
    });

    it('should validate URL format', () => {
      return request(app.getHttpServer())
        .post('/api/business-research/analyze')
        .send({
          website: 'not-a-valid-url',
          maxPages: 5,
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('error');
          expect(res.body.message).toContain('url');
        });
    });

    it('should accept valid analysis request', () => {
      return request(app.getHttpServer())
        .post('/api/business-research/analyze')
        .send({
          website: 'https://example.com',
          maxPages: 5,
          timeoutMinutes: 2,
        })
        .expect(201)
        .timeout(150000) // 2.5 minutes timeout for the test
        .expect((res) => {
          expect(res.body).toHaveProperty('success');
          expect(res.body).toHaveProperty('metadata');
          expect(res.body).toHaveProperty('report');
          
          // Check metadata structure
          expect(res.body.metadata).toHaveProperty('requestId');
          expect(res.body.metadata).toHaveProperty('duration');
          expect(res.body.metadata).toHaveProperty('pagesAnalyzed');
          
          // Check report structure
          expect(res.body.report).toHaveProperty('businessOverview');
          expect(res.body.report).toHaveProperty('keyPersonnel');
          expect(res.body.report).toHaveProperty('marketStrategy');
          expect(res.body.report).toHaveProperty('currentStatus');
        });
    });
  });

  describe('/health (GET)', () => {
    it('should return app health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('uptime');
        });
    });
  });
});