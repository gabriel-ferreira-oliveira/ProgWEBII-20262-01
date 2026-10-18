import type {
  FavoriteEntryDto,
  MovieDto,
  SeriesDto,
  UserProfileDto,
  UserSummaryDto,
  UserTimesDto,
  WatchedEntryDto,
} from '@ceviu/shared';
import type { Favorite } from '../database/entities/favorite.entity';
import type { Movie } from '../database/entities/movie.entity';
import type { Series } from '../database/entities/series.entity';
import type { User } from '../database/entities/user.entity';
import type { WatchedMovie } from '../database/entities/watched-movie.entity';
import type { WatchedSeries } from '../database/entities/watched-series.entity';

export function toMovieDto(movie: Movie): MovieDto {
  return {
    id: movie.id,
    title: movie.title,
    genre: movie.genre,
    synopsis: movie.synopsis,
    year: movie.year,
    durationMin: movie.durationMin,
  };
}

export function toSeriesDto(series: Series): SeriesDto {
  return {
    id: series.id,
    title: series.title,
    genre: series.genre,
    synopsis: series.synopsis,
    year: series.year,
    durationMin: series.durationMin,
    episodes: series.episodes,
    season: series.season,
  };
}

export function toUserSummaryDto(user: User): UserSummaryDto {
  return {
    id: user.id,
    name: user.name,
    age: user.age,
  };
}

export function toUserProfileDto(user: User): UserProfileDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    country: user.country,
    age: user.age,
    bio: user.bio,
  };
}

export function toUserTimesDto(user: User): UserTimesDto {
  return {
    watchedMovieMinutes: user.watchedMovieMinutes,
    watchedSeriesMinutes: user.watchedSeriesMinutes,
    totalMinutes: user.totalMinutes,
  };
}

export function toWatchedMovieEntryDto(entry: WatchedMovie): WatchedEntryDto {
  return {
    title: entry.titleSnapshot,
    position: entry.position,
    movieId: entry.movieId,
    seriesId: null,
  };
}

export function toWatchedSeriesEntryDto(entry: WatchedSeries): WatchedEntryDto {
  return {
    title: entry.titleSnapshot,
    position: entry.position,
    movieId: null,
    seriesId: entry.seriesId,
  };
}

export function toFavoriteEntryDto(favorite: Favorite): FavoriteEntryDto {
  return {
    title: favorite.titleSnapshot,
    mediaType: favorite.mediaType,
    position: favorite.position,
    movieId: favorite.movieId,
    seriesId: favorite.seriesId,
  };
}
