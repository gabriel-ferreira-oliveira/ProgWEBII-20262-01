import { Favorite } from '../database/entities/favorite.entity';
import { Movie } from '../database/entities/movie.entity';
import { Series } from '../database/entities/series.entity';
import { User } from '../database/entities/user.entity';
import { WatchedMovie } from '../database/entities/watched-movie.entity';
import { WatchedSeries } from '../database/entities/watched-series.entity';

export function makeUser(overrides: Partial<User> = {}): User {
  const base: User = {
    id: 1,
    email: 'gsb@gmail.com',
    passwordHash: 'hash-bcrypt',
    name: 'Gabriel',
    country: 'Brasil',
    age: 21,
    bio: null,
    watchedMovieMinutes: 0,
    watchedSeriesMinutes: 0,
    totalMinutes: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    watchedMovies: [],
    watchedSeries: [],
    favorites: [],
  };
  return { ...base, ...overrides };
}

export function makeMovie(overrides: Partial<Movie> = {}): Movie {
  const base: Movie = {
    id: 1,
    title: 'Matriz',
    genre: 'Ficcao',
    synopsis: 'Sinopse original',
    year: 1999,
    durationMin: 136,
    createdAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
  };
  return { ...base, ...overrides };
}

export function makeSeries(overrides: Partial<Series> = {}): Series {
  const base: Series = {
    id: 1,
    title: 'Breaking Bad',
    genre: 'Drama',
    synopsis: 'Sinopse original',
    year: 2008,
    durationMin: 45,
    episodes: 62,
    season: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
  };
  return { ...base, ...overrides };
}

export function makeWatchedMovie(overrides: Partial<WatchedMovie> = {}): WatchedMovie {
  const base: WatchedMovie = {
    id: 1,
    userId: 1,
    movieId: 1,
    titleSnapshot: 'Matriz',
    position: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    user: makeUser(),
    movie: makeMovie(),
  };
  return { ...base, ...overrides };
}

export function makeWatchedSeries(overrides: Partial<WatchedSeries> = {}): WatchedSeries {
  const base: WatchedSeries = {
    id: 1,
    userId: 1,
    seriesId: 1,
    titleSnapshot: 'Breaking Bad',
    position: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    user: makeUser(),
    series: makeSeries(),
  };
  return { ...base, ...overrides };
}

export function makeFavorite(overrides: Partial<Favorite> = {}): Favorite {
  const base: Favorite = {
    id: 1,
    userId: 1,
    mediaType: 'movie',
    movieId: 1,
    seriesId: null,
    titleSnapshot: 'Matriz',
    position: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    user: makeUser(),
    movie: makeMovie(),
    series: null,
  };
  return { ...base, ...overrides };
}
