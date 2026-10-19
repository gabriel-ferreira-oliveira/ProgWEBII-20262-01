import { Database } from './database';
import { MigrationRunner } from './migration-runner';
import type { OrmMigration } from './migration-runner';
import { sqlMigrations } from '../../database/migrations/sql-migrations';

describe('MigrationRunner do mini-ORM (T5.11)', () => {
  let db: Database;
  let runner: MigrationRunner;

  const brokenMigration: OrmMigration = {
    name: 'Broken9999999999999',
    timestamp: 9999999999999,
    up: ['CREATE TABLE "tmp_ok" (id integer PRIMARY KEY)', 'INSERT INTO tabela_inexistente (x) VALUES (1)'],
    down: [],
  };

  beforeEach(() => {
    db = new Database(':memory:');
    runner = new MigrationRunner(db);
  });

  afterEach(() => {
    db.close();
  });

  it('aplica a migration inicial num banco novo e registra no formato do TypeORM', () => {
    const executed = runner.run(sqlMigrations);

    expect(executed).toEqual(['InitialSchema1730000000000']);
    expect(db.get(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'`)).toEqual({
      name: 'users',
    });
    expect(db.get('SELECT timestamp, name FROM migrations')).toEqual({
      timestamp: 1730000000000,
      name: 'InitialSchema1730000000000',
    });
  });

  it('nao reaplica migration ja registrada (idempotente entre reinicios)', () => {
    runner.run(sqlMigrations);

    expect(runner.run(sqlMigrations)).toEqual([]);
    expect(db.get('SELECT COUNT(*) AS total FROM migrations')).toEqual({ total: 1 });
  });

  it('pula migration que o TypeORM ja registrou, sem executar o SQL de novo', () => {
    db.run(
      'CREATE TABLE migrations (id integer PRIMARY KEY AUTOINCREMENT NOT NULL, timestamp integer NOT NULL, name text NOT NULL)',
    );
    db.run('INSERT INTO migrations (timestamp, name) VALUES (?, ?)', [
      1730000000000,
      'InitialSchema1730000000000',
    ]);

    expect(runner.run(sqlMigrations)).toEqual([]);
    expect(db.get(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'`)).toBeUndefined();
  });

  it('falha no meio desfaz a migration inteira (nem tabela nova, nem registro)', () => {
    expect(() => runner.run([brokenMigration])).toThrow();

    expect(db.get(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'tmp_ok'`)).toBeUndefined();
    expect(db.get('SELECT COUNT(*) AS total FROM migrations')).toEqual({ total: 0 });
  });
});
