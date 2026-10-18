import { HttpErrorResponse } from '@angular/common/http';

interface ApiErrorBody {
  readonly message?: unknown;
}

function isMessageArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/**
 * Extrai a mensagem do corpo de erro padronizado da API
 * (`{ statusCode, message, error, path, timestamp }`, ver AllExceptionsFilter).
 * Retorna null quando a resposta nao veio da API (ex.: rede fora do ar).
 */
export function extractApiMessage(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }
  const body: unknown = error.error;
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const { message } = body as ApiErrorBody;
  if (typeof message === 'string' && message.length > 0) {
    return message;
  }
  if (isMessageArray(message) && message.length > 0) {
    return message.join('; ');
  }
  return null;
}
