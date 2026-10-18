import { Injectable, NotFoundException } from '@nestjs/common';
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
  private readonly media: MediaService<Movie, MovieDto>;

  constructor(
    @InjectRepository(Movie)
    movies: Repository<Movie>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(WatchedMovie)
    private readonly watchedMovies: Repository<WatchedMovie>,
    @InjectRepository(Favorite)
    private readonly favorites: Repository<Favorite>,
  ) {
    this.media = new MediaService<Movie, MovieDto>({
      repository: movies,
      toDto: toMovieDto,
      notFoundMessage: 'Filme nao encontrado',
    });
  }

  async list(): Promise<MovieDto[]> {
    return this.media.list();
  }

  async findEntity(id: number): Promise<Movie> {
    return this.media.findEntity(id);
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
    const movie = await this.findEntity(id);
    const watchedMovieMinutes = await this.appendWatchedMovie(movie, userId);
    return { watchedMovieMinutes };
  }

  async favorite(id: number, userId: number): Promise<MovieWatchResultDto> {
    const movie = await this.findEntity(id);
    const watchedMovieMinutes = await this.appendWatchedMovie(movie, userId);
    await this.appendFavorite(movie, userId);
    return { watchedMovieMinutes };
  }

  private async appendWatchedMovie(movie: Movie, userId: number): Promise<number> {
    const user = await this.findUser(userId);
    const position = await this.watchedMovies.count({ where: { userId } });
    const entry = this.watchedMovies.create({
      userId,
      movieId: movie.id,
      titleSnapshot: movie.title,
      position,
    });
    await this.watchedMovies.save(entry);

    const minutes = movie.durationMin ?? 0;
    if (minutes > 0) {
      await this.users.increment({ id: userId }, 'watchedMovieMinutes', minutes);
    }
    return user.watchedMovieMinutes + minutes;
  }

  private async appendFavorite(movie: Movie, userId: number): Promise<void> {
    const position = await this.favorites.count({ where: { userId } });
    const favorite = this.favorites.create({
      userId,
      mediaType: 'movie',
      movieId: movie.id,
      seriesId: null,
      titleSnapshot: movie.title,
      position,
    });
    await this.favorites.save(favorite);
  }

  private async findUser(userId: number): Promise<User> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (user === null) {
      throw new NotFoundException('Usuario nao encontrado');
    }
    return user;
  }
}
