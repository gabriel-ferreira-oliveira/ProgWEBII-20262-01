/**
 * Registro de metadados por classe — núcleo de reflexão (T1.1).
 *
 * - Grava (`defineOwnMetadata`): metadado *own* no construtor da classe alvo via
 *   `Reflect.defineMetadata`, sob a chave prefixada `ceviu:<key>`. Protótipo ou instância
 *   passados como alvo são normalizados para o construtor (nunca se escreve no protótipo compartilhado).
 * - Lê (`getOwnMetadata` / `getMergedMetadata`): a leitura mesclada percorre a cadeia de construtores
 *   (raiz → alvo) e combina os valores — registros por spread (o descendente vence chave a chave),
 *   arrays por concatenação (ancestral primeiro) e os demais tipos substituídos pelo descendente.
 * - Lido por: decorators da validação própria (F2), `describeForm` (F3) e o mini-ORM (F5).
 */
import 'reflect-metadata';

/** Prefixo das chaves gravadas, para não colidir com TypeORM/Nest/Swagger. */
const KEY_PREFIX = 'ceviu:';

/** Alvo aceito pelas funções: a classe, seu protótipo ou uma instância. */
export type MetadataTarget = Function | object;

/** Combina o valor acumulado dos ancestrais (`parent`) com o valor own do nível atual (`own`). */
export type MergeFn<T> = (parent: T | undefined, own: T) => T;

function toClass(target: MetadataTarget): Function {
  return typeof target === 'function' ? target : (target as { constructor: Function }).constructor;
}

/** Cadeia de construtores do mais ancestral até o alvo (ordem de mesclagem). */
function classChain(ctor: Function): Function[] {
  const chain: Function[] = [];
  let current: unknown = ctor;
  while (typeof current === 'function' && current !== Function.prototype) {
    chain.unshift(current);
    current = Object.getPrototypeOf(current) as unknown;
  }
  return chain;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Cópia de contêineres para a leitura mesclada não vazar a referência gravada. */
function cloneContainer<T>(value: T): T {
  if (Array.isArray(value)) {
    return [...value] as unknown as T;
  }
  if (isRecord(value)) {
    return { ...value } as unknown as T;
  }
  return value;
}

/** Mescla padrão da leitura encadeada. */
function mergeChainValues<T>(parent: T | undefined, own: T): T {
  if (parent === undefined) {
    return own;
  }
  if (Array.isArray(parent) && Array.isArray(own)) {
    return [...parent, ...own] as unknown as T;
  }
  if (isRecord(parent) && isRecord(own)) {
    return { ...parent, ...own } as unknown as T;
  }
  return own;
}

/**
 * Grava o metadado *own* da classe (chave `ceviu:<key>`), substituindo o valor anterior da mesma chave.
 * Não afeta ancestrais nem irmãs. Lido por `getOwnMetadata`/`getMergedMetadata`.
 */
export function defineOwnMetadata<T>(target: MetadataTarget, key: string, value: T): void {
  Reflect.defineMetadata(KEY_PREFIX + key, value, toClass(target));
}

/** Lê apenas o valor *own* da classe (sem herança). Gravado por `defineOwnMetadata`. */
export function getOwnMetadata<T>(target: MetadataTarget, key: string): T | undefined {
  return Reflect.getOwnMetadata(KEY_PREFIX + key, toClass(target)) as T | undefined;
}

/**
 * Lê o valor mesclado de toda a cadeia de herança (raiz → alvo) sob a chave `ceviu:<key>`.
 * Contêineres retornados são cópias; `merge` permite trocar a estratégia padrão.
 */
export function getMergedMetadata<T>(
  target: MetadataTarget,
  key: string,
  merge: MergeFn<T> = mergeChainValues,
): T | undefined {
  let merged: T | undefined;
  for (const ctor of classChain(toClass(target))) {
    const own = Reflect.getOwnMetadata(KEY_PREFIX + key, ctor) as T | undefined;
    if (own !== undefined) {
      merged = merged === undefined ? cloneContainer(own) : merge(merged, own);
    }
  }
  return merged;
}
