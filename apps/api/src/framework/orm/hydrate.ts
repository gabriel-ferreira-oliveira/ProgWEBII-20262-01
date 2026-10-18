/**
 * Mini-ORM — hidratação e desidratação linha↔instância (T5.2).
 *
 * - `hydrate(Class, row)`: percorre as colunas de `EntityMeta` (T5.1) e só lê as chaves
 *   presentes na linha (chave fora dos metadados é **ignorada**); valores do SQLite viram
 *   instância — `boolean` por 0/1, `Date` de texto ISO, `null` permanece `null`.
 * - `dehydrate(Class, instance)`: escreve as colunas presentes na instância com o nome do
 *   banco (snake↔camel), `boolean` → 0/1, `Date` → texto ISO; propriedade `undefined`
 *   é **omitida** (ausente = deixar o banco decidir; só `null` grava NULL).
 * - Sem metadados de entidade (@Entity e @Column), falha em vez de gravar/ler incerto.
 * - Lido por: `BaseRepository` (T5.4) para devolver instâncias e montar linhas de INSERT/UPDATE.
 */
import { getEntityMeta } from './entity';
import type { EntityMeta } from './entity';
import type { Row } from './database';
import type { InferredType } from '../reflection/infer-type';

/** Construtor de entidade (sem argumentos, como as classes decoradas). */
export type EntityClass<T extends object = object> = new () => T;

function requireMeta(entityClass: EntityClass): EntityMeta {
  const meta = getEntityMeta(entityClass);
  if (!meta) {
    throw new Error(
      `A classe "${entityClass.name}" não tem metadados de entidade (@Entity e @Column).`,
    );
  }
  return meta;
}

/** Valor do banco → valor da propriedade, conforme o tipo da coluna. */
function toProperty(value: unknown, type: InferredType): unknown {
  if (value === null || value === undefined) {
    return null;
  }
  if (type === Boolean) {
    return Boolean(value);
  }
  if (type === Date) {
    return value instanceof Date ? value : new Date(value as string | number);
  }
  return value;
}

/** Valor da propriedade → valor do banco, conforme o tipo da coluna. */
function toRowValue(value: unknown, type: InferredType): string | number | null {
  if (value === null) {
    return null;
  }
  if (type === Boolean) {
    return value ? 1 : 0;
  }
  if (type === Date) {
    return (value as Date).toISOString();
  }
  return value as string | number;
}

/**
 * Monta uma instância de `entityClass` a partir da linha `row` (nomes do banco).
 * Só as colunas presentes na linha são preenchidas; o resto fica `undefined`.
 */
export function hydrate<T extends object>(entityClass: EntityClass<T>, row: Row): T {
  const meta = requireMeta(entityClass);
  const instance = new entityClass();
  const target = instance as Record<string, unknown>;
  for (const column of meta.columns) {
    if (Object.hasOwn(row, column.name)) {
      target[column.property] = toProperty(row[column.name], column.type);
    }
  }
  return instance;
}

/**
 * Monta a linha (nomes do banco) a partir de `instance` — aceita instância completa ou
 * patch parcial: propriedade `undefined` é omitida; `null` grava NULL.
 */
export function dehydrate(entityClass: EntityClass, instance: object): Row {
  const meta = requireMeta(entityClass);
  const source = instance as Record<string, unknown>;
  const row: Row = {};
  for (const column of meta.columns) {
    const value = source[column.property];
    if (value !== undefined) {
      row[column.name] = toRowValue(value, column.type);
    }
  }
  return row;
}
