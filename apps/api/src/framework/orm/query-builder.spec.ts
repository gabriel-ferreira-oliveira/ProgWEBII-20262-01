import { BaseRepository } from './base-repository';
import { Database } from './database';
import { Column, Entity, PrimaryKey } from './entity';
import type { QueryBuilder } from './query-builder';

@Entity('movies')
class Movie {
  @PrimaryKey({ autoIncrement: false })
  id!: number;

  @Column()
  title!: string;

  @Column({ type: String, nullable: true })
  genre!: string | null;

  @Column({ type: Number, nullable: true })
  year!: number | null;

  @Column({ type: String, name: 'deleted_at', nullable: true })
  deletedAt!: string | null;
}

describe('QueryBuilder do mini-ORM (T5.6)', () => {
  let db: Database;
  let movies: BaseRepository<Movie>;

  const makeMovie = (over: Partial<Movie> = {}): Movie =>
    Object.assign(
      new Movie(),
      { id: 1, title: 'Matrix', genre: null, year: null, deletedAt: null },
      over,
    );

  beforeEach(() => {
    db = new Database(':memory:');
    db.run(
      'CREATE TABLE movies (id INTEGER PRIMARY KEY, title TEXT NOT NULL, genre TEXT, year INTEGER, deleted_at TEXT)',
    );
    movies = new BaseRepository(db, Movie);
    movies.insert(makeMovie({ id: 1, title: 'Matrix', genre: 'ação', year: 1999 }));
    movies.insert(makeMovie({ id: 2, title: 'Interestelar', genre: 'ficção', year: 2014 }));
    movies.insert(makeMovie({ id: 3, title: 'Cidade de Deus', genre: 'ação', year: 2002 }));
    movies.insert(makeMovie({ id: 4, title: 'Duna', genre: null, year: 2021 }));
  });

  afterEach(() => {
    db.close();
  });

  it('where/orderBy/limit encadeiam e devolvem instâncias hidratadas', () => {
    const found = movies
      .query()
      .where('genre', '=', 'ação')
      .orderBy('id', 'DESC')
      .limit(2)
      .all();

    expect(found.map((movie) => movie.id)).toEqual([3, 1]);
    expect(found[0]).toBeInstanceOf(Movie);
  });

  it('operadores relacionais e <>', () => {
    const ids = (builder: QueryBuilder<Movie>) => builder.all().map((movie) => movie.id);

    expect(ids(movies.query().where('id', '<>', 1).orderBy('id'))).toEqual([2, 3, 4]);
    expect(ids(movies.query().where('year', '>', 1999).orderBy('id'))).toEqual([2, 3, 4]);
    expect(ids(movies.query().where('year', '<', 2005).orderBy('id'))).toEqual([1, 3]);
    expect(ids(movies.query().where('year', '<=', 2002).orderBy('id'))).toEqual([1, 3]);
    expect(ids(movies.query().where('year', '>=', 2014).orderBy('id'))).toEqual([2, 4]);
  });

  it('LIKE com % e com escape de % literal', () => {
    expect(movies.query().where('title', 'LIKE', '%un%').all().map((movie) => movie.id)).toEqual([4]);

    movies.insert(makeMovie({ id: 5, title: '100% real' }));
    expect(
      movies
        .query()
        .where('title', 'LIKE', '100\\% real')
        .all()
        .map((movie) => movie.id),
    ).toEqual([5]);
  });

  it('IN e IS NULL', () => {
    expect(movies.query().where('id', 'IN', [1, 3]).orderBy('id').all().map((m) => m.id)).toEqual([
      1, 3,
    ]);
    expect(movies.query().where('genre', 'IS NULL').all().map((m) => m.id)).toEqual([4]);
    expect(movies.query().where('genre', '=', null).all().map((m) => m.id)).toEqual([4]);
  });

  it('first e count respeitam os filtros', () => {
    expect(movies.query().where('genre', '=', 'ação').count()).toBe(2);
    expect(movies.query().orderBy('id').first()?.title).toBe('Matrix');
    expect(movies.query().where('id', '=', 99).first()).toBeUndefined();
  });

  it('soft delete fica escondido; withDeleted inclui', () => {
    movies.delete(2);

    expect(movies.query().all().map((m) => m.id)).toEqual([1, 3, 4]);
    expect(movies.query().where('id', '=', 2).first()).toBeUndefined();
    expect(movies.query().withDeleted().where('id', '=', 2).first()?.id).toBe(2);
    expect(movies.query().withDeleted().count()).toBe(4);
  });

  it('injeção: valor malicioso vira parâmetro vinculado (a tabela resiste)', () => {
    const ataque = "%' OR 1=1; DROP TABLE movies; --";
    const found = movies.query().where('title', 'LIKE', ataque).all();

    expect(found).toEqual([]);
    expect(movies.count()).toBe(4);
  });

  it('injeção: operador fora da whitelist, propriedade fora dos metadados e limites falham', () => {
    expect(() => movies.query().where('title', '= 1 OR' as never, 'x')).toThrow(
      /Operador inválido/,
    );
    expect(() => movies.query().where('nome' as never, '=', 'x')).toThrow(/não é coluna/);
    expect(() => movies.query().orderBy('nome' as never)).toThrow(/não é coluna/);
    expect(() => movies.query().where('id', 'IN', [])).toThrow(/não vazia/);
    expect(() => movies.query().limit(0)).toThrow(/inteiro positivo/);
    expect(() => movies.query().limit(2.5)).toThrow(/inteiro positivo/);
  });
});
