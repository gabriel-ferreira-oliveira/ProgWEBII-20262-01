/**
 * Mini-ORM — runner mínimo de migrations SQL (T5.11).
 *
 * Dona do schema desde a T5.12 (substituiu o `migrationsRun: true` do TypeORM): lê/aplica as
 * migrations SQL do projeto e mantém a tabela `migrations` no **mesmo formato da era TypeORM**
 * (`timestamp` + `name`, ex.: `1730000000000` / `InitialSchema1730000000000`) — bancos já
 * migrados por ele são reconhecidos e pulados.
 *
 * Cada migration roda num commit próprio (DDL + registro juntos): se falhar no meio, o rollback
 * desfaz as tabelas criadas e o registro. A tabela `migrations` é criada com `IF NOT EXISTS`.
 */
import type { Database } from './database';

/** Migration SQL pura: os comandos que o mini-ORM executa e o registro que grava. */
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
