/**
 * Campos de formulário — metadado **só de UI** (T3.1).
 *
 * - Grava (`declareField`): metadado *own* no construtor da classe, sob a chave
 *   `ceviu:form:fields`, no formato `{ propriedade: FieldOptions }`.
 * - Lê (`getOwnFormFields` / `getFormFields`): own ou mesclado pela cadeia de herança (T1.1);
 *   a entrada da filha substitui a da base para a mesma propriedade.
 * - Lido por: `describeForm` (T3.2), controller de metadados (T3.4) e template do front (T3.8).
 *
 * Não guarda regras: `required`/`min`/`maxLength`/`pattern` **nunca** vêm do `@Field` —
 * vêm das regras de validação (`getValidationRules`), combinadas pelo `describeForm`.
 */
import {
  defineOwnMetadata,
  getMergedMetadata,
  getOwnMetadata,
} from '../reflection/class-metadata';
import type { MetadataTarget } from '../reflection/class-metadata';
import type { FieldControl } from '@ceviu/shared';

/** **Opções do decorator** (só de UI). O descritor de campo do `describeForm` é `FieldMetadata` (@ceviu/shared). */
export interface FieldOptions {
  /** Rótulo exibido (o `:` final é do template, T3.8). */
  label: string;
  /** Controle visual. */
  control: FieldControl;
  /** Posição na UI (menor primeiro). */
  order: number;
}

/** Mapa propriedade → opções de UI (na ordem de declaração dos campos). */
export type FormFieldsByProperty = Record<PropertyKey, FieldOptions>;

const FIELDS_KEY = 'form:fields';

/** Cópia do registro own (top-level) para escrita copy-on-write. */
function ownSnapshot(target: MetadataTarget): FormFieldsByProperty {
  return { ...(getOwnMetadata<FormFieldsByProperty>(target, FIELDS_KEY) ?? {}) };
}

/** Grava as opções de UI da propriedade no registro *own* do construtor (cópia defensiva). */
export function declareField(
  target: MetadataTarget,
  property: PropertyKey,
  options: FieldOptions,
): void {
  const fields = ownSnapshot(target);
  fields[property] = { ...options };
  defineOwnMetadata(target, FIELDS_KEY, fields);
}

/** Campos apenas da própria classe (sem herança). Gravado por `declareField`. */
export function getOwnFormFields(target: MetadataTarget): FormFieldsByProperty | undefined {
  return getOwnMetadata<FormFieldsByProperty>(target, FIELDS_KEY);
}

/** Campos mesclados pela cadeia de herança (entrada da filha substitui a da base). */
export function getFormFields(target: MetadataTarget): FormFieldsByProperty | undefined {
  return getMergedMetadata<FormFieldsByProperty>(target, FIELDS_KEY);
}

/**
 * Marca a propriedade como campo de formulário — **só de UI**: grava `{label, control, order}`
 * em `ceviu:form:fields` e não declara regra alguma. Lido por `getFormFields`/`getOwnFormFields`.
 */
export function Field(options: FieldOptions): PropertyDecorator {
  return (target, propertyKey) => declareField(target, propertyKey, options);
}
