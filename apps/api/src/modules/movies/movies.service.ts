import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { MovieDto, MovieWatchResultDto } from '@ceviu/shared';
import { MediaService } from '../../common/media/media-service';
import { toMovieDto } from '../../common/mappers';
import { Favorite } from '../../database/entities/favorite.entity';
import { Movie } from '../../database/entities/movie.entity';
import { User } from '../../database/entities/user.entity';
import { WatchedMovie } from '../../database/entities/watched-movie.entity';

@Injectable()
export class MoviesService {
  private readonly media: MediaService<Movie, MovieDto, MovieWatchResultDto, WatchedMovie>;

  constructor(
    @InjectRepository(Movie)
    movies: Repository<Movie>,
    @InjectRepository(User)
    users: Repository<User>,
    @InjectRepository(WatchedMovie)
    watchedMovies: Repository<WatchedMovie>,
    @InjectRepository(Favorite)
    favorites: Repository<Favorite>,
  ) {
    this.media = new MediaService<Movie, MovieDto, MovieWatchResultDto, WatchedMovie>({
      repository: movies,
      toDto: toMovieDto,
      notFoundMessage: 'Filme nao encontrado',
      watch: {
        usersRepository: users,
        watchedRepository: watchedMovies,
        favoritesRepository: favorites,
        watchedEntryOf: (movie, userId, position) => ({
          userId,
          movieId: movie.id,
          titleSnapshot: movie.title,
          position,
        }),
        favoriteEntryOf: (movie, userId, position) => ({
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
