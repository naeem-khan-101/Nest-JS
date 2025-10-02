import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import {
  HealthCheckService,
  HealthCheck,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './database-health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private db: TypeOrmHealthIndicator,
    private databaseHealth: DatabaseHealthIndicator,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check application health' })
  @ApiResponse({
    status: 200,
    description: 'Returns health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        info: { type: 'object' },
        error: { type: 'object' },
        details: { type: 'object' }
      }
    }
  })
  check() {
    // Use process.cwd() for cross-platform compatibility
    const diskPath = process.platform === 'win32' ? process.cwd() : '/';

    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),
      () => this.disk.checkStorage('storage', { path: diskPath, thresholdPercent: 0.9 }),
      () => this.db.pingCheck('database'),
      () => this.databaseHealth.isHealthy('database_connection'),
    ]);
  }

  @Public()
  @Get('database')
  @HealthCheck()
  @ApiOperation({ summary: 'Check database health' })
  @ApiResponse({
    status: 200,
    description: 'Returns database health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        info: { type: 'object' },
        error: { type: 'object' },
        details: { type: 'object' }
      }
    }
  })
  checkDatabase() {
    return this.health.check([
      () => this.databaseHealth.isHealthy('database_connection'),
    ]);
  }
}
