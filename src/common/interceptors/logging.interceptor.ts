import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const requestId = (request as any).id || 'unknown';

    const { method, url, ip } = request;
    const userAgent = request.headers['user-agent'] || 'unknown';
    const startTime = Date.now();

    // Log request
    this.logger.log(
      `Incoming Request: ${method} ${url} - ${ip} - ${userAgent}`,
      {
        requestId,
        method,
        url,
        ip,
        userAgent,
        timestamp: new Date().toISOString(),
      }
    );

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          
          this.logger.log(
            `Outgoing Response: ${method} ${url} - ${statusCode} - ${duration}ms`,
            {
              requestId,
              method,
              url,
              statusCode,
              duration,
              timestamp: new Date().toISOString(),
            }
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;
          
          this.logger.error(
            `Request Error: ${method} ${url} - ${statusCode} - ${duration}ms - ${error.message}`,
            {
              requestId,
              method,
              url,
              statusCode,
              duration,
              error: error.message,
              stack: error.stack,
              timestamp: new Date().toISOString(),
            }
          );
        },
      })
    );
  }
}
