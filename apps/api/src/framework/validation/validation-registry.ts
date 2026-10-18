/**
 * Registro de regras de validação por propriedade — gravado pelos decorators (T2.1)
 * e lido pelo motor `validate` (T2.2) e pelo `describeForm` (T3.2).
 *
 * - Grava (`declareRule`): acumula a regra no registro *own* da classe, sob a chave
 *   `ceviu:validation:rules`, no formato `{ propriedade: ValidationRule[] }`.
 * - Grava (`declareClassRule`): regras **de classe** (ex.: `exactlyOneOf`), sob
 *   `ceviu:validation:class-rules`, no formato `ClassValidationRule[]`.
 * - Lê (`getOwnValidationRules` / `getValidationRules` / `getClassValidationRules`): own ou
 *   mesclado pela cadeia de herança; em `validation:rules` a entrada da filha substitui a da
 *   base para a mesma propriedade (spread de registro, T1.1); em `class-rules` os arrays são
 *   concatenados base → filha (ambas as regras valem).
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

/** Regra que vale para a classe inteira (não por propriedade), executada pelo motor. */
export type ClassValidationRule = {
  kind: 'exactlyOneOf';
  properties: string[];
  missingMessage?: string;
  multipleMessage?: string;
};

/** Mapa propriedade → regras declaradas (na ordem de aplicação dos decorators). */
export type ValidationRulesByProperty = Record<PropertyKey, ValidationRule[]>;

const RULES_KEY = 'validation:rules';
const CLASS_RULES_KEY = 'validation:class-rules';

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

/** Acrescenta a regra **de classe** ao registro *own* (`ceviu:validation:class-rules`). */
export function declareClassRule(target: MetadataTarget, rule: ClassValidationRule): void {
  const rules = [...(getOwnMetadata<ClassValidationRule[]>(target, CLASS_RULES_KEY) ?? []), rule];
  defineOwnMetadata(target, CLASS_RULES_KEY, rules);
}

/** Regras de classe mescladas pela cadeia de herança (arrays concatenados base → filha). */
export function getClassValidationRules(
  target: MetadataTarget,
): ClassValidationRule[] | undefined {
  return getMergedMetadata<ClassValidationRule[]>(target, CLASS_RULES_KEY);
}
