import { DataSource } from 'typeorm';
import { Favorite as FavoriteEntity } from '../../database/entities/favorite.entity';
import { Movie as MovieEntity } from '../../database/entities/movie.entity';
import { Series as SeriesEntity } from '../../database/entities/series.entity';
import { User as UserEntity } from '../../database/entities/user.entity';
import { WatchedMovie as WatchedMovieEntity } from '../../database/entities/watched-movie.entity';
import { WatchedSeries as WatchedSeriesEntity } from '../../database/entities/watched-series.entity';
import { InitialSchema1730000000000 } from '../../database/migrations/1730000000000-InitialSchema';
import { createTableSql } from './create-table-sql';
import { Database } from './database';
import { Column, Entity, PrimaryKey } from './entity';

/** Réplicas mini-ORM das tabelas ainda não decoradas (`users`, `movies` e `series` já são as classes reais). */

@Entity('watched_movies')
class WatchedMovie {
  @PrimaryKey()
  id!: number;

  @Column({ name: 'user_id', type: Number })
  userId!: number;

  @Column({ name: 'movie_id', type: Number, nullable: true })
  movieId!: number | null;

  @Column({ name: 'title_snapshot' })
  titleSnapshot!: string;

  @Column({ type: Number })
  position!: number;

  @Column({ name: 'created_at' })
  createdAt!: string;
}

@Entity('watched_series')
class WatchedSeries {
  @PrimaryKey()
  id!: number;

  @Column({ name: 'user_id', type: Number })
  userId!: number;

  @Column({ name: 'series_id', type: Number, nullable: true })
  seriesId!: number | null;

  @Column({ name: 'title_snapshot' })
  titleSnapshot!: string;

  @Column({ type: Number })
  position!: number;

  @Column({ name: 'created_at' })
  createdAt!: string;
}

@Entity('favorites')
class Favorite {
  @PrimaryKey()
  id!: number;

  @Column({ name: 'user_id', type: Number })
  userId!: number;

  @Column({ name: 'media_type' })
  mediaType!: string;

  @Column({ name: 'movie_id', type: Number, nullable: true })
  movieId!: number | null;

  @Column({ name: 'series_id', type: Number, nullable: true })
  seriesId!: number | null;

  @Column({ name: 'title_snapshot' })
  titleSnapshot!: string;

  @Column({ type: Number })
  position!: number;

  @Column({ name: 'created_at' })
  createdAt!: string;
}

@Entity('sem_chave')
class SemChave {
  @Column()
  title!: string;
}

interface ColumnInfo {
  name: string;
  type: string;
  notnull: number;
  pk: number;
  dflt_value: string | null;
}

/** Forma comparável da coluna (DEFAULT normalizado: o PRAGMA devolve como escrevemos). */
function normalize(rows: ColumnInfo[]) {
  return rows.map((row) => ({
    name: row.name,
    type: String(row.type).toLowerCase(),
    notnull: Number(row.notnull),
    pk: Number(row.pk),
    dflt: row.dflt_value === null ? null : String(row.dflt_value).replace(/[()\s']/g, ''),
  }));
}

describe('createTableSql (T5.5)', () => {
  const cases: Array<[string, new () => object]> = [
    ['users', UserEntity],
    ['movies', MovieEntity],
    ['series', SeriesEntity],
    ['watched_movies', WatchedMovie],
    ['watched_series', WatchedSeries],
    ['favorites', Favorite],
  ];

  let migrated: DataSource;
  let db: Database;

  beforeAll(async () => {
    migrated = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: [
        UserEntity,
        MovieEntity,
        SeriesEntity,
        WatchedMovieEntity,
        WatchedSeriesEntity,
        FavoriteEntity,
      ],
      migrations: [InitialSchema1730000000000],
    });
    await migrated.initialize();
    await migrated.runMigrations();
  });

  afterAll(async () => {
    await migrated.destroy();
  });

  beforeEach(() => {
    db = new Database(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it.each(cases)(
    'o schema gerado para "%s" bate com a migration (PRAGMA table_info)',
    async (table, entityClass) => {
      db.run(createTableSql(entityClass));

      const custom = normalize(db.all(`PRAGMA table_info("${table}")`) as unknown as ColumnInfo[]);
      const real = normalize((await migrated.query(`PRAGMA table_info("${table}")`)) as ColumnInfo[]);

      expect(custom).toEqual(real);
    },
  );

  it('AUTOINCREMENT entra na chave gerada e fica de fora quando autoIncrement é false', () => {
    db.run(createTableSql(UserEntity));
    db.run(createTableSql(MovieEntity));

    const sqlOf = (table: string): string =>
      (db.get('SELECT sql FROM sqlite_master WHERE name = ?', [table])?.sql ?? '') as string;

    expect(sqlOf('users')).toMatch(/AUTOINCREMENT/);
    expect(sqlOf('movies')).not.toMatch(/AUTOINCREMENT/);
  });

  it('sem @PrimaryKey falha', () => {
    expect(() => createTableSql(SemChave)).toThrow(/@PrimaryKey/);
  });
});
