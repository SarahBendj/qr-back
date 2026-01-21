import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap, catchError } from 'rxjs';
import { throwError } from 'rxjs';

const SENSITIVE_KEYS = [
  'password',
  'pass',
  'pwd',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'otp',
  'otpCode',
  'code',
  'secret',
];

export function maskSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(maskSensitiveData);
  }

  const masked: Record<string, any> = {};

  for (const key of Object.keys(data)) {
    // Case-insensitive comparison
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some(
      (sensitiveKey) => lowerKey.includes(sensitiveKey.toLowerCase())
    );

    if (isSensitive) {
      masked[key] = '***';
    } else if (typeof data[key] === 'object' && data[key] !== null) {
      masked[key] = maskSensitiveData(data[key]);
    } else {
      masked[key] = data[key];
    }
  }

  return masked;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, originalUrl, body } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap((response) => {
        const delay = Date.now() - start;
        
        try {
          const maskedBody = maskSensitiveData(body);
          const maskedResponse = maskSensitiveData(response);

          this.logger.log(
            `${method} ${originalUrl} ${delay}ms - ${JSON.stringify({
              body: maskedBody,
              response: maskedResponse,
            })}`
          );
        } catch (error) {
          this.logger.warn(
            `${method} ${originalUrl} ${delay}ms - Failed to serialize log data`
          );
        }
      }),
      catchError((error) => {
        const delay = Date.now() - start;
        
        try {
          const maskedBody = maskSensitiveData(body);
          
          this.logger.error(
            `${method} ${originalUrl} ${delay}ms - ${error.message}`,
            JSON.stringify({ body: maskedBody })
          );
        } catch (serializationError) {
          this.logger.error(
            `${method} ${originalUrl} ${delay}ms - ${error.message}`
          );
        }

        return throwError(() => error);
      })
    );
  }
}