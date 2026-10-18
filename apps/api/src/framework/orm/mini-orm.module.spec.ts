import { Test } from '@nestjs/testing';
import { DATABASE_FILE, MiniOrmModule } from './mini-orm.module';
import { BaseRepository } from './base-repository';
import { Database } from './database';
import { Column, Entity, PrimaryKey } from './entity';

@Entity('notes')
class Note {
  @PrimaryKey()
  id!: number;

  @Column()
  title!: string;
}

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

  it('forFeature resolve o BaseRepository<T> no token da própria classe (T5.9.1)', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MiniOrmModule, MiniOrmModule.forFeature([Note])],
    })
      .overrideProvider(DATABASE_FILE)
      .useValue(':memory:')
      .compile();

    const db = moduleRef.get(Database);
    db.run('CREATE TABLE notes (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, title TEXT NOT NULL)');

    const notes = moduleRef.get<BaseRepository<Note>>(Note);
    expect(notes).toBeInstanceOf(BaseRepository);

    const saved = notes.insert(Object.assign(new Note(), { title: 'primeira' }));
    expect(saved.id).toBe(1);
    expect(notes.findById(1)?.title).toBe('primeira');
    expect(notes.count()).toBe(1);

    await moduleRef.close();
  });
});
