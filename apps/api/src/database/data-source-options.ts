import type { DataSourceOptions } from 'typeorm';
import { databasePath } from '../common/paths';
import { Favorite, Movie, Series, User, WatchedMovie, WatchedSeries } from './entities';
import { InitialSchema1730000000000 } from './migrations/1730000000000-InitialSchema';

export function dataSourceOptions(): DataSourceOptions {
  const options: DataSourceOptions = {
    type: 'better-sqlite3',
    database: databasePath(),
    entities: [User, Movie, Series, WatchedMovie, WatchedSeries, Favorite],
    migrations: [InitialSchema1730000000000],
    migrationsTableName: 'migrations',
    synchronize: false,
    logging: false,
    enableWAL: true,
  };
  return options;
}
