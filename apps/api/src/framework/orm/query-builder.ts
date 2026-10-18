/**
 * Mini-ORM — query builder tipado (T5.6).
 *
 * Construído pelo `BaseRepository.query()`: `where(propriedade, operador, valor)` encadeável
 * (AND), `orderBy(propriedade, direção)`, `limit(n)`, `withDeleted()` e os terminais
 * `all()`/`first()`/`count()`. Tudo saído dos metadados (T5.1) com a whitelist do `TableContext`:
 * coluna e operador vêm de listas fechadas; valores **sempre** como parâmetro vinculado;
 * `limit` só aceita inteiro positivo (interpolado com segurança).
 *
 * Contrato de operadores (whitelist): `=`, `<>`, `<`, `>`, `<=`, `>=`, `LIKE`, `IN`, `IS NULL`.
 * `LIKE` sai com `ESCAPE '\'` (quem monta o padrão escapa `\%_` — é o contrato da busca T5.9);
 * `IN` exige lista não vazia; `=`/`<>` com `null` viram `IS NULL`/`IS NOT NULL` (como no
 * `BaseRepository`); demais operadores com `null` falham.
 */
import type { Database, SqlValue } from './database';
import { hydrate } from './hydrate';
import type { TableContext } from './table-context';
import type { EntityColumnMeta } from './entity';

const OPERATORS = ['=', '<>', '<', '>', '<=', '>=', 'LIKE', 'IN', 'IS NULL'] as const;

/** Operadores aceitos pelo `where` (whitelist fechada). */
export type Operator = (typeof OPERATORS)[number];

/** Tipo do valor aceito pelo `where`: escalar (ou `null`) para os binários, lista para o `IN`. */
export type OperatorValue = SqlValue | readonly SqlValue[];

interface Ordering {
  column: EntityColumnMeta;
  direction: 'ASC' | 'DESC';
}

/** Builder encadeável de uma entidade, sobre a conexão do mini-ORM. */
export class QueryBuilder<T extends object> {
  private readonly conditions: string[] = [];
  private readonly params: SqlValue[] = [];
  private readonly orderings: Ordering[] = [];
  private includeDeleted = false;
  private maxRows: number | undefined;

  constructor(
    private readonly database: Database,
    private readonly table: TableContext<T>,
  ) {}

  /** Acrescenta uma condição (AND) com operador da whitelist. */
  where(property: keyof T & string, operator: Operator, value?: OperatorValue): this {
    if (!OPERATORS.includes(operator)) {
      throw new Error(`Operador inválido: "${String(operator)}".`);
    }
    const column = this.table.columnOf(property);

    if (operator === 'IS NULL') {
      this.conditions.push(`${column.name} IS NULL`);
      return this;
    }
    if (operator === 'IN') {
      if (!Array.isArray(value) || value.length === 0) {
        throw new Error('O operador "IN" exige uma lista não vazia.');
      }
      this.conditions.push(`${column.name} IN (${value.map(() => '?').join(', ')})`);
      this.params.push(...value);
      return this;
    }
    if (value === undefined) {
      throw new Error(`O operador "${operator}" exige valor.`);
    }
    if (value === null) {
      if (operator === '=' || operator === '<>') {
        this.conditions.push(`${column.name} ${operator === '=' ? 'IS NULL' : 'IS NOT NULL'}`);
        return this;
      }
      throw new Error(`O operador "${operator}" não aceita null; use "IS NULL".`);
    }
    if (Array.isArray(value)) {
      throw new Error(`O operador "${operator}" não aceita lista; use "IN".`);
    }
    this.conditions.push(`${column.name} ${operator} ?${operator === 'LIKE' ? " ESCAPE '\\'" : ''}`);
    this.params.push(value as SqlValue);
    return this;
  }

  /** Acrescenta um critério de ordenação (ordem das chamadas = ordem do ORDER BY). */
  orderBy(property: keyof T & string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    const column = this.table.columnOf(property);
    if (direction !== 'ASC' && direction !== 'DESC') {
      throw new Error(`Direção de ordenação inválida: "${String(direction)}".`);
    }
    this.orderings.push({ column, direction });
    return this;
  }

  /** Limita o número de linhas (inteiro positivo; `all`/`first`). */
  limit(count: number): this {
    if (!Number.isInteger(count) || count <= 0) {
      throw new Error('O limit precisa ser um inteiro positivo.');
    }
    this.maxRows = count;
    return this;
  }

  /** Inclui soft-deletados (como o `withDeleted()` do TypeORM). */
  withDeleted(): this {
    this.includeDeleted = true;
    return this;
  }

  /** Executa e devolve as instâncias hidratadas. */
  all(): T[] {
    return this.database
      .all(this.selectSql(), this.params)
      .map((row) => hydrate(this.table.entityClass, row));
  }

  /** Executa e devolve a primeira linha (ou `undefined`). */
  first(): T | undefined {
    const row = this.database.get(this.selectSql(), this.params);
    return row === undefined ? undefined : hydrate(this.table.entityClass, row);
  }

  /** Conta as linhas com os filtros atuais (sem ordem/limit). */
  count(): number {
    const row = this.database.get(
      `SELECT COUNT(*) AS total FROM ${this.table.meta.table}${this.whereSql()}`,
      this.params,
    );
    return Number(row?.total ?? 0);
  }

  private selectSql(): string {
    return `SELECT * FROM ${this.table.meta.table}${this.whereSql()}${this.orderSql()}${this.limitSql()}`;
  }

  private whereSql(): string {
    const parts = [...this.conditions];
    if (this.table.deletedColumn !== undefined && !this.includeDeleted) {
      parts.unshift(`${this.table.deletedColumn.name} IS NULL`);
    }
    return parts.length > 0 ? ` WHERE ${parts.join(' AND ')}` : '';
  }

  private orderSql(): string {
    if (this.orderings.length === 0) {
      return '';
    }
    const parts = this.orderings.map(({ column, direction }) => `${column.name} ${direction}`);
    return ` ORDER BY ${parts.join(', ')}`;
  }

  private limitSql(): string {
    return this.maxRows === undefined ? '' : ` LIMIT ${this.maxRows}`;
  }
}
