import { UseGuards, applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';

/**
 * Marca um controller como autenticado num so decorator: tag do Swagger,
 * bearer auth no documento e `JwtAuthGuard` em todas as rotas.
 */
export function Authenticated(tag: string): ClassDecorator {
  return applyDecorators(ApiTags(tag), ApiBearerAuth(), UseGuards(JwtAuthGuard));
}
