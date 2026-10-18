/**
 * Motor de validação próprio — lê as regras do registro (`getValidationRules` e
 * `getClassValidationRules`, chaves `ceviu:validation:rules`/`ceviu:validation:class-rules`,
 * gravadas pelos decorators da T2.1/T2.3), converte o plain em instância da classe (via
 * `inferType`) e devolve erros estruturados.
 *
 * - Lê: registro de regras das propriedades e de classe + `design:type` (só para converter número em string).
 * - Conversão: apenas design:type Number com string numérica (com `trim`, paridade com o
 *   `@Type(() => Number)` do legado); demais tipos passam como estão (paridade com o pipe legado
 *   sem `enableImplicitConversion`).
 * - Whitelist: chave do plain que não está no registro vira erro `property X should not exist`
 *   (paridade com `whitelist/forbidNonWhitelisted`); a instância só recebe propriedades registradas.
 * - Regras de classe (ex.: `exactlyOneOf`): executadas no fim, sobre a presença bruta no plain
 *   (string vazia conta como ausente — paridade com `search.service.ts:22`).
 * - Mensagens: padrões do class-validator, para a paridade HTTP da T2.4.
 * - Lido por: pipe global composto (T2.4) e specs da fase; retorna `{ value, errors }` (não lança).
 */
import { inferType } from '../reflection/infer-type';
import { getClassValidationRules, getValidationRules } from './validation-registry';
import type { ClassValidationRule, ValidationRule } from './validation-registry';

/** Erro estruturado de validação: propriedade(s), regra violada e mensagem pronta (padrão class-validator). */
export interface ValidationIssue {
  property: string;
  kind: ValidationRule['kind'] | ClassValidationRule['kind'] | 'whitelist';
  message: string;
}

export interface ValidateResult<T> {
  /** Instância da classe com os valores convertidos (só propriedades registradas; melhor esforço mesmo com erros). */
  value: T;
  errors: ValidationIssue[];
}

/** Aceita só dígitos com sinal/decimal (`-3`, `5`, `5.5`) — evita `Number('')` → 0 e `Number('1e3')`. */
const NUMERIC = /^-?\d+(\.\d+)?$/;

/** Conversão do plain para o tipo inferido. Hoje só Number (query string); demais tipos passam como estão. */
function coerce(value: unknown, propertyType: ReturnType<typeof inferType>): unknown {
  if (propertyType === Number && typeof value === 'string') {
    const trimmed = value.trim();
    if (NUMERIC.test(trimmed)) {
      return Number(trimmed);
    }
  }
  return value;
}

/** Avalia a regra contra o valor convertido (semântica dos validators do class-validator). */
function violates(rule: ValidationRule, value: unknown): boolean {
  switch (rule.kind) {
    case 'isOptional':
      return false;
    case 'isString':
      return typeof value !== 'string';
    case 'isNotEmpty':
      return value === '' || value === null || value === undefined;
    case 'isInt':
      return !Number.isInteger(value);
    case 'min':
      return typeof value !== 'number' || value < rule.value;
    case 'maxLength':
      return typeof value !== 'string' || value.length > rule.value;
    case 'matches':
      return typeof value !== 'string' || !rule.pattern.test(value);
  }
}

/** Mensagens padrão do class-validator ($property interpolado). */
function messageFor(rule: ValidationRule, property: string): string {
  switch (rule.kind) {
    case 'isOptional':
      return '';
    case 'isString':
      return `${property} must be a string`;
    case 'isNotEmpty':
      return `${property} should not be empty`;
    case 'isInt':
      return `${property} must be an integer number`;
    case 'min':
      return `${property} must not be less than ${rule.value}`;
    case 'maxLength':
      return `${property} must be shorter than or equal to ${rule.value} characters`;
    case 'matches':
      return `${property} must match ${rule.pattern.toString()} regular expression`;
  }
}

/**
 * Mensagens efetivas da regra `exactlyOneOf` (as do decorator ou os defaults do motor).
 * Fonte única usada pelo próprio motor e pelo `describeForm` (T3.2), para o descritor não divergir.
 */
export function exactlyOneOfMessages(
  rule: ClassValidationRule,
): { missingMessage: string; multipleMessage: string } {
  const list = rule.properties.join(', ');
  return {
    missingMessage: rule.missingMessage ?? `one of [${list}] must be provided`,
    multipleMessage: rule.multipleMessage ?? `only one of [${list}] may be provided`,
  };
}

/**
 * Valida `plain` contra as regras registradas de `Class`;
 * devolve a instância convertida e a lista de erros (vazia = válido).
 */
export function validate<T extends object>(
  Class: new () => T,
  plain: Record<string, unknown>,
): ValidateResult<T> {
  const rules = getValidationRules(Class) ?? {};
  const value = new Class();
  const errors: ValidationIssue[] = [];

  for (const property of Object.keys(rules)) {
    const propertyRules = rules[property] ?? [];
    const present = Object.hasOwn(plain, property);
    const converted = coerce(present ? plain[property] : undefined, inferType(Class, property));
    if (present) {
      (value as Record<string, unknown>)[property] = converted;
    }
    const optional = propertyRules.some((rule) => rule.kind === 'isOptional');
    if (optional && (converted === null || converted === undefined)) {
      continue;
    }
    for (const rule of propertyRules) {
      if (violates(rule, converted)) {
        errors.push({ property, kind: rule.kind, message: messageFor(rule, property) });
      }
    }
  }

  for (const property of Object.keys(plain)) {
    if (!Object.hasOwn(rules, property)) {
      errors.push({
        property,
        kind: 'whitelist',
        message: `property ${property} should not exist`,
      });
    }
  }

  for (const classRule of getClassValidationRules(Class) ?? []) {
    if (classRule.kind === 'exactlyOneOf') {
      const target = classRule.properties.join(',');
      const provided = classRule.properties.filter((property) => isProvided(plain[property]));
      const messages = exactlyOneOfMessages(classRule);
      if (provided.length === 0) {
        errors.push({ property: target, kind: 'exactlyOneOf', message: messages.missingMessage });
      } else if (provided.length > 1) {
        errors.push({ property: target, kind: 'exactlyOneOf', message: messages.multipleMessage });
      }
    }
  }

  return { value, errors };
}

/** Presente para a regra de classe: definido, não nulo e não string vazia (paridade `search.service.ts:22`). */
function isProvided(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}
