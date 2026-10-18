import { ExactlyOneOf } from './decorators';
import { IsInt, IsOptional, IsString, Min } from './decorators';
import { getClassValidationRules } from './validation-registry';
import { validate } from './validate';

const props = ['title', 'id'];

@ExactlyOneOf(props, 'Campos de pesquisa vazio')
class BuscaUmaMensagemFake {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;
}

@ExactlyOneOf(props, {
  missing: 'Campos de pesquisa vazio',
  multiple: 'Apenas um campo pode ser prenchido para a pesquisa',
})
class BuscaLegadoFake {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;
}

@ExactlyOneOf(['a', 'b'])
class BuscaDefaultsFake {
  @IsOptional()
  @IsString()
  a?: string;

  @IsOptional()
  @IsString()
  b?: string;
}

class BaseComRegraFake {
  @IsOptional()
  @IsString()
  a?: string;

  @IsOptional()
  @IsString()
  b?: string;
}
// aplica a regra na base depois da definição da classe (ClassDecorator direto)
ExactlyOneOf(['a', 'b'], 'um dos campos é obrigatório')(BaseComRegraFake);

class FilhaDaBaseFake extends BaseComRegraFake {}

describe('framework/validation/exactly-one-of (T2.3)', () => {
  describe('registro e leitura do metadado', () => {
    it('grava a regra de classe com propriedades e mensagem única', () => {
      expect(getClassValidationRules(BuscaUmaMensagemFake)).toEqual([
        {
          kind: 'exactlyOneOf',
          properties: ['title', 'id'],
          missingMessage: 'Campos de pesquisa vazio',
          multipleMessage: 'Campos de pesquisa vazio',
        },
      ]);
    });

    it('grava mensagens distintas quando recebe o objeto', () => {
      expect(getClassValidationRules(BuscaLegadoFake)).toEqual([
        {
          kind: 'exactlyOneOf',
          properties: ['title', 'id'],
          missingMessage: 'Campos de pesquisa vazio',
          multipleMessage: 'Apenas um campo pode ser prenchido para a pesquisa',
        },
      ]);
    });

    it('sem mensagem: mensagens ausentes ficam para o default do motor', () => {
      expect(getClassValidationRules(BuscaDefaultsFake)).toEqual([
        { kind: 'exactlyOneOf', properties: ['a', 'b'], missingMessage: undefined, multipleMessage: undefined },
      ]);
    });

    it('grava sob a chave ceviu:validation:class-rules no construtor', () => {
      expect(Reflect.getOwnMetadata('ceviu:validation:class-rules', BuscaLegadoFake)).toBeDefined();
      expect(
        Reflect.getOwnMetadata('ceviu:validation:class-rules', BuscaLegadoFake.prototype),
      ).toBeUndefined();
    });

    it('a filha enxerga a regra de classe da base (leitura mesclada)', () => {
      expect(getClassValidationRules(FilhaDaBaseFake)).toEqual([
        {
          kind: 'exactlyOneOf',
          properties: ['a', 'b'],
          missingMessage: 'um dos campos é obrigatório',
          multipleMessage: 'um dos campos é obrigatório',
        },
      ]);
    });
  });

  describe('execução pelo motor', () => {
    it('exatamente um campo presente: sem erros', () => {
      expect(validate(BuscaLegadoFake, { title: 'matriz' }).errors).toEqual([]);
      expect(validate(BuscaLegadoFake, { id: 1 }).errors).toEqual([]);
      expect(validate(BuscaLegadoFake, { id: '1' }).errors).toEqual([]);
    });

    it('nenhum campo: erro de classe com a mensagem de ausência', () => {
      const { errors } = validate(BuscaLegadoFake, {});
      expect(errors).toEqual([
        {
          property: 'title,id',
          kind: 'exactlyOneOf',
          message: 'Campos de pesquisa vazio',
        },
      ]);
    });

    it('string vazia conta como ausente (paridade com o legado)', () => {
      const { errors } = validate(BuscaLegadoFake, { title: '' });
      expect(errors).toEqual([
        { property: 'title,id', kind: 'exactlyOneOf', message: 'Campos de pesquisa vazio' },
      ]);
    });

    it('dois campos: erro de classe com a mensagem de múltiplos', () => {
      const { errors } = validate(BuscaLegadoFake, { title: 'matriz', id: 1 });
      expect(errors).toEqual([
        {
          property: 'title,id',
          kind: 'exactlyOneOf',
          message: 'Apenas um campo pode ser prenchido para a pesquisa',
        },
      ]);
    });

    it('sem message: usa os defaults do motor', () => {
      const { errors } = validate(BuscaDefaultsFake, {});
      expect(errors).toEqual([
        {
          property: 'a,b',
          kind: 'exactlyOneOf',
          message: 'one of [a, b] must be provided',
        },
      ]);
      expect(validate(BuscaDefaultsFake, { a: 'x', b: 'y' }).errors).toEqual([
        {
          property: 'a,b',
          kind: 'exactlyOneOf',
          message: 'only one of [a, b] may be provided',
        },
      ]);
    });

    it('erros de propriedade e de classe convivem no mesmo resultado', () => {
      const { errors } = validate(BuscaLegadoFake, { title: 'matriz', id: 0 });
      expect(errors).toEqual([
        { property: 'id', kind: 'min', message: 'id must not be less than 1' },
        {
          property: 'title,id',
          kind: 'exactlyOneOf',
          message: 'Apenas um campo pode ser prenchido para a pesquisa',
        },
      ]);
    });
  });
});
