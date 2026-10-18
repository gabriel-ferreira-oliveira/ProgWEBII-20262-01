/**
 * Mini-ORM — provider Nest da conexão própria (T5.3).
 *
 * Publica `Database` (mesmo arquivo do TypeORM via `databasePath()`, com WAL e `busy_timeout`).
 * O token `DATABASE_FILE` existe para os testes apontarem para `:memory:`; o `DatabaseCloser`
 * fecha a conexão no shutdown. Ainda **não é importado** por nenhum módulo do app:
 * passa a ser usado quando os serviços migrarem para o `BaseRepository` (T5.9.x).
 */
import { Injectable, Module } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { databasePath } from '../../common/paths';
import { Database } from './database';

/** Caminho do arquivo SQLite (sobrescrito nos testes por `:memory:`). */
export const DATABASE_FILE = 'DATABASE_FILE';

@Injectable()
class DatabaseCloser implements OnModuleDestroy {
  constructor(private readonly database: Database) {}

  onModuleDestroy(): void {
    this.database.close();
  }
}

@Module({
  providers: [
    { provide: DATABASE_FILE, useFactory: databasePath },
    {
      provide: Database,
      useFactory: (file: string): Database => new Database(file),
      inject: [DATABASE_FILE],
    },
    DatabaseCloser,
  ],
  exports: [Database],
})
export class MiniOrmModule {}
