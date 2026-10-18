import { Body, Controller, Post } from '@nestjs/common';
import type { RegisterRequestDto } from '@ceviu/shared';

/**
 * Avaliacao da T4.8: um controller generico reutilizaria as rotas, mas o
 * `emitDecoratorMetadata` apaga o tipo do parametro no `@Body` (vira `Object`),
 * o `FrameworkValidationPipe` nao encontra regras em `Object` e a validacao
 * dinamica (Fase 2) some. Este spec fixa essa limitacao como evidencia.
 */
abstract class GenericMediaBase<TDto> {
  @Post()
  create(@Body() dto: TDto): TDto {
    return dto;
  }
}

@Controller('generico')
class GenericMediaController extends GenericMediaBase<RegisterRequestDto> {}

describe('Controller generico (avaliacao da T4.8)', () => {
  it('o metatype de @Body em metodo generico vira Object (as regras do DTO se perdem)', () => {
    const metatypes = Reflect.getMetadata(
      'design:paramtypes',
      GenericMediaBase.prototype,
      'create',
    ) as unknown[];

    expect(metatypes[0]).toBe(Object);
  });

  it('a heranca preserva as rotas (por isso o problema e so o metatype)', () => {
    expect(GenericMediaController.prototype.create).toBe(GenericMediaBase.prototype.create);
    expect(Reflect.getMetadata('path', GenericMediaController)).toBe('generico');
  });
});
