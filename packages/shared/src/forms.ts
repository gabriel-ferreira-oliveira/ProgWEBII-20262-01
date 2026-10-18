/**
 * Contrato de formulário compartilhado entre API e web (T3.3).
 *
 * Descreve o formulário montado por reflexão no servidor (`describeForm`, T3.2):
 * a API tipa o descritor e o controller de metadados (T3.4); a web tipa o serviço
 * de metadados (T3.6) e o `buildForm` (T3.7). Apenas tipos — nada de runtime.
 */

/** Controle visual do campo (mapeado pelo template do front, T3.8). */
export type FieldControl = 'text' | 'password' | 'number' | 'textarea';

/**
 * Descritor de um campo: UI (`@Field`) + restrições **reais** do motor de validação.
 * `required` é a semântica do servidor: `false` e o motor aceita o campo ausente
 * (com `@IsOptional`); `true` e a ausência falha.
 */
export interface FieldMetadata {
  /** Propriedade do DTO (nome do controle no front). */
  name: string;
  /** Rótulo exibido (o `:` final é do template). */
  label: string;
  /** Controle visual. */
  control: FieldControl;
  /** Posição na UI (menor primeiro). */
  order: number;
  /** Ausente falha no motor (não é `@IsOptional`). */
  required: boolean;
  /** Menor valor aceito (`@Min`), quando declarado. */
  min?: number;
  /** Comprimento máximo do texto (`@MaxLength`), quando declarado. */
  maxLength?: number;
  /** Regex em forma de string (`RegExp.toString()`), quando declarado (`@Matches`). */
  pattern?: string;
}

/** Regra de classe do formulário, com as mensagens efetivas do servidor. */
export interface FormRule {
  kind: 'exactlyOneOf';
  properties: string[];
  missingMessage: string;
  multipleMessage: string;
}

/** Formulário completo: campos (por `order`) + regras de classe. */
export interface FormMetadata {
  fields: FieldMetadata[];
  rules: FormRule[];
}
