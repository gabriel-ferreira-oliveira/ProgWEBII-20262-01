import { BadRequestException } from '@nestjs/common';
import type { ArgumentMetadata } from '@nestjs/common';
import { IsString as LegacyIsString } from 'class-validator';
import { ExactlyOneOf, IsInt, IsOptional, IsString, Min } from './decorators';
import { ComposedValidationPipe } from './validation.pipe';

const body = (metatype: ArgumentMetadata['metatype']): ArgumentMetadata => ({
  type: 'body',
  data: undefined,
  metatype,
});

/** DTO próprio: regras no registro → caminho do motor. */
class TituloFake {
  @IsString()
  title!: string;
}

/** DTO próprio com herança + regra de classe (mesma forma do SearchQueryDto futuro, T2.7). */
class BuscaBaseFake {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;
}

@ExactlyOneOf(['title', 'id'], {
  missing: 'Campos de pesquisa vazio',
  multiple: 'Apenas um campo pode ser prenchido para a pesquisa',
})
class BuscaFake extends BuscaBaseFake {}

/** DTO legado: sem regras no registro próprio → delega ao ValidationPipe (morre na T2.8). */
class LegacyFake {
  @LegacyIsString()
  name!: string;
}

/** Captura a BadRequestException e devolve a resposta, garantindo o tipo lançado. */
async function expectBadRequest(
  run: () => unknown | Promise<unknown>,
): Promise<BadRequestException> {
  try {
    await run();
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    return error as BadRequestException;
  }
  throw new Error('esperava uma BadRequestException');
}

describe('framework/validation/validation.pipe (T2.4)', () => {
  const pipe = new ComposedValidationPipe();

  describe('classes com regras próprias (motor)', () => {
    it('válido: devolve instância da classe com os valores convertidos', () => {
      const result = pipe.transform({ title: 'matriz' }, body(BuscaFake));
      expect(result).toBeInstanceOf(BuscaFake);
      expect((result as BuscaFake).title).toBe('matriz');
    });

    it('converte string numérica em Number no caminho do motor', () => {
      const result = pipe.transform({ id: '1' }, body(BuscaFake)) as BuscaFake;
      expect(result).toBeInstanceOf(BuscaFake);
      expect(result.id).toBe(1);
    });

    it('inválido: lança BadRequestException com o formato do legado (message: string[])', async () => {
      const error = await expectBadRequest(() => pipe.transform({ title: 5 }, body(TituloFake)));
      expect(error.getResponse()).toEqual({
        statusCode: 400,
        message: ['title must be a string'],
        error: 'Bad Request',
      });
    });

    it('whitelist: chave fora do registro vira erro e não é copiada', async () => {
      const error = await expectBadRequest(() =>
        pipe.transform({ title: 'matriz', hacker: 1 }, body(TituloFake)),
      );
      expect(error.getResponse()).toEqual({
        statusCode: 400,
        message: ['property hacker should not exist'],
        error: 'Bad Request',
      });
    });

    it('erros de propriedade e whitelist, na ordem: propriedades → whitelist → classe', async () => {
      const error = await expectBadRequest(() =>
        pipe.transform({ title: 5, hacker: 1 }, body(BuscaFake)),
      );
      expect(error.getResponse()).toEqual({
        statusCode: 400,
        message: ['title must be a string', 'property hacker should not exist'],
        error: 'Bad Request',
      });
    });

    it('regra de classe herdada: nenhum campo preenchido → mensagem de ausência', async () => {
      const error = await expectBadRequest(() => pipe.transform({}, body(BuscaFake)));
      expect(error.getResponse()).toEqual({
        statusCode: 400,
        message: ['Campos de pesquisa vazio'],
        error: 'Bad Request',
      });
    });

    it('regra de classe herdada: dois campos preenchidos → mensagem de múltiplos', async () => {
      const error = await expectBadRequest(() =>
        pipe.transform({ title: 'matriz', id: 1 }, body(BuscaFake)),
      );
      expect(error.getResponse()).toEqual({
        statusCode: 400,
        message: ['Apenas um campo pode ser prenchido para a pesquisa'],
        error: 'Bad Request',
      });
    });

    it('body ausente (nil): valida como objeto vazio, paridade com o toEmptyIfNil do legado', async () => {
      const error = await expectBadRequest(() => pipe.transform(undefined, body(TituloFake)));
      expect(error.getResponse()).toEqual({
        statusCode: 400,
        message: ['title must be a string'],
        error: 'Bad Request',
      });
    });

    it('body ausente num DTO com regra de classe: cai na regra (futuro SearchQueryDto)', async () => {
      const error = await expectBadRequest(() => pipe.transform(undefined, body(BuscaFake)));
      expect(error.getResponse()).toEqual({
        statusCode: 400,
        message: ['Campos de pesquisa vazio'],
        error: 'Bad Request',
      });
    });

    it('válido com regra de classe: devolve instância também no body nil sem erro', () => {
      class SoOpcionalFake {
        @IsOptional()
        @IsString()
        title?: string;
      }
      const result = pipe.transform(undefined, body(SoOpcionalFake));
      expect(result).toBeInstanceOf(SoOpcionalFake);
    });
  });

  describe('classes sem regras próprias (delegação ao ValidationPipe legado)', () => {
    it('valida com o class-validator do legado e mantém as mensagens', async () => {
      const error = await expectBadRequest(() => pipe.transform({}, body(LegacyFake)));
      expect(error.getResponse()).toEqual({
        statusCode: 400,
        message: ['name must be a string'],
        error: 'Bad Request',
      });
    });

    it('mantém o whitelist/forbidNonWhitelisted do legado', async () => {
      const error = await expectBadRequest(() =>
        pipe.transform({ name: 'x', extra: 1 }, body(LegacyFake)),
      );
      expect(error.getResponse()).toEqual({
        statusCode: 400,
        message: ['property extra should not exist'],
        error: 'Bad Request',
      });
    });

    it('metatipo primitivo (Object): devolve o valor como está', async () => {
      const value = { q: '1' };
      expect(await pipe.transform(value, body(Object))).toBe(value);
    });

    it('sem metatipo: devolve o valor como está', async () => {
      const value = { q: '1' };
      expect(await pipe.transform(value, body(undefined))).toBe(value);
    });
  });
});
