/**
 * Decorators de validação — **só gravam** regras no registro (`declareRule`/`declareClassRule`,
 * chaves `ceviu:validation:rules` e `ceviu:validation:class-rules`); quem executa é o motor
 * `validate` (T2.2). Assinaturas espelham class-validator para a migração dos DTOs trocar apenas
 * o import (T2.5+); `ExactlyOneOf` é regra própria de classe.
 *
 * Lidos por: `getValidationRules`/`getClassValidationRules` (F2) e `describeForm` (F3).
 */
import { declareClassRule, declareRule } from './validation-registry';
import type { ClassValidationRule, ValidationRule } from './validation-registry';

function rule(validationRule: ValidationRule): PropertyDecorator {
  return (target, propertyKey) => declareRule(target, propertyKey, validationRule);
}

/** O valor deve ser string. */
export function IsString(): PropertyDecorator {
  return rule({ kind: 'isString' });
}

/** O valor não pode ser vazio (nem string vazia). */
export function IsNotEmpty(): PropertyDecorator {
  return rule({ kind: 'isNotEmpty' });
}

/** Marca a propriedade como opcional: o motor pula as demais regras quando o valor for null/undefined. */
export function IsOptional(): PropertyDecorator {
  return rule({ kind: 'isOptional' });
}

/** O valor deve ser um inteiro. */
export function IsInt(): PropertyDecorator {
  return rule({ kind: 'isInt' });
}

/** O valor numérico deve ser >= `value`. */
export function Min(value: number): PropertyDecorator {
  return rule({ kind: 'min', value });
}

/** O comprimento do texto deve ser <= `value`. */
export function MaxLength(value: number): PropertyDecorator {
  return rule({ kind: 'maxLength', value });
}

/** O texto deve casar com o padrão (paridade com `class-validator.parseMessage`). */
export function Matches(pattern: RegExp): PropertyDecorator {
  return rule({ kind: 'matches', pattern });
}

/** Mensagens por caso da regra `ExactlyOneOf` (ausência de todos × mais de um preenchido). */
export interface ExactlyOneOfMessages {
  missing?: string;
  multiple?: string;
}

/**
 * Regra **de classe**: exatamente uma das propriedades deve estar preenchida.
 * `message` como string vale para os dois casos; como objeto permite mensagens distintas
 * (paridade com as duas mensagens do legado em `search.service.ts:26,29`).
 * Gravada em `ceviu:validation:class-rules`; executada pelo motor após as regras de propriedade.
 */
export function ExactlyOneOf(
  properties: string[],
  message?: string | ExactlyOneOfMessages,
): ClassDecorator {
  const messages =
    typeof message === 'string'
      ? { missingMessage: message, multipleMessage: message }
      : { missingMessage: message?.missing, multipleMessage: message?.multiple };
  const classRule: ClassValidationRule = {
    kind: 'exactlyOneOf',
    properties: [...properties],
    ...messages,
  };
  return (target) => declareClassRule(target, classRule);
}
