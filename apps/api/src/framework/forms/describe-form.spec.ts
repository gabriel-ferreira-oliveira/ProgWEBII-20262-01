import { describeForm } from './describe-form';
import { Field } from './field';
import {
  ExactlyOneOf,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from '../validation/decorators';
import { validate } from '../validation/validate';
import { LoginDto } from '../../modules/auth/dto/login.dto';
import { RegisterDto } from '../../modules/auth/dto/register.dto';
import { UpdateMovieDto } from '../../modules/movies/dto/update-movie.dto';
import { UpdateSeriesDto } from '../../modules/series/dto/update-series.dto';
import { SearchQueryDto } from '../../modules/search/dto/search-query.dto';

class FormFake {
  @Field({ label: 'Titulo', control: 'text', order: 2 })
  @MaxLength(80)
  @IsString()
  titulo!: string;

  @Field({ label: 'Idade', control: 'number', order: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  idade?: number;

  @Field({ label: 'Codigo', control: 'text', order: 3 })
  @Matches(/^\d+$/)
  codigo!: string;

  @Field({ label: 'Observacao', control: 'textarea', order: 4 })
  observacao?: string;
}

class SoOptionalFake {
  @Field({ label: 'Apelido', control: 'text', order: 1 })
  @IsOptional()
  apelido?: string;
}

class BaseFormFake {
  @Field({ label: 'Titulo', control: 'text', order: 1 })
  @IsString()
  titulo!: string;
}

class FilhaFormFake extends BaseFormFake {
  @Field({ label: 'Titulo completo', control: 'textarea', order: 1 })
  @IsOptional()
  override titulo: string = '';
}

@ExactlyOneOf(['title', 'id'], { missing: 'Faltou tudo', multiple: 'Passou dois' })
class RegraComMensagensFake {}

@ExactlyOneOf(['a', 'b'])
class RegraComDefaultsFake {}

class SoValidacaoFake {
  @IsString()
  nome!: string;
}

class VaziaFake {}

describe('framework/forms/describe-form (T3.2)', () => {
  describe('junção de UI e regras (fixtures)', () => {
    it('ordena por `order` e extrai required/min/maxLength/pattern (sem chaves vazias)', () => {
      expect(describeForm(FormFake)).toStrictEqual({
        fields: [
          { name: 'idade', label: 'Idade', control: 'number', order: 1, required: false, min: 0 },
          { name: 'titulo', label: 'Titulo', control: 'text', order: 2, required: true, maxLength: 80 },
          { name: 'codigo', label: 'Codigo', control: 'text', order: 3, required: true, pattern: '/^\\d+$/' },
          { name: 'observacao', label: 'Observacao', control: 'textarea', order: 4, required: false },
        ],
        rules: [],
      });
    });

    it('campo com apenas @IsOptional: required falso (o motor aceita ausente)', () => {
      expect(describeForm(SoOptionalFake)).toStrictEqual({
        fields: [{ name: 'apelido', label: 'Apelido', control: 'text', order: 1, required: false }],
        rules: [],
      });
    });

    it('herança: a filha substitui UI e regras da mesma propriedade', () => {
      expect(describeForm(FilhaFormFake)?.fields).toStrictEqual([
        { name: 'titulo', label: 'Titulo completo', control: 'textarea', order: 1, required: false },
      ]);
      expect(describeForm(BaseFormFake)?.fields).toStrictEqual([
        { name: 'titulo', label: 'Titulo', control: 'text', order: 1, required: true },
      ]);
    });

    it('regras de classe com mensagens do decorator e com os defaults do motor', () => {
      expect(describeForm(RegraComMensagensFake)).toStrictEqual({
        fields: [],
        rules: [
          {
            kind: 'exactlyOneOf',
            properties: ['title', 'id'],
            missingMessage: 'Faltou tudo',
            multipleMessage: 'Passou dois',
          },
        ],
      });
      expect(describeForm(RegraComDefaultsFake)?.rules).toStrictEqual([
        {
          kind: 'exactlyOneOf',
          properties: ['a', 'b'],
          missingMessage: 'one of [a, b] must be provided',
          multipleMessage: 'only one of [a, b] may be provided',
        },
      ]);
    });

    it('sem campos e sem regras → undefined (nada a descrever)', () => {
      expect(describeForm(VaziaFake)).toBeUndefined();
      expect(describeForm(SoValidacaoFake)).toBeUndefined();
    });
  });

  describe('o metadado não pode mentir (DTOs reais)', () => {
    it('todo campo required falha no motor quando ausente — e só ele', () => {
      const dtos: (new () => object)[] = [LoginDto, RegisterDto, UpdateMovieDto, UpdateSeriesDto];
      for (const Class of dtos) {
        const meta = describeForm(Class);
        expect(meta).toBeDefined();
        expect(meta?.fields.length).toBeGreaterThan(0);
        for (const field of meta?.fields ?? []) {
          const falhou = validate(Class, {}).errors.some((issue) => issue.property === field.name);
          expect({ dto: Class.name, campo: field.name, falhou }).toEqual({
            dto: Class.name,
            campo: field.name,
            falhou: field.required,
          });
        }
      }
    });

    it('RegisterDto: campos na ordem da UI, com labels/controles do cadastro', () => {
      const campos = (describeForm(RegisterDto)?.fields ?? []).map(
        (field) => [field.name, field.label, field.control, field.required] as const,
      );
      expect(campos).toEqual([
        ['name', 'Nome', 'text', true],
        ['email', 'Email', 'text', true],
        ['age', 'Idade', 'number', false],
        ['password', 'Senha', 'password', true],
        ['bio', 'Sobre', 'textarea', false],
      ]);
    });

    it('sinopses: campo único com label do dialog', () => {
      expect(describeForm(UpdateMovieDto)?.fields).toStrictEqual([
        { name: 'synopsis', label: 'Sinopse', control: 'textarea', order: 1, required: true },
      ]);
      expect(describeForm(UpdateSeriesDto)?.fields).toStrictEqual([
        { name: 'synopsis', label: 'Sinopse', control: 'textarea', order: 1, required: true },
      ]);
    });
  });

  describe('SearchQueryDto (sem @Field, só regra de classe)', () => {
    it('descreve a regra com as mensagens efetivas do DTO', () => {
      expect(describeForm(SearchQueryDto)).toStrictEqual({
        fields: [],
        rules: [
          {
            kind: 'exactlyOneOf',
            properties: ['title', 'id'],
            missingMessage: 'Campos de pesquisa vazio',
            multipleMessage: 'Apenas um campo pode ser prenchido para a pesquisa',
          },
        ],
      });
    });

    it('as mensagens descritas são exatamente as que o motor responde (vazio e dois campos)', () => {
      const rules = describeForm(SearchQueryDto)?.rules ?? [];
      expect(validate(SearchQueryDto, {}).errors.map((issue) => issue.message)).toEqual([
        rules[0]?.missingMessage,
      ]);
      expect(
        validate(SearchQueryDto, { title: 'a', id: 1 }).errors.map((issue) => issue.message),
      ).toEqual([rules[0]?.multipleMessage]);
    });
  });
});
