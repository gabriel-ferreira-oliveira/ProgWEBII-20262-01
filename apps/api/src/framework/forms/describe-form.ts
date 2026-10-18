/**
 * `describeForm(Class)` — descritor de formulário (T3.2): une o metadado **só de UI**
 * (`getFormFields`, chave `ceviu:form:fields`) às regras de validação de propriedade
 * (`getValidationRules`) e às regras de classe (`getClassValidationRules`).
 *
 * - `required`: o campo tem regras e **nenhuma** `isOptional` — mesma semântica do motor:
 *   ausente só é aceito quando há `isOptional` (por isso o descritor "não pode mentir").
 * - `min`/`maxLength`/`pattern`: primeira regra de cada tipo; `pattern` em forma de string
 *   (`RegExp.toString()`, ex.: `'/^\\d+$/'`) para sobreviver ao JSON do endpoint (T3.4).
 * - `rules`: regras de classe com as mensagens **efetivas** — as do decorator ou os defaults
 *   do motor, via `exactlyOneOfMessages` (fonte única).
 * - Campos ordenados por `order` (empate = ordem de declaração); `undefined` quando não há
 *   campos nem regras (form desconhecido → 404 na T3.4).
 * - Lido por: controller de metadados (T3.4) e front (`buildForm`, T3.7).
 * - Os tipos do descritor (`FieldMetadata`/`FormRule`/`FormMetadata`) vivem em `@ceviu/shared` (T3.3).
 */
import { getFormFields } from './field';
import type { MetadataTarget } from '../reflection/class-metadata';
import { exactlyOneOfMessages } from '../validation/validate';
import { getClassValidationRules, getValidationRules } from '../validation/validation-registry';
import type { ClassValidationRule, ValidationRule } from '../validation/validation-registry';
import type {
  FieldControl,
  FieldMetadata,
  FormMetadata,
  FormRule,
} from '@ceviu/shared';

/** Primeira regra do tipo pedido (determinístico: ordem de aplicação dos decorators). */
function firstRule<K extends ValidationRule['kind']>(
  rules: ValidationRule[],
  kind: K,
): Extract<ValidationRule, { kind: K }> | undefined {
  return rules.find((rule) => rule.kind === kind) as Extract<ValidationRule, { kind: K }> | undefined;
}

function describeField(
  name: string,
  options: { label: string; control: FieldControl; order: number },
  rules: ValidationRule[],
): FieldMetadata {
  const required = rules.length > 0 && !rules.some((rule) => rule.kind === 'isOptional');
  const min = firstRule(rules, 'min');
  const maxLength = firstRule(rules, 'maxLength');
  const pattern = firstRule(rules, 'matches');
  return {
    name,
    label: options.label,
    control: options.control,
    order: options.order,
    required,
    ...(min ? { min: min.value } : {}),
    ...(maxLength ? { maxLength: maxLength.value } : {}),
    ...(pattern ? { pattern: pattern.pattern.toString() } : {}),
  };
}

function describeRule(rule: ClassValidationRule): FormRule {
  return {
    kind: rule.kind,
    properties: [...rule.properties],
    ...exactlyOneOfMessages(rule),
  };
}

/**
 * Descreve o formulário da classe: campos de UI com restrições reais + regras de classe.
 * Devolve `undefined` quando a classe não tem nem `@Field` nem regra de classe.
 */
export function describeForm(target: MetadataTarget): FormMetadata | undefined {
  const formFields = getFormFields(target);
  const classRules = getClassValidationRules(target);
  if (formFields === undefined && classRules === undefined) {
    return undefined;
  }

  const rules = getValidationRules(target) ?? {};
  const fields = Object.entries(formFields ?? {})
    .map(([name, options]) => describeField(name, options, rules[name] ?? []))
    .sort((a, b) => a.order - b.order);
  const describedRules = (classRules ?? []).map(describeRule);

  if (fields.length === 0 && describedRules.length === 0) {
    return undefined;
  }
  return { fields, rules: describedRules };
}
