import { BaseRepository } from './base-repository';
import { Database } from './database';
import { Column, Entity, ManyToOne, OneToMany, PrimaryKey, getEntityMeta } from './entity';

@Entity('users')
class User {
  @PrimaryKey({ autoIncrement: false })
  id!: number;

  @Column()
  name!: string;

  @Column({ type: String, name: 'deleted_at', nullable: true })
  deletedAt!: string | null;

  @OneToMany(() => WatchedMovie, (watched) => watched.user)
  watchedMovies!: WatchedMovie[];
}

@Entity('movies')
class Movie {
  @PrimaryKey({ autoIncrement: false })
  id!: number;

  @Column()
  title!: string;

  @Column({ type: String, nullable: true })
  genre!: string | null;
}

@Entity('watched_movies')
class WatchedMovie {
  @PrimaryKey({ autoIncrement: false })
  id!: number;

  @Column({ name: 'user_id' })
  userId!: number;

  @Column({ type: Number, name: 'movie_id', nullable: true })
  movieId!: number | null;

  @Column({ type: String, name: 'deleted_at', nullable: true })
  deletedAt!: string | null;

  @ManyToOne(() => User, { column: 'user_id' })
  user!: User;

  @ManyToOne(() => Movie)
  movie!: Movie | null;
}

describe('Relações do mini-ORM (T5.7)', () => {
  let db: Database;
  let users: BaseRepository<User>;
  let movies: BaseRepository<Movie>;
  let watched: BaseRepository<WatchedMovie>;

  beforeEach(() => {
    db = new Database(':memory:');
    db.run(
      'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, deleted_at TEXT)',
    );
    db.run('CREATE TABLE movies (id INTEGER PRIMARY KEY, title TEXT NOT NULL, genre TEXT)');
    db.run(
      'CREATE TABLE watched_movies (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, movie_id INTEGER, deleted_at TEXT)',
    );
    users = new BaseRepository(db, User);
    movies = new BaseRepository(db, Movie);
    watched = new BaseRepository(db, WatchedMovie);

    users.insert(Object.assign(new User(), { id: 1, name: 'Ana', deletedAt: null }));
    users.insert(Object.assign(new User(), { id: 2, name: 'Bia', deletedAt: null }));
    movies.insert(Object.assign(new Movie(), { id: 10, title: 'Matrix', genre: 'ação' }));
    movies.insert(Object.assign(new Movie(), { id: 11, title: 'Duna', genre: 'ficção' }));
    watched.insert(
      Object.assign(new WatchedMovie(), { id: 100, userId: 1, movieId: 10, deletedAt: null }),
    );
    watched.insert(
      Object.assign(new WatchedMovie(), { id: 101, userId: 1, movieId: 11, deletedAt: null }),
    );
    watched.insert(
      Object.assign(new WatchedMovie(), { id: 102, userId: 2, movieId: null, deletedAt: null }),
    );
    watched.insert(
      Object.assign(new WatchedMovie(), { id: 103, userId: 2, movieId: 11, deletedAt: '2026-10-18T00:00:00.000Z' }),
    );
  });

  afterEach(() => {
    db.close();
  });

  it('metadados: @ManyToOne grava coluna (default snake_id), @OneToMany grava o inverso', () => {
    const meta = getEntityMeta(WatchedMovie);

    expect(meta?.relations).toEqual([
      { kind: 'many-to-one', property: 'user', column: 'user_id', target: expect.any(Function) },
      { kind: 'many-to-one', property: 'movie', column: 'movie_id', target: expect.any(Function) },
    ]);
    expect(getEntityMeta(User)?.relations).toEqual([
      { kind: 'one-to-many', property: 'watchedMovies', inverse: 'user', target: expect.any(Function) },
    ]);
  });

  it('include many-to-one: JOIN preenche a instância (null quando o FK é nulo)', () => {
    const rows = watched.query().include('movie').orderBy('id').all();

    expect(rows.map((row) => row.id)).toEqual([100, 101, 102]);
    expect(rows[0].movie).toBeInstanceOf(Movie);
    expect(rows[0].movie?.title).toBe('Matrix');
    expect(rows[0].movieId).toBe(10);
    expect(rows[2].movie).toBeNull();
  });

  it('include one-to-many: segunda consulta preenche os arrays (vazio quando não há filhos)', () => {
    const found = users.query().include('watchedMovies').orderBy('id').all();

    expect(found.map((user) => user.watchedMovies.map((row) => row.id))).toEqual([[100, 101], [102]]);
    expect(found[0].watchedMovies[0]).toBeInstanceOf(WatchedMovie);
  });

  it('include combina com where/limit e propaga soft delete (withDeleted inclui)', () => {
    const ana = watched.query().include('movie').where('userId', '=', 1).all();
    expect(ana.map((row) => row.movie?.title)).toEqual(['Matrix', 'Duna']);

    const comDeletado = users.query().withDeleted().include('watchedMovies').orderBy('id').all();
    expect(comDeletado.map((user) => user.watchedMovies.map((row) => row.id))).toEqual([
      [100, 101],
      [102, 103],
    ]);

    const dois = users.query().include('watchedMovies').first();
    expect(dois?.watchedMovies.map((row) => row.id)).toEqual([100, 101]);
  });

  it('include de propriedade que não é relação falha', () => {
    expect(() => watched.query().include('userId' as never)).toThrow(/não é relação/);
    expect(() => watched.query().include('nome' as never)).toThrow(/não é relação/);
  });

  it('relação não veta escrita: dehydrate ignora a propriedade e o insert persiste só colunas', () => {
    const nova = watched.insert(
      Object.assign(new WatchedMovie(), {
        id: 104,
        userId: 1,
        movieId: 10,
        deletedAt: null,
        movie: Object.assign(new Movie(), { id: 10, title: 'Matrix', genre: null }),
      }),
    );

    expect(nova.movie).toBeInstanceOf(Movie);
    expect(
      db.get('SELECT movie_id AS v FROM watched_movies WHERE id = 104')?.v,
    ).toBe(10);
  });
});
