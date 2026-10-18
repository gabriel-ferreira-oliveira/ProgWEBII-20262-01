import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Database } from './database';

describe('Database do mini-ORM (T5.3)', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.run('CREATE TABLE movies (id INTEGER PRIMARY KEY, title TEXT NOT NULL, synopsis TEXT)');
  });

  afterEach(() => {
    db.close();
  });

  it('run devolve changes e lastInsertRowid', () => {
    expect(db.run('INSERT INTO movies (title) VALUES (?)', ['Matrix'])).toEqual({
      changes: 1,
      lastInsertRowid: 1,
    });
    expect(db.run('INSERT INTO movies (title) VALUES (?)', ['Interestelar'])).toEqual({
      changes: 1,
      lastInsertRowid: 2,
    });
  });

  it('get devolve a primeira linha (ou undefined)', () => {
    db.run('INSERT INTO movies (title, synopsis) VALUES (?, ?)', ['Matrix', null]);

    expect(db.get('SELECT id, title, synopsis FROM movies WHERE id = ?', [1])).toEqual({
      id: 1,
      title: 'Matrix',
      synopsis: null,
    });
    expect(db.get('SELECT title FROM movies WHERE id = ?', [99])).toBeUndefined();
  });

  it('all devolve todas as linhas', () => {
    db.run('INSERT INTO movies (title) VALUES (?)', ['A']);
    db.run('INSERT INTO movies (title) VALUES (?)', ['B']);

    expect(db.all('SELECT title FROM movies ORDER BY id')).toEqual([{ title: 'A' }, { title: 'B' }]);
  });

  it('valores vão como parâmetro vinculado (sem injeção de SQL)', () => {
    const ataque = "X'); DROP TABLE movies; --";
    db.run('INSERT INTO movies (title) VALUES (?)', [ataque]);

    expect(db.all('SELECT title FROM movies')).toEqual([{ title: ataque }]);
  });

  it('transaction confirma tudo quando o corpo termina', () => {
    const resultado = db.transaction(() => {
      db.run('INSERT INTO movies (title) VALUES (?)', ['Dentro']);
      return 'ok';
    });

    expect(resultado).toBe('ok');
    expect(db.all('SELECT title FROM movies')).toEqual([{ title: 'Dentro' }]);
  });

  it('transaction desfaz tudo quando o corpo lança', () => {
    db.run('INSERT INTO movies (title) VALUES (?)', ['Antes']);

    expect(() =>
      db.transaction(() => {
        db.run('INSERT INTO movies (title) VALUES (?)', ['Dentro']);
        throw new Error('falha proposital');
      }),
    ).toThrow('falha proposital');
    expect(db.all('SELECT title FROM movies')).toEqual([{ title: 'Antes' }]);
  });

  it('abre arquivo com WAL e busy_timeout (coexistência com o TypeORM)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ceviu-orm-'));
    const fileDb = new Database(join(dir, 'ceviu-test.sqlite'));

    try {
      expect(fileDb.get('PRAGMA journal_mode')).toEqual({ journal_mode: 'wal' });
      expect(fileDb.get('PRAGMA busy_timeout')).toEqual({ timeout: 5000 });
    } finally {
      fileDb.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
