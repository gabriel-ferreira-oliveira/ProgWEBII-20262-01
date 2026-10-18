import { NonNullableFormBuilder, Validators } from '@angular/forms';
import type { FormControl, FormGroup, ValidatorFn } from '@angular/forms';
import type { FieldMetadata } from '@ceviu/shared';

/** Forma delimitada de `RegExp.toString()`: `/fonte/flags` (ex.: `'/^\\d+$/'`, `'/^a$/i'`). */
const DELIMITED = /^\/(.*)\/([a-z]*)$/s;

/**
 * Converte o `pattern` do descritor em `RegExp`.
 * O `Validators.pattern` do Angular **nao** interpreta string delimitada (trata como fonte
 * e embrulha em `^...$`), entao a conversao fica aqui para o descritor seguir JSON-safe
 * (`RegExp.toString()`, T3.2) sem perder flags. String sem barras e tratada como fonte.
 */
function toRegExp(pattern: string): RegExp {
  const match = DELIMITED.exec(pattern);
  return match ? new RegExp(match[1], match[2]) : new RegExp(pattern);
}

/** Validators do campo, na ordem do descritor (required, min, maxLength, pattern). */
function validatorsFor(field: FieldMetadata): ValidatorFn[] {
  const validators: ValidatorFn[] = [];
  if (field.required) {
    validators.push(Validators.required);
  }
  if (field.min !== undefined) {
    validators.push(Validators.min(field.min));
  }
  if (field.maxLength !== undefined) {
    validators.push(Validators.maxLength(field.maxLength));
  }
  if (field.pattern !== undefined) {
    validators.push(Validators.pattern(toRegExp(field.pattern)));
  }
  return validators;
}

/**
 * Monta o `FormGroup` a partir do descritor do formulario (`FieldMetadata[]`, vindo de
 * `GET /api/metadata/:form`): o front deixa de hardcodar a validacao — `required`, `min`,
 * `maxLength` e `pattern` vem das regras reais do servidor (T3.2/T3.4).
 * Todos os controles nascem como `string` (o template decide o input; conversao, como o
 * `Number.parseInt` da idade, fica na tela).
 */
export function buildForm(
  formBuilder: NonNullableFormBuilder,
  fields: FieldMetadata[],
): FormGroup<Record<string, FormControl<string>>> {
  const controls: Record<string, FormControl<string>> = {};
  for (const field of fields) {
    controls[field.name] = formBuilder.control('', validatorsFor(field));
  }
  return formBuilder.group(controls);
}
