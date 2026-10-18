/**
 * Mini-ORM — DDL de criação a partir dos metadados (T5.5).
 *
 * Gera `CREATE TABLE` do `EntityMeta` (T5.1) com os tipos afins do SQLite:
 * `String`/`Date` → `text`, `Number`/`Boolean` → `integer` (booleans gravam 0/1, T5.2).
 * Chave primária: `PRIMARY KEY [AUTOINCREMENT] NOT NULL`; coluna comum: `NOT NULL` quando
 * não nula, `UNIQUE` quando única e `DEFAULT` quando declarado (literal do DDL — sem parâmetro
 * vinculado, então string é escapada aqui).
 *
 * **Conformidade (T5.5):** comparado com o schema real da migration via `PRAGMA table_info`
 * (nome, tipo, NOT NULL, DEFAULT e pk) — o que o PRAGMA não vê (índices, CHECK, FOREIGN KEY)
 * fica para o T5.7 (relações) e para os índices declarados à parte; `AUTOINCREMENT` é
 * verificado à parte pelo `sqlite_master`.
 *
 * Lido por: testes e, na transição, por quem precisar criar tabela nova com o mini-ORM.
 */
import type { EntityColumnMeta, EntityMeta } from './entity';
import { primaryKeyOf, requireEntityMeta } from './entity';
import type { EntityClass } from './hydrate';
import type { InferredType } from '../reflection/infer-type';

/** Tipo afim do SQLite para cada tipo inferido. */
function sqlType(type: InferredType): string {
  return type === String || type === Date ? 'text' : 'integer';
}

/** Literal do DDL (não há parâmetro vinculado em DDL); string vai com aspas simples escapadas. */
function defaultSql(value: string | number): string {
  return typeof value === 'number' ? String(value) : `'${value.replace(/'/g, "''")}'`;
}

function columnSql(column: EntityColumnMeta): string {
  const parts = [`"${column.name}"`, sqlType(column.type)];
  if (column.primaryKey) {
    parts.push('PRIMARY KEY');
    if (column.autoIncrement) {
      parts.push('AUTOINCREMENT');
    }
    parts.push('NOT NULL');
    return parts.join(' ');
  }
  if (!column.nullable) {
    parts.push('NOT NULL');
  }
  if (column.unique) {
    parts.push('UNIQUE');
  }
  if (column.default !== undefined) {
    parts.push(`DEFAULT ${defaultSql(column.default)}`);
  }
  return parts.join(' ');
}

/** `CREATE TABLE` da entidade decorada, dos metadados; sem `@PrimaryKey`, falha. */
export function createTableSql<T extends object>(entityClass: EntityClass<T>): string {
  const meta: EntityMeta = requireEntityMeta(entityClass);
  if (primaryKeyOf(meta) === undefined) {
    throw new Error(`A entidade "${entityClass.name}" não tem @PrimaryKey.`);
  }
  const lines = meta.columns.map((column) => `  ${columnSql(column)}`);
  return `CREATE TABLE "${meta.table}" (\n${lines.join(',\n')}\n)`;
}
