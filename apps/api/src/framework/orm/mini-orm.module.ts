/**
 * Mini-ORM — provider Nest da conexão própria (T5.3) e dos repositórios por classe (T5.9.1).
 *
 * Publica `Database` (mesmo arquivo do TypeORM via `databasePath()`, com WAL e `busy_timeout`)
 * como módulo **global**: registrado uma vez no `AppModule`, o `Database` fica injetável em
 * qualquer lugar. O token `DATABASE_FILE` existe para os testes apontarem para `:memory:`;
 * o `DatabaseCloser` fecha a conexão no shutdown.
 *
 * `forFeature([...classes])` registra um `BaseRepository<T>` por classe **no token da própria
 * classe** — os serviços injetam `@Inject(Movie) movies: BaseRepository<Movie>` (a troca por
 * serviço acontece em T5.9.5+; aqui só a infraestrutura).
 */
import { Global, Injectable, Module } from '@nestjs/common';
import type { DynamicModule, OnModuleDestroy, Provider } from '@nestjs/common';
import { databasePath } from '../../common/paths';
import { BaseRepository } from './base-repository';
import { Database } from './database';
import type { EntityClass } from './hydrate';

/** Caminho do arquivo SQLite (sobrescrito nos testes por `:memory:`). */
export const DATABASE_FILE = 'DATABASE_FILE';

@Injectable()
class DatabaseCloser implements OnModuleDestroy {
  constructor(private readonly database: Database) {}

  onModuleDestroy(): void {
    this.database.close();
  }
}

/** Módulo interno vazio: dá "casa" aos providers dinâmicos do `forFeature` (como o TypeOrmModule faz). */
@Module({})
class MiniOrmFeatureModule {}

@Global()
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
export class MiniOrmModule {
  /**
   * Registra um `BaseRepository<T>` por classe (token = a classe). O `MiniOrmModule` precisa
   * estar registrado uma vez (é `@Global`, então basta o `AppModule`); o provider dinâmico
   * mora num módulo-casa vazio para **não** duplicar os providers estáticos da conexão.
   */
  static forFeature(entities: readonly EntityClass[]): DynamicModule {
    const providers: Provider[] = entities.map((entity) => ({
      provide: entity,
      useFactory: (database: Database): BaseRepository<object> =>
        new BaseRepository(database, entity),
      inject: [Database],
    }));
    return {
      module: MiniOrmFeatureModule,
      providers,
      exports: [...entities],
    };
  }
}
