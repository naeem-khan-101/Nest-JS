import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): { message: string; timestamp: string; version: string } {
    return {
      message: 'Welcome to NestJS Starter API!',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}
