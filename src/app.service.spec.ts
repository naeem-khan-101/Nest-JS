import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return welcome message with timestamp and version', () => {
    const result = service.getHello();
    expect(result).toEqual({
      message: 'Welcome to NestJS Starter API!',
      timestamp: expect.any(String),
      version: '1.0.0',
    });
  });
});
