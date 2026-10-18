/**
 * Inferência de tipo a partir do metadado `design:type` emitido pelo TypeScript
 * (`emitDecoratorMetadata`) em propriedades decoradas.
 *
 * - Lê (`inferType`): `Reflect.getMetadata('design:type', alvo, chave)`, com o alvo normalizado
 *   para o protótipo (aceita construtor, protótipo ou instância — a instância resolve pela cadeia).
 *   Apenas String, Number, Boolean e Date são considerados tipos inferidos.
 * - Limitações do emissor (caracterizadas em `infer-type.spec.ts`): uniões e `| null`/`| undefined`
 *   explícitos degradam para `Object`; `string[]` vira `Array`; classe importada via `import type`
 *   vira `Function`; propriedade sem decorator não recebe metadado. Nesses casos vale o `override`.
 * - Lido por: motor de validação (F2 — conversão plain→instância, ex.: "5" → 5 na query string)
 *   e mini-ORM (F5 — tipo da coluna no `createTableSql`).
 */
import 'reflect-metadata';
import type { MetadataTarget } from './class-metadata';

/** Os únicos tipos que o registro trata como inferidos de `design:type`. */
export type InferredType = StringConstructor | NumberConstructor | BooleanConstructor | DateConstructor;

function isInferredType(value: unknown): value is InferredType {
  return value === String || value === Number || value === Boolean || value === Date;
}

/**
 * Infere o tipo da propriedade `key` da classe alvo pelo metadado `design:type`.
 * Quando o metadado não é um dos quatro tipos suportados (Object, Array, Function, ausente…),
 * devolve o `override` (fallback explícito de quem conhece o tipo real).
 */
export function inferType(
  target: MetadataTarget,
  key: string,
  override?: InferredType,
): InferredType | undefined {
  const holder: object = typeof target === 'function' ? (target.prototype as object) : target;
  const designType: unknown = Reflect.getMetadata('design:type', holder, key);
  return isInferredType(designType) ? designType : override;
}
