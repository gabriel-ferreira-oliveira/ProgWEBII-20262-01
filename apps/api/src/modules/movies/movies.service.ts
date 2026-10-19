import { Inject, Injectable } from '@nestjs/common';
import type { MovieDto, MovieWatchResultDto } from '@ceviu/shared';
import { MediaService } from '../../common/media/media-service';
import { toMovieDto } from '../../common/mappers';
import { BaseRepository } from '../../framework/orm/base-repository';
import { Favorite } from '../../database/entities/favorite.entity';
import { Movie } from '../../database/entities/movie.entity';
import { User } from '../../database/entities/user.entity';
import { WatchedMovie } from '../../database/entities/watched-movie.entity';

@Injectable()
export class MoviesService {
  private readonly media: MediaService<Movie, MovieDto, MovieWatchResultDto, WatchedMovie>;

  constructor(
    @Inject(Movie)
    movies: BaseRepository<Movie>,
    @Inject(User)
    users: BaseRepository<User>,
    @Inject(WatchedMovie)
    watchedMovies: BaseRepository<WatchedMovie>,
    @Inject(Favorite)
    favorites: BaseRepository<Favorite>,
  ) {
    this.media = new MediaService<Movie, MovieDto, MovieWatchResultDto, WatchedMovie>({
      repository: movies,
      toDto: toMovieDto,
      notFoundMessage: 'Filme nao encontrado',
      saveSynopsis: (id, synopsis) => {
        movies.update(id, { synopsis });
      },
      watch: {
        usersRepository: users,
        watchedRepository: watchedMovies,
        favoritesRepository: favorites,
        watchedEntryOf: (movie, userId, position) =>
          Object.assign(new WatchedMovie(), {
            userId,
            movieId: movie.id,
            titleSnapshot: movie.title,
            position,
          }),
        favoriteEntryOf: (movie, userId, position) =>
          Object.assign(new Favorite(), {
            userId,
            mediaType: 'movie',
            movieId: movie.id,
            seriesId: null,
            titleSnapshot: movie.title,
            position,
          }),
        counterField: 'watchedMovieMinutes',
        counterOf: (user) => user.watchedMovieMinutes,
        toResult: (watchedMovieMinutes) => ({ watchedMovieMinutes }),
        countTimeOnFavorite: true,
      },
    });
  }

  async list(): Promise<MovieDto[]> {
    return this.media.list();
  }

  async findOne(id: number): Promise<MovieDto> {
    return this.media.findOne(id);
  }

  async updateSynopsis(id: number, synopsis: string): Promise<MovieDto> {
    return this.media.updateSynopsis(id, synopsis);
  }

  async remove(id: number): Promise<void> {
    return this.media.remove(id);
  }

  async watch(id: number, userId: number): Promise<MovieWatchResultDto> {
    return this.media.watch(id, userId);
  }

  async favorite(id: number, userId: number): Promise<MovieWatchResultDto> {
    return this.media.favorite(id, userId);
  }
}
