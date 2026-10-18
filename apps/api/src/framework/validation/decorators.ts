/**
 * Decorators de validação — **só gravam** regras no registro (`declareRule`,
 * chave `ceviu:validation:rules`); quem executa é o motor `validate` (T2.2).
 * Assinaturas espelham class-validator para a migração dos DTOs trocar apenas o import (T2.5+).
 *
 * Lidos por: `getValidationRules` (F2 — motor de validação) e `describeForm` (F3 — contrato de formulário).
 */
import { declareRule } from './validation-registry';
import type { ValidationRule } from './validation-registry';

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
