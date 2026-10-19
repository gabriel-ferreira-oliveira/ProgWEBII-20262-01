import { Column, Entity, PrimaryKey } from './entity';
import { BaseRepository } from './base-repository';
import { Database } from './database';

@Entity('movies')
class Movie {
  @PrimaryKey({ autoIncrement: false })
  id!: number;

  @Column()
  title!: string;

  @Column({ type: String, nullable: true })
  genre!: string | null;

  @Column({ type: String, name: 'deleted_at', nullable: true })
  deletedAt!: string | null;
}

@Entity('favorites')
class Favorite {
  @PrimaryKey()
  id!: number;

  @Column({ name: 'user_id', type: Number })
  userId!: number;

  @Column({ type: Number })
  position!: number;

  @Column({ name: 'created_at', type: String })
  createdAt!: string;
}

@Entity('sem_chave')
class SemChave {
  @Column()
  title!: string;
}

describe('BaseRepository do mini-ORM (T5.4)', () => {
  let db: Database;
  let movies: BaseRepository<Movie>;
  let favorites: BaseRepository<Favorite>;

  const makeMovie = (over: Partial<Movie> = {}): Movie =>
    Object.assign(new Movie(), { id: 1, title: 'Matrix', genre: null, deletedAt: null }, over);

  const makeFavorite = (over: Partial<Favorite> = {}): Favorite =>
    Object.assign(new Favorite(), { userId: 7, position: 0 }, over);

  beforeEach(() => {
    db = new Database(':memory:');
    db.run('CREATE TABLE movies (id INTEGER PRIMARY KEY, title TEXT NOT NULL, genre TEXT, deleted_at TEXT)');
    db.run(
      'CREATE TABLE favorites (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, position INTEGER NOT NULL, created_at TEXT NOT NULL)',
    );
    movies = new BaseRepository(db, Movie);
    favorites = new BaseRepository(db, Favorite);
  });

  afterEach(() => {
    db.close();
  });

  it('insert grava pelo nome do banco e findById devolve instância hidratada', () => {
    movies.insert(makeMovie({ genre: 'ação' }));

    expect(db.get('SELECT id, title, genre FROM movies WHERE id = 1')).toEqual({
      id: 1,
      title: 'Matrix',
      genre: 'ação',
    });

    const found = movies.findById(1);
    expect(found).toBeInstanceOf(Movie);
    expect(found?.title).toBe('Matrix');
    expect(found?.genre).toBe('ação');
    expect(found?.deletedAt).toBeNull();
    expect(movies.findById(99)).toBeUndefined();
  });

  it('insert de chave gerada devolve o id na instância e preenche created_at', () => {
    const first = favorites.insert(makeFavorite());
    const second = favorites.insert(makeFavorite({ userId: 8 }));

    expect(first.id).toBe(1);
    expect(second.id).toBe(2);
    expect(typeof first.createdAt).toBe('string');
    expect(Number.isNaN(Date.parse(first.createdAt))).toBe(false);
    expect(db.get('SELECT created_at FROM favorites WHERE id = 1')).toEqual({
      created_at: first.createdAt,
    });
  });

  it('delete em entidade com deleted_at é soft (find esconde; withDeleted mostra)', () => {
    movies.insert(makeMovie());

    expect(movies.delete(1)).toBe(true);
    expect(movies.delete(1)).toBe(false);
    expect(movies.findById(1)).toBeUndefined();
    expect(movies.findAll()).toEqual([]);
    expect(movies.count()).toBe(0);

    const deleted = movies.findById(1, { withDeleted: true });
    expect(deleted).toBeInstanceOf(Movie);
    expect(typeof deleted?.deletedAt).toBe('string');
    expect(movies.findAll({ withDeleted: true })).toHaveLength(1);
    expect(db.get('SELECT title FROM movies WHERE id = 1')).not.toBeUndefined();
  });

  it('delete em entidade sem deleted_at apaga de verdade', () => {
    const favorite = favorites.insert(makeFavorite());

    expect(favorites.delete(favorite.id)).toBe(true);
    expect(favorites.findById(favorite.id)).toBeUndefined();
    expect(favorites.count()).toBe(0);
  });

  it('findAll filtra por coluna (null vira IS NULL) e ordena', () => {
    movies.insert(makeMovie({ id: 1, title: 'A', genre: 'ação' }));
    movies.insert(makeMovie({ id: 2, title: 'B', genre: null }));
    movies.insert(makeMovie({ id: 3, title: 'C', genre: 'ação' }));

    expect(movies.findAll({ where: { genre: 'ação' }, order: { id: 'DESC' } }).map((m) => m.id)).toEqual([3, 1]);
    expect(movies.findAll({ where: { genre: null } }).map((m) => m.id)).toEqual([2]);
    expect(movies.count()).toBe(3);
    expect(movies.count({ where: { genre: 'ação' } })).toBe(2);
  });

  it('update altera só o que veio no patch e informa se afetou linha', () => {
    movies.insert(makeMovie());

    expect(movies.update(1, { title: 'Novo', genre: 'ficção' })).toBe(true);
    expect(movies.findById(1)?.title).toBe('Novo');
    expect(movies.findById(1)?.genre).toBe('ficção');
    expect(movies.update(99, { title: 'X' })).toBe(false);
    expect(movies.update(1, {})).toBe(false);
  });

  it('increment soma no banco pela propriedade', () => {
    const favorite = favorites.insert(makeFavorite());

    expect(favorites.increment(favorite.id, 'position', 2)).toBe(true);
    expect(favorites.findById(favorite.id)?.position).toBe(2);
    expect(favorites.increment(99, 'position', 1)).toBe(false);
  });

  it('clear apaga tudo fisicamente (inclusive soft-deletados)', () => {
    movies.insert(makeMovie());
    movies.delete(1);
    favorites.insert(makeFavorite());

    movies.clear();
    favorites.clear();

    expect(movies.findAll({ withDeleted: true })).toEqual([]);
    expect(movies.count({ withDeleted: true })).toBe(0);
    expect(favorites.count()).toBe(0);
  });

  it('propriedade fora dos metadados ou direção inválida falha (whitelist)', () => {
    expect(() => movies.findAll({ where: { nome: 'X' } } as never)).toThrow(/não é coluna/);
    expect(() => movies.findAll({ order: { title: 'SIDEWAYS' } } as never)).toThrow(
      /Direção de ordenação inválida/,
    );
    expect(() => movies.update(1, { nome: 'X' } as never)).toThrow(/não é coluna/);
    expect(() => favorites.increment(1, 'nome' as never, 1)).toThrow(/não é coluna/);
  });

  it('sem @PrimaryKey falha na construção', () => {
    expect(() => new BaseRepository(db, SemChave)).toThrow(/@PrimaryKey/);
  });
});
