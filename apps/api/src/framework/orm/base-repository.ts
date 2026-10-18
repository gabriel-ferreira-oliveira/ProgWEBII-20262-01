/**
 * Mini-ORM — repositório genérico por metadados (T5.4).
 *
 * Gera todo o SQL a partir do `EntityMeta` (T5.1): nomes de tabela/coluna **nunca** vêm de fora —
 * propriedades citadas por quem chama passam pela whitelist de colunas (`columnOf`), valores
 * sempre vão como parâmetro vinculado. Sem transações próprias: quem compõe várias escritas
 * atômicas usa `Database.transaction` (T5.3) por fora.
 *
 * Semelhanças deliberadas com o `Repository` do TypeORM (paridade para a migração T5.9.x):
 * - find esconde linhas com `deleted_at` preenchido quando a entidade tem a coluna;
 *   `withDeleted: true` inclui (é o `withDeleted()` do TypeORM).
 * - `delete` é **soft** quando existe `deleted_at` (grava o ISO de agora) e **físico** quando
 *   não existe (tabelas de histórico/favoritos).
 * - `insert` preenche `created_at` ausente com o ISO de agora (equivalente ao `@CreateDateColumn`);
 *   `update` ignora a chave primária no SET; `increment` soma no banco.
 */
import type { Database, Row, SqlValue } from './database';
import { dehydrate, hydrate } from './hydrate';
import type { EntityClass } from './hydrate';
import { TableContext } from './table-context';
import { QueryBuilder } from './query-builder';

/** Mapa de igualdades por propriedade; `null` vira `IS NULL`. */
export type WhereMap<T extends object> = { [K in keyof T & string]?: SqlValue };

/** Opções de leitura: filtro, ordem (na ordem das chaves) e incluir soft-deletados. */
export interface FindAllOptions<T extends object> {
  where?: WhereMap<T>;
  order?: { [K in keyof T & string]?: 'ASC' | 'DESC' };
  withDeleted?: boolean;
}

/** Operações de leitura aceitas pelo `count`. */
export type CountOptions<T extends object> = Pick<FindAllOptions<T>, 'where' | 'withDeleted'>;

/** Repositório tipado de uma entidade decorada, sobre a conexão do mini-ORM. */
export class BaseRepository<T extends object> {
  private readonly table: TableContext<T>;

  constructor(
    private readonly database: Database,
    entityClass: EntityClass<T>,
  ) {
    this.table = new TableContext(entityClass);
  }

  /** Query builder encadeável (T5.6) para filtros/ordem/limite que o `findAll` não cobre. */
  query(): QueryBuilder<T> {
    return new QueryBuilder(this.database, this.table);
  }

  /** Busca pela chave primária; por padrão esconde soft-deletados (`withDeleted` inclui). */
  findById(id: SqlValue, options: { withDeleted?: boolean } = {}): T | undefined {
    const { sql, params } = this.conditions(
      { [this.table.primaryKey.property]: id } as WhereMap<T>,
      options.withDeleted ?? false,
    );
    const row = this.database.get(`SELECT * FROM ${this.table.meta.table}${sql}`, params);
    return row === undefined ? undefined : hydrate(this.table.entityClass, row);
  }

  /** Lista com filtro/ordem (ordem das chaves = ordem do ORDER BY); esconde soft-deletados. */
  findAll(options: FindAllOptions<T> = {}): T[] {
    const where = this.conditions(options.where, options.withDeleted ?? false);
    const rows = this.database.all(
      `SELECT * FROM ${this.table.meta.table}${where.sql}${this.orderClause(options.order)}`,
      where.params,
    );
    return rows.map((row) => hydrate(this.table.entityClass, row));
  }

  /** Conta as linhas com o mesmo filtro/soft-delete padrão do `findAll`. */
  count(options: CountOptions<T> = {}): number {
    const where = this.conditions(options.where, options.withDeleted ?? false);
    const row = this.database.get(
      `SELECT COUNT(*) AS total FROM ${this.table.meta.table}${where.sql}`,
      where.params,
    );
    return Number(row?.total ?? 0);
  }

  /**
   * Insere a instância (colunas presentes; `undefined` fica de fora e vale o default do banco).
   * Preenche `created_at` ausente e, com `@PrimaryKey({autoIncrement})`, devolve o id gerado
   * na própria instância.
   */
  insert(entity: T): T {
    const row = dehydrate(this.table.entityClass, entity);
    this.fillCreatedAt(entity, row);
    const columns = Object.keys(row);
    const result =
      columns.length === 0
        ? this.database.run(`INSERT INTO ${this.table.meta.table} DEFAULT VALUES`)
        : this.database.run(
            `INSERT INTO ${this.table.meta.table} (${columns.join(', ')}) VALUES (${columns
              .map(() => '?')
              .join(', ')})`,
            Object.values(row),
          );
    if (this.table.primaryKey.autoIncrement && row[this.table.primaryKey.name] === undefined) {
      (entity as Record<string, unknown>)[this.table.primaryKey.property] = result.lastInsertRowid;
    }
    return entity;
  }

  /** Atualiza as colunas do patch (chave primária fica de fora); devolve se afetou linha. */
  update(id: SqlValue, patch: Partial<T>): boolean {
    for (const property of Object.keys(patch)) {
      this.table.columnOf(property);
    }
    const row = dehydrate(this.table.entityClass, patch);
    const columns = Object.keys(row).filter((name) => name !== this.table.primaryKey.name);
    if (columns.length === 0) {
      return false;
    }
    const result = this.database.run(
      `UPDATE ${this.table.meta.table} SET ${columns.map((name) => `${name} = ?`).join(', ')} WHERE ${this.table.primaryKey.name} = ?`,
      [...columns.map((name) => row[name]), id],
    );
    return result.changes > 0;
  }

  /** Soft delete quando a entidade tem `deleted_at` (só se ainda não deletada); senão apaga. */
  delete(id: SqlValue): boolean {
    const result = this.table.deletedColumn
      ? this.database.run(
          `UPDATE ${this.table.meta.table} SET ${this.table.deletedColumn.name} = ? WHERE ${this.table.primaryKey.name} = ? AND ${this.table.deletedColumn.name} IS NULL`,
          [new Date().toISOString(), id],
        )
      : this.database.run(
          `DELETE FROM ${this.table.meta.table} WHERE ${this.table.primaryKey.name} = ?`,
          [id],
        );
    return result.changes > 0;
  }

  /** Soma `amount` na coluna da propriedade, no banco; devolve se afetou linha. */
  increment(id: SqlValue, property: keyof T & string, amount: number): boolean {
    const column = this.table.columnOf(property);
    const result = this.database.run(
      `UPDATE ${this.table.meta.table} SET ${column.name} = ${column.name} + ? WHERE ${this.table.primaryKey.name} = ?`,
      [amount, id],
    );
    return result.changes > 0;
  }

  /** WHERE a partir do mapa + filtro padrão de soft delete (sempre com parâmetros). */
  private conditions(where: WhereMap<T> | undefined, withDeleted: boolean) {
    const parts: string[] = [];
    const params: SqlValue[] = [];
    if (this.table.deletedColumn !== undefined && !withDeleted) {
      parts.push(`${this.table.deletedColumn.name} IS NULL`);
    }
    const entries = Object.entries(where ?? {}) as [string, SqlValue | undefined][];
    for (const [property, value] of entries) {
      if (value === undefined) {
        continue;
      }
      const column = this.table.columnOf(property);
      if (value === null) {
        parts.push(`${column.name} IS NULL`);
      } else {
        parts.push(`${column.name} = ?`);
        params.push(value);
      }
    }
    return { sql: parts.length > 0 ? ` WHERE ${parts.join(' AND ')}` : '', params };
  }

  private orderClause(order: FindAllOptions<T>['order']): string {
    const parts: string[] = [];
    for (const [property, direction] of Object.entries(order ?? {})) {
      if (direction === undefined) {
        continue;
      }
      if (direction !== 'ASC' && direction !== 'DESC') {
        throw new Error(`Direção de ordenação inválida: "${String(direction)}".`);
      }
      parts.push(`${this.table.columnOf(property).name} ${direction}`);
    }
    return parts.length > 0 ? ` ORDER BY ${parts.join(', ')}` : '';
  }

  /** Equivalente ao `@CreateDateColumn`: `created_at` ausente recebe o ISO de agora. */
  private fillCreatedAt(entity: T, row: Row): void {
    const column = this.table.meta.columns.find((candidate) => candidate.name === 'created_at');
    if (column === undefined || row[column.name] !== undefined) {
      return;
    }
    const now = new Date().toISOString();
    row[column.name] = now;
    (entity as Record<string, unknown>)[column.property] = now;
  }
}
