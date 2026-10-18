/**
 * Mini-ORM — conexão SQLite própria (T5.3).
 *
 * Envelopa o `better-sqlite3` (síncrono) numa API mínima — `run`/`all`/`get`/`transaction` —
 * com valores **sempre como parâmetros vinculados** (arrays posicionais de `?`; nunca interpolação).
 * Só `string`, `number` e `null` trafegam (o schema não usa BLOB nem inteiros fora do seguro).
 *
 * **Coexistência com o TypeORM (risco registrado):** os dois abrem o mesmo arquivo SQLite;
 * na construção ligamos `busy_timeout = 5000` **antes** de `journal_mode = WAL` (o TypeORM também
 * usa WAL via `enableWAL`), o que evita "database is locked" em curtos conflitos de escrita.
 * Riscos que restam: transações longas de um lado bloquearão o outro até o timeout, e WAL
 * não vale para `:memory:` (cada conexão é um banco isolado — é o modo dos testes).
 *
 * Lido por: `MiniOrmModule` (provider Nest) e `BaseRepository` (T5.4).
 */
import BetterSqlite3 from 'better-sqlite3';
import type { Database as SqliteConnection } from 'better-sqlite3';

/** Valor aceito/retornado pelo SQLite neste projeto. */
export type SqlValue = string | number | null;

/** Linha como o banco devolve/aceita: colunas snake_case, valores primitivos. */
export type Row = Record<string, SqlValue>;

/** Resultado de uma escrita: linhas afetadas e id do último INSERT. */
export interface RunResult {
  changes: number;
  lastInsertRowid: number;
}

/** Conexão do mini-ORM: wrapper síncrono do `better-sqlite3`. */
export class Database {
  private readonly connection: SqliteConnection;

  constructor(file: string) {
    this.connection = new BetterSqlite3(file);
    this.connection.pragma('busy_timeout = 5000');
    this.connection.pragma('journal_mode = WAL');
  }

  /** Executa um comando de escrita (INSERT/UPDATE/DELETE/DDL) com parâmetros vinculados. */
  run(sql: string, params: SqlValue[] = []): RunResult {
    const result = this.connection.prepare(sql).run(...params);
    return { changes: result.changes, lastInsertRowid: Number(result.lastInsertRowid) };
  }

  /** Executa um SELECT e devolve todas as linhas. */
  all(sql: string, params: SqlValue[] = []): Row[] {
    return this.connection.prepare(sql).all(...params) as Row[];
  }

  /** Executa um SELECT e devolve a primeira linha (ou `undefined`). */
  get(sql: string, params: SqlValue[] = []): Row | undefined {
    return this.connection.prepare(sql).get(...params) as Row | undefined;
  }

  /**
   * Executa `fn` dentro de uma transação síncrona: confirma no retorno, desfaz se lançar.
   * (O corpo deve ser síncrono, como todo o mini-ORM.)
   */
  transaction<T>(fn: () => T): T {
    return this.connection.transaction(fn)();
  }

  /** Fecha a conexão (shutdown do módulo/tests). */
  close(): void {
    this.connection.close();
  }
}
