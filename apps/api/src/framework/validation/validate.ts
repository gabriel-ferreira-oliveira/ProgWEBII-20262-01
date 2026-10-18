/**
 * Motor de validação próprio — lê as regras do registro (`getValidationRules`,
 * chave `ceviu:validation:rules`, gravadas pelos decorators da T2.1), converte o
 * plain em instância da classe (via `inferType`) e devolve erros estruturados.
 *
 * - Lê: registro de regras das propriedades + `design:type` (só para converter número em string).
 * - Conversão: apenas design:type Number com string numérica (com `trim`, paridade com o
 *   `@Type(() => Number)` do legado); demais tipos passam como estão (paridade com o pipe legado
 *   sem `enableImplicitConversion`).
 * - Whitelist: chave do plain que não está no registro vira erro `property X should not exist`
 *   (paridade com `whitelist/forbidNonWhitelisted`); a instância só recebe propriedades registradas.
 * - Mensagens: padrões do class-validator, para a paridade HTTP da T2.4.
 * - Lido por: pipe global composto (T2.4) e specs da fase; retorna `{ value, errors }` (não lança).
 */
import { inferType } from '../reflection/infer-type';
import { getValidationRules } from './validation-registry';
import type { ValidationRule } from './validation-registry';

/** Erro estruturado de validação: propriedade, regra violada e mensagem pronta (padrão class-validator). */
export interface ValidationIssue {
  property: string;
  kind: ValidationRule['kind'] | 'whitelist';
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

  return { value, errors };
}
