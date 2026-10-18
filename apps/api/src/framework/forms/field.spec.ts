import { Field } from './field';
import { getFormFields, getOwnFormFields } from './field';
import { IsString, MaxLength } from '../validation/decorators';
import { getValidationRules } from '../validation/validation-registry';

class RegistroFake {
  @Field({ label: 'Nome', control: 'text', order: 1 })
  nome!: string;

  @Field({ label: 'Email', control: 'text', order: 2 })
  email!: string;

  @Field({ label: 'Senha', control: 'password', order: 3 })
  senha!: string;
}

class BaseFake {
  @Field({ label: 'Nome', control: 'text', order: 1 })
  nome!: string;

  @Field({ label: 'Apelido', control: 'text', order: 2 })
  apelido!: string;
}

class FilhaFake extends BaseFake {
  @Field({ label: 'Nome completo', control: 'text', order: 1 })
  override nome: string = '';
}

class SemCamposFake {}

const opcoesMutaveis = { label: 'Original', control: 'text' as const, order: 1 };

class MutavelFake {
  @Field(opcoesMutaveis)
  nome!: string;
}

class SoValidacaoFake {
  @Field({ label: 'Nome', control: 'text', order: 1 })
  @IsString()
  @MaxLength(80)
  nome!: string;
}

describe('framework/forms/field (T3.1)', () => {
  describe('gravação no registro', () => {
    it('grava o metadado own no construtor, sob a chave ceviu:form:fields', () => {
      expect(Reflect.getOwnMetadata('ceviu:form:fields', RegistroFake)).toBeDefined();
      expect(Reflect.getOwnMetadata('ceviu:form:fields', RegistroFake.prototype)).toBeUndefined();
    });

    it('guarda label/control/order por propriedade, na ordem de declaração', () => {
      expect(getOwnFormFields(RegistroFake)).toEqual({
        nome: { label: 'Nome', control: 'text', order: 1 },
        email: { label: 'Email', control: 'text', order: 2 },
        senha: { label: 'Senha', control: 'password', order: 3 },
      });
      expect(Object.keys(getOwnFormFields(RegistroFake) ?? {})).toEqual(['nome', 'email', 'senha']);
    });

    it('o metadado guarda apenas dados de UI (label, control, order)', () => {
      const metadado = getOwnFormFields(RegistroFake)?.nome ?? {};
      expect(Object.keys(metadado).sort()).toEqual(['control', 'label', 'order']);
    });

    it('copia a entrada: mudar o objeto passado depois do decorator não altera o registro', () => {
      opcoesMutaveis.label = 'Alterado';
      expect(getOwnFormFields(MutavelFake)?.nome?.label).toBe('Original');
    });

    it('isola classes diferentes', () => {
      expect(getOwnFormFields(SemCamposFake)).toBeUndefined();
      expect(getFormFields(SemCamposFake)).toBeUndefined();
    });
  });

  describe('leitura e herança', () => {
    it('a filha enxerga os campos da base na leitura mesclada, mas não como próprios', () => {
      expect(getOwnFormFields(FilhaFake)).toEqual({
        nome: { label: 'Nome completo', control: 'text', order: 1 },
      });
      expect(getFormFields(FilhaFake)).toEqual({
        nome: { label: 'Nome completo', control: 'text', order: 1 },
        apelido: { label: 'Apelido', control: 'text', order: 2 },
      });
    });

    it('aceita protótipo e instância como alvo da leitura', () => {
      expect(getFormFields(BaseFake.prototype)).toEqual(getFormFields(BaseFake));
      expect(getFormFields(new FilhaFake())).toEqual(getFormFields(FilhaFake));
    });
  });

  describe('só de UI (não interfere na validação)', () => {
    it('@Field não acrescenta nem altera regras de validação', () => {
      expect(getValidationRules(SoValidacaoFake)).toEqual({
        nome: [{ kind: 'maxLength', value: 80 }, { kind: 'isString' }],
      });
      expect(getOwnFormFields(SoValidacaoFake)).toEqual({
        nome: { label: 'Nome', control: 'text', order: 1 },
      });
    });
  });
});
