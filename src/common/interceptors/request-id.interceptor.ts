import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Generate request ID if not present
    const requestId = request.headers['x-request-id'] as string || uuidv4();
    
    // Add request ID to request and response
    (request as any).id = requestId;
    response.setHeader('X-Request-ID', requestId);

    return next.handle();
  }
}
