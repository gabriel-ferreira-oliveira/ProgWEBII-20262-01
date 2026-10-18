import { Test } from '@nestjs/testing';
import { DATABASE_FILE, MiniOrmModule } from './mini-orm.module';
import { Database } from './database';

describe('MiniOrmModule (T5.3)', () => {
  it('fornece o Database e o fecha no shutdown do módulo', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [MiniOrmModule] })
      .overrideProvider(DATABASE_FILE)
      .useValue(':memory:')
      .compile();

    const db = moduleRef.get(Database);
    db.run('CREATE TABLE t (x INTEGER)');
    db.run('INSERT INTO t (x) VALUES (?)', [1]);
    expect(db.get('SELECT x FROM t')).toEqual({ x: 1 });

    await moduleRef.close();
    expect(() => db.run('INSERT INTO t (x) VALUES (?)', [2])).toThrow();
  });
});
