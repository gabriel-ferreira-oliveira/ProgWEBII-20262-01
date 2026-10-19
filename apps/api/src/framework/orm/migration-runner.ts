/**
 * Mini-ORM — runner mínimo de migrations SQL (T5.11).
 *
 * Substitui o `migrationsRun: true` do TypeORM: lê/aplica as migrations SQL do projeto e mantém
 * a tabela `migrations` no **mesmo formato do TypeORM** (`timestamp` + `name`, ex.:
 * `1730000000000` / `InitialSchema1730000000000`). Assim um banco já migrado pelo TypeORM é
 * reconhecido como migrado (e vice-versa) durante a coexistência até a T5.12.
 *
 * Cada migration roda num commit próprio (DDL + registro juntos): se falhar no meio, o rollback
 * desfaz as tabelas criadas e o registro. A tabela `migrations` é criada com `IF NOT EXISTS`
 * (idempotente com a que o TypeORM cria).
 */
import type { Database } from './database';

/** Migration SQL pura: os comandos que o mini-ORM executa (e o TypeORM legado replica até a T5.12). */
export interface OrmMigration {
  readonly name: string;
  readonly timestamp: number;
  readonly up: readonly string[];
  readonly down: readonly string[];
}

export class MigrationRunner {
  constructor(private readonly database: Database) {}

  /** Aplica em ordem as migrations ainda não registradas; devolve os nomes executados. */
  run(migrations: readonly OrmMigration[]): string[] {
    this.ensureMigrationsTable();
    const applied = new Set(
      this.database.all('SELECT name FROM migrations').map((row) => String(row.name)),
    );
    const executed: string[] = [];
    for (const migration of migrations) {
      if (applied.has(migration.name)) {
        continue;
      }
      this.database.transaction(() => {
        for (const sql of migration.up) {
          this.database.run(sql);
        }
        this.database.run('INSERT INTO migrations (timestamp, name) VALUES (?, ?)', [
          migration.timestamp,
          migration.name,
        ]);
      });
      executed.push(migration.name);
    }
    return executed;
  }

  private ensureMigrationsTable(): void {
    this.database.run(
      'CREATE TABLE IF NOT EXISTS "migrations" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "timestamp" integer NOT NULL, "name" text NOT NULL)',
    );
  }
}
