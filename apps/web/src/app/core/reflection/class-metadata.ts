/**
 * Store de metadados de classe do front — espelho do
 * `apps/api/src/framework/reflection/class-metadata.ts` da API: os decorators
 * gravam sob chaves `ceviu:*` e os consumidores leem em runtime sem conhecer a classe.
 */
const METADADOS = new WeakMap<object, Map<string, unknown>>();

/** Grava um metadado sob a chave `ceviu:*` (chamado pelos decorators). */
export function defineMetadata(target: object, key: string, value: unknown): void {
  const existentes = METADADOS.get(target);
  if (existentes === undefined) {
    METADADOS.set(target, new Map([[key, value]]));
    return;
  }
  existentes.set(key, value);
}

/** Le o metadado da chave; `undefined` quando a classe nao foi decorada com ela. */
export function getMetadata(target: object, key: string): unknown {
  return METADADOS.get(target)?.get(key);
}
