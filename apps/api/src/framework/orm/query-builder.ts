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
import type { Database, Row, SqlValue } from './database';
import { hydrate } from './hydrate';
import { TableContext } from './table-context';
import type { EntityColumnMeta, EntityRelationMeta } from './entity';

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
  private readonly includes: EntityRelationMeta[] = [];
  private readonly targetContexts = new Map<string, TableContext<object>>();
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

  /**
   * Inclui a relação (whitelist do metadado): `@ManyToOne` vira `LEFT JOIN` com a coluna
   * alienígena; `@OneToMany` vira uma segunda consulta pelos filhos (array vazio quando
   * não há). Sem filhos, a propriedade vira `[]`; sem par no JOIN, `null`.
   */
  include(property: keyof T & string): this {
    const relation = this.table.relationOf(property);
    if (!this.includes.some((included) => included.property === relation.property)) {
      this.includes.push(relation);
    }
    return this;
  }

  /** Executa e devolve as instâncias hidratadas. */
  all(): T[] {
    const instances = this.database
      .all(this.selectSql(), this.params)
      .map((row) => this.hydrateRow(row));
    this.fillOneToMany(instances);
    return instances;
  }

  /** Executa e devolve a primeira linha (ou `undefined`). */
  first(): T | undefined {
    const row = this.database.get(this.selectSql(), this.params);
    if (row === undefined) {
      return undefined;
    }
    const instance = this.hydrateRow(row);
    this.fillOneToMany([instance]);
    return instance;
  }

  /** Conta as linhas com os filtros atuais (sem ordem, limite ou `include`). */
  count(): number {
    const row = this.database.get(
      `SELECT COUNT(*) AS total FROM ${this.table.meta.table}${this.whereSql()}`,
      this.params,
    );
    return Number(row?.total ?? 0);
  }

  private selectSql(): string {
    const selects = [`${this.table.meta.table}.*`];
    const joins: string[] = [];
    for (const relation of this.includes) {
      if (relation.kind !== 'many-to-one') {
        continue;
      }
      const context = this.contextFor(relation);
      const alias = `rel_${relation.property}`;
      joins.push(
        ` LEFT JOIN ${context.meta.table} AS ${alias} ON ${this.table.meta.table}.${relation.column} = ${alias}.${context.primaryKey.name}`,
      );
      for (const column of context.meta.columns) {
        selects.push(`${alias}.${column.name} AS ${relation.property}__${column.name}`);
      }
    }
    return `SELECT ${selects.join(', ')} FROM ${this.table.meta.table}${joins.join('')}${this.whereSql()}${this.orderSql()}${this.limitSql()}`;
  }

  /** Separa a linha principal das colunas prefixadas pelas relações e hidrata tudo. */
  private hydrateRow(row: Row): T {
    const prefixes = this.includes.map((relation) => `${relation.property}__`);
    const mainRow: Row = {};
    for (const [key, value] of Object.entries(row)) {
      if (!prefixes.some((prefix) => key.startsWith(prefix))) {
        mainRow[key] = value;
      }
    }
    const instance = hydrate(this.table.entityClass, mainRow);
    for (const relation of this.includes) {
      if (relation.kind !== 'many-to-one') {
        continue;
      }
      const context = this.contextFor(relation);
      const prefix = `${relation.property}__`;
      const subRow: Row = {};
      for (const [key, value] of Object.entries(row)) {
        if (key.startsWith(prefix)) {
          subRow[key.slice(prefix.length)] = value;
        }
      }
      const empty = context.meta.columns.every(
        (column) => subRow[column.name] === undefined || subRow[column.name] === null,
      );
      (instance as Record<string, unknown>)[relation.property] = empty
        ? null
        : hydrate(context.entityClass, subRow);
    }
    return instance;
  }

  /** Preenche os `@OneToMany` incluídos com uma segunda consulta (filhos por pai). */
  private fillOneToMany(instances: T[]): void {
    for (const relation of this.includes) {
      if (relation.kind !== 'one-to-many') {
        continue;
      }
      const context = this.contextFor(relation);
      const inverse = context.meta.relations.find(
        (candidate) => candidate.kind === 'many-to-one' && candidate.property === relation.inverse,
      );
      if (inverse === undefined || inverse.kind !== 'many-to-one') {
        throw new Error(
          `A relação "${relation.property}" precisa do lado @ManyToOne("${relation.inverse}") em "${context.entityClass.name}".`,
        );
      }
      const pkProperty = this.table.primaryKey.property;
      const ids = [
        ...new Set(
          instances
            .map((instance) => (instance as Record<string, SqlValue>)[pkProperty])
            .filter((id): id is SqlValue => id !== undefined && id !== null),
        ),
      ];
      const grouped = new Map<SqlValue, object[]>();
      if (ids.length > 0) {
        const deletedFilter =
          context.deletedColumn !== undefined && !this.includeDeleted
            ? ` AND ${context.deletedColumn.name} IS NULL`
            : '';
        const rows = this.database.all(
          `SELECT * FROM ${context.meta.table} WHERE ${inverse.column} IN (${ids
            .map(() => '?')
            .join(', ')})${deletedFilter} ORDER BY ${context.primaryKey.name}`,
          ids,
        );
        for (const row of rows) {
          const key = row[inverse.column];
          const children = grouped.get(key) ?? [];
          children.push(hydrate(context.entityClass, row));
          grouped.set(key, children);
        }
      }
      for (const instance of instances) {
        const id = (instance as Record<string, SqlValue>)[pkProperty];
        (instance as Record<string, unknown>)[relation.property] = grouped.get(id) ?? [];
      }
    }
  }

  private contextFor(relation: EntityRelationMeta): TableContext<object> {
    let context = this.targetContexts.get(relation.property);
    if (context === undefined) {
      context = new TableContext(relation.target());
      this.targetContexts.set(relation.property, context);
    }
    return context;
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
