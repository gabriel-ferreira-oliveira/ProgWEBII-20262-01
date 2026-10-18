import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readMessage(payload: Record<string, unknown>): string | string[] | undefined {
  const { message } = payload;
  if (typeof message === 'string') {
    return message;
  }
  if (Array.isArray(message)) {
    const items = message.filter((item): item is string => typeof item === 'string');
    if (items.length === message.length) {
      return items;
    }
  }
  return undefined;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[];
    let error: string;

    if (isHttpException) {
      const payload: unknown = exception.getResponse();
      if (typeof payload === 'string') {
        message = payload;
        error = exception.name;
      } else if (isRecord(payload)) {
        message = readMessage(payload) ?? exception.message;
        error = typeof payload.error === 'string' ? payload.error : exception.name;
      } else {
        message = exception.message;
        error = exception.name;
      }
    } else {
      message = 'Erro interno do servidor';
      error = 'Internal Server Error';
      this.logger.error(
        `Erro nao tratado em ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorBody = {
      statusCode,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(body);
  }
}
