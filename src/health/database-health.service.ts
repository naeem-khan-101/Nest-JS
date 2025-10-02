import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Test database connection
      await this.dataSource.query('SELECT 1');
      
      const result = this.getStatus(key, true, {
        message: 'Database connection is healthy',
        status: 'connected',
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      const result = this.getStatus(key, false, {
        message: 'Database connection failed',
        status: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      throw new HealthCheckError('Database health check failed', result);
    }
  }
}
