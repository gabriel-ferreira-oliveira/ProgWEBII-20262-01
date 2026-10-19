import { Favorite as FavoriteEntity } from '../../database/entities/favorite.entity';
import { Movie as MovieEntity } from '../../database/entities/movie.entity';
import { Series as SeriesEntity } from '../../database/entities/series.entity';
import { User as UserEntity } from '../../database/entities/user.entity';
import { WatchedMovie as WatchedMovieEntity } from '../../database/entities/watched-movie.entity';
import { WatchedSeries as WatchedSeriesEntity } from '../../database/entities/watched-series.entity';
import { sqlMigrations } from '../../database/migrations/sql-migrations';
import { createTableSql } from './create-table-sql';
import { Database } from './database';
import { Column, Entity, primaryKeyOf, requireEntityMeta } from './entity';
import { MigrationRunner } from './migration-runner';

/** As 6 tabelas do schema já são as classes reais (T5.9.2–T5.9.8); só a classe-sem-chave fica aqui. */

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
    ['watched_movies', WatchedMovieEntity],
    ['watched_series', WatchedSeriesEntity],
    ['favorites', FavoriteEntity],
  ];

  /** Schema real: as migrations aplicadas pelo runner do mini-ORM (T5.12; antes vinha do TypeORM). */
  let migrated: Database;
  let db: Database;

  beforeAll(() => {
    migrated = new Database(':memory:');
    new MigrationRunner(migrated).run(sqlMigrations);
  });

  afterAll(() => {
    migrated.close();
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
      const real = normalize(migrated.all(`PRAGMA table_info("${table}")`) as unknown as ColumnInfo[]);

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

describe('metadados reais das 6 entidades (T5.9.8)', () => {
  const entities = [
    UserEntity,
    MovieEntity,
    SeriesEntity,
    WatchedMovieEntity,
    WatchedSeriesEntity,
    FavoriteEntity,
  ];

  it('todas têm tabela e chave primária no metadado do mini-ORM', () => {
    for (const entity of entities) {
      const meta = requireEntityMeta(entity);
      expect(meta.table.length).toBeGreaterThan(0);
      expect(primaryKeyOf(meta)?.name).toBe('id');
    }
  });

  it('os inversos da User apontam para @ManyToOne existentes nas tabelas filhas', () => {
    const oneToMany = requireEntityMeta(UserEntity).relations;
    expect(oneToMany.map((relation) => relation.property).sort()).toEqual([
      'favorites',
      'watchedMovies',
      'watchedSeries',
    ]);

    for (const relation of oneToMany) {
      if (relation.kind !== 'one-to-many') {
        throw new Error(`A relação "${relation.property}" devia ser one-to-many.`);
      }
      const inverse = requireEntityMeta(relation.target()).relations.find(
        (candidate) => candidate.kind === 'many-to-one' && candidate.property === relation.inverse,
      );
      expect(inverse).toBeDefined();
    }
  });

  it('as FKs das tabelas filhas batem com o schema real', () => {
    const expected: Array<[new () => object, string[]]> = [
      [WatchedMovieEntity, ['user_id', 'movie_id']],
      [WatchedSeriesEntity, ['user_id', 'series_id']],
      [FavoriteEntity, ['user_id', 'movie_id', 'series_id']],
    ];

    for (const [entity, columns] of expected) {
      const relations = requireEntityMeta(entity).relations;
      expect(relations.map((relation) => (relation.kind === 'many-to-one' ? relation.column : ''))).toEqual(columns);
    }
  });
});
