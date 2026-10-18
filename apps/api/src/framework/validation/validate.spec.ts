import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from './decorators';
import { validate } from './validate';

class LoginFake {
  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

class BuscaFake {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;
}

class CadastroFake {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  bio?: string;
}

class CodigoFake {
  @Matches(/^\d+$/)
  codigo!: string;
}

class FilhaDeCadastroFake extends CadastroFake {}

class SemRegistroFake {}

describe('framework/validation/validate (T2.2)', () => {
  describe('fluxo básico', () => {
    it('plain válido: instância da classe e nenhum erro', () => {
      const { value, errors } = validate(LoginFake, { email: 'a@b.com', password: '12345' });
      expect(errors).toEqual([]);
      expect(value).toBeInstanceOf(LoginFake);
      expect(value.email).toBe('a@b.com');
    });

    it('campo obrigatório ausente: um erro por regra, na ordem do registro', () => {
      const { errors } = validate(LoginFake, {});
      expect(errors).toEqual([
        { property: 'email', kind: 'isNotEmpty', message: 'email should not be empty' },
        { property: 'email', kind: 'isString', message: 'email must be a string' },
        { property: 'password', kind: 'isNotEmpty', message: 'password should not be empty' },
        { property: 'password', kind: 'isString', message: 'password must be a string' },
      ]);
    });

    it('null em campo obrigatório: falha e o valor é copiado', () => {
      const { value, errors } = validate(LoginFake, { email: null, password: 'x' });
      expect(errors).toEqual([
        { property: 'email', kind: 'isNotEmpty', message: 'email should not be empty' },
        { property: 'email', kind: 'isString', message: 'email must be a string' },
      ]);
      expect(value.email).toBeNull();
    });

    it('@IsOptional: ausente ou null não gera erros', () => {
      expect(validate(BuscaFake, {}).errors).toEqual([]);
      const { value, errors } = validate(BuscaFake, { id: null, title: null });
      expect(errors).toEqual([]);
      expect(value.id).toBeNull();
    });
  });

  describe('conversão plain → instância (inferType)', () => {
    it('"5" vira 5 em campo com design:type Number', () => {
      const { value, errors } = validate(BuscaFake, { id: '5' });
      expect(errors).toEqual([]);
      expect(value.id).toBe(5);
    });

    it('" 7 " vira 7 (trim, como @Type(() => Number) do legado)', () => {
      const { value, errors } = validate(BuscaFake, { id: ' 7 ' });
      expect(errors).toEqual([]);
      expect(value.id).toBe(7);
    });

    it('número já numérico passa direto', () => {
      expect(validate(BuscaFake, { id: 2 }).value.id).toBe(2);
    });

    it('"5.5" converte, mas falha @IsInt', () => {
      const { value, errors } = validate(BuscaFake, { id: '5.5' });
      expect(value.id).toBe(5.5);
      expect(errors).toEqual([
        { property: 'id', kind: 'isInt', message: 'id must be an integer number' },
      ]);
    });

    it('"-1" converte e falha @Min(1) com a mensagem do padrão', () => {
      const { value, errors } = validate(BuscaFake, { id: '-1' });
      expect(value.id).toBe(-1);
      expect(errors).toEqual([
        { property: 'id', kind: 'min', message: 'id must not be less than 1' },
      ]);
    });

    it('"abc" não converte e falha @Min e @IsInt (como class-validator reporta todos)', () => {
      const { value, errors } = validate(BuscaFake, { id: 'abc' });
      expect(value.id).toBe('abc');
      expect(errors).toEqual([
        { property: 'id', kind: 'min', message: 'id must not be less than 1' },
        { property: 'id', kind: 'isInt', message: 'id must be an integer number' },
      ]);
    });
  });

  describe('whitelist', () => {
    it('campo sem decorator é rejeitado e não é copiado para a instância', () => {
      const { value, errors } = validate(BuscaFake, { id: 1, extra: 'x' });
      expect(errors).toEqual([
        { property: 'extra', kind: 'whitelist', message: 'property extra should not exist' },
      ]);
      expect((value as unknown as Record<string, unknown>).extra).toBeUndefined();
    });

    it('classe sem registro: toda chave do plain é rejeitada', () => {
      const { errors } = validate(SemRegistroFake, { a: 1 });
      expect(errors).toEqual([
        { property: 'a', kind: 'whitelist', message: 'property a should not exist' },
      ]);
    });
  });

  describe('regras formatadas', () => {
    it('@MaxLength usa a mensagem do padrão class-validator', () => {
      const { errors } = validate(CadastroFake, { name: 'ok', bio: 'a'.repeat(281) });
      expect(errors).toEqual([
        {
          property: 'bio',
          kind: 'maxLength',
          message: 'bio must be shorter than or equal to 280 characters',
        },
      ]);
    });

    it('@Matches usa a mensagem do padrão com o pattern', () => {
      const { errors } = validate(CodigoFake, { codigo: '12a' });
      const pattern = /^\d+$/.toString();
      expect(errors).toEqual([
        {
          property: 'codigo',
          kind: 'matches',
          message: `codigo must match ${pattern} regular expression`,
        },
      ]);
    });
  });

  describe('herança', () => {
    it('a filha valida pelas regras herdadas e continua aceitando whitelist dela', () => {
      const { errors } = validate(FilhaDeCadastroFake, { name: '' });
      expect(errors).toEqual([
        { property: 'name', kind: 'isNotEmpty', message: 'name should not be empty' },
      ]);
      expect(validate(FilhaDeCadastroFake, { name: 'ok' }).errors).toEqual([]);
    });
  });
});
