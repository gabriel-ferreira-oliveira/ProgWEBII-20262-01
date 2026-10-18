import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from './decorators';
import { getOwnValidationRules, getValidationRules } from './validation-registry';

class LoginDtoFake {
  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

class RegistroDtoFake {
  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;

  @IsOptional()
  @MaxLength(280)
  bio?: string;

  @Matches(/^\d+$/)
  codigo!: string;
}

class BaseFake {
  @IsString()
  nome!: string;

  @IsNotEmpty()
  titulo!: string;
}

class FilhaFake extends BaseFake {
  @MaxLength(10)
  override nome: string = 'sobrescrita-intencional';
}

class SemRegrasFake {}

describe('framework/validation/decorators (T2.1)', () => {
  describe('gravação no registro', () => {
    it('grava a regra na propriedade correta', () => {
      expect(getOwnValidationRules(LoginDtoFake)).toEqual({
        email: [{ kind: 'isNotEmpty' }, { kind: 'isString' }],
        password: [{ kind: 'isNotEmpty' }, { kind: 'isString' }],
      });
    });

    it('acumula decorators na ordem de aplicação (bottom-up, como class-validator)', () => {
      expect(getOwnValidationRules(LoginDtoFake)?.email).toEqual([
        { kind: 'isNotEmpty' },
        { kind: 'isString' },
      ]);
    });

    it('guarda os payloads: Min/MaxLength/Matches', () => {
      expect(getOwnValidationRules(RegistroDtoFake)?.age).toEqual([
        { kind: 'min', value: 0 },
        { kind: 'isInt' },
        { kind: 'isOptional' },
      ]);
      expect(getOwnValidationRules(RegistroDtoFake)?.bio).toEqual([
        { kind: 'maxLength', value: 280 },
        { kind: 'isOptional' },
      ]);
      expect(getOwnValidationRules(RegistroDtoFake)?.codigo).toEqual([
        { kind: 'matches', pattern: /^\d+$/ },
      ]);
    });

    it('grava sob a chave ceviu:validation:rules apenas no construtor (não no protótipo)', () => {
      expect(Reflect.getOwnMetadata('ceviu:validation:rules', LoginDtoFake)).toBeDefined();
      expect(Reflect.getOwnMetadata('ceviu:validation:rules', LoginDtoFake.prototype)).toBeUndefined();
    });

    it('isola classes diferentes', () => {
      expect(getOwnValidationRules(SemRegrasFake)).toBeUndefined();
      expect(getValidationRules(SemRegrasFake)).toBeUndefined();
    });
  });

  describe('leitura e herança', () => {
    it('a filha enxerga as regras da base na leitura mesclada, mas não como próprias', () => {
      expect(getOwnValidationRules(FilhaFake)).toEqual({ nome: [{ kind: 'maxLength', value: 10 }] });
      expect(getValidationRules(FilhaFake)).toEqual({
        nome: [{ kind: 'maxLength', value: 10 }],
        titulo: [{ kind: 'isNotEmpty' }],
      });
    });

    it('redeclarar a propriedade na filha substitui a entrada da base (sem concatenação)', () => {
      expect(getValidationRules(FilhaFake)?.nome).toEqual([{ kind: 'maxLength', value: 10 }]);
    });

    it('aceita instância como alvo da leitura', () => {
      const instancia = new FilhaFake();
      expect(getValidationRules(instancia)).toEqual(getValidationRules(FilhaFake));
    });
  });
});
