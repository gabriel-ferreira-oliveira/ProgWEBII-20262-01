/**
 * Registro de regras de validação por propriedade — gravado pelos decorators (T2.1)
 * e lido pelo motor `validate` (T2.2) e pelo `describeForm` (T3.2).
 *
 * - Grava (`declareRule`): acumula a regra no registro *own* da classe, sob a chave
 *   `ceviu:validation:rules`, no formato `{ propriedade: ValidationRule[] }`.
 * - Lê (`getOwnValidationRules` / `getValidationRules`): own ou mesclado pela cadeia de
 *   herança; na mesclagem (spread de registro, T1.1), a entrada da filha substitui a da
 *   base para a mesma propriedade — herança de regras sem concatenação.
 */
import {
  defineOwnMetadata,
  getMergedMetadata,
  getOwnMetadata,
} from '../reflection/class-metadata';
import type { MetadataTarget } from '../reflection/class-metadata';

/** Uma regra de validação declarada por decorator. Só descreve — quem executa é o motor (T2.2). */
export type ValidationRule =
  | { kind: 'isString' }
  | { kind: 'isNotEmpty' }
  | { kind: 'isOptional' }
  | { kind: 'isInt' }
  | { kind: 'min'; value: number }
  | { kind: 'maxLength'; value: number }
  | { kind: 'matches'; pattern: RegExp };

/** Mapa propriedade → regras declaradas (na ordem de aplicação dos decorators). */
export type ValidationRulesByProperty = Record<PropertyKey, ValidationRule[]>;

const RULES_KEY = 'validation:rules';

/** Cópia do registro own (top-level) para escrita copy-on-write. */
function ownSnapshot(target: MetadataTarget): ValidationRulesByProperty {
  return { ...(getOwnMetadata<ValidationRulesByProperty>(target, RULES_KEY) ?? {}) };
}

/** Acrescenta a regra à propriedade, gravando o registro *own* no construtor da classe. */
export function declareRule(
  target: MetadataTarget,
  property: PropertyKey,
  rule: ValidationRule,
): void {
  const rules = ownSnapshot(target);
  rules[property] = [...(rules[property] ?? []), rule];
  defineOwnMetadata(target, RULES_KEY, rules);
}

/** Regras apenas da própria classe (sem herança), pelo registro gravado em `declareRule`. */
export function getOwnValidationRules(
  target: MetadataTarget,
): ValidationRulesByProperty | undefined {
  return getOwnMetadata<ValidationRulesByProperty>(target, RULES_KEY);
}

/** Regras mescladas pela cadeia de herança, pelo registro gravado em `declareRule`. */
export function getValidationRules(target: MetadataTarget): ValidationRulesByProperty | undefined {
  return getMergedMetadata<ValidationRulesByProperty>(target, RULES_KEY);
}
