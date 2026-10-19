import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Favorite } from '../../database/entities/favorite.entity';
import { Movie } from '../../database/entities/movie.entity';
import { User } from '../../database/entities/user.entity';
import { WatchedMovie } from '../../database/entities/watched-movie.entity';
import { makeFavorite, makeMovie, makeUser, makeWatchedMovie } from '../../testing/factories';
import { createBaseRepositoryMock } from '../../testing/repository-mock';
import { MoviesService } from './movies.service';

describe('MoviesService', () => {
  let service: MoviesService;

  const moviesRepository = createBaseRepositoryMock<Movie>('findAll', 'findById', 'update', 'delete');
  const usersRepository = createBaseRepositoryMock<User>('findById', 'increment');
  const watchedMoviesRepository = createBaseRepositoryMock<WatchedMovie>('count', 'insert');
  const favoritesRepository = createBaseRepositoryMock<Favorite>('count', 'insert');

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        MoviesService,
        { provide: Movie, useValue: moviesRepository },
        { provide: User, useValue: usersRepository },
        { provide: WatchedMovie, useValue: watchedMoviesRepository },
        { provide: Favorite, useValue: favoritesRepository },
      ],
    }).compile();
    service = moduleRef.get(MoviesService);
  });

  it('lista o catalogo mapeado para DTO', async () => {
    moviesRepository.findAll.mockReturnValue([makeMovie({ id: 1 }), makeMovie({ id: 2, title: 'Outro' })]);

    const result = await service.list();

    expect(result).toEqual([
      { id: 1, title: 'Matriz', genre: 'Ficcao', synopsis: 'Sinopse original', year: 1999, durationMin: 136 },
      { id: 2, title: 'Outro', genre: 'Ficcao', synopsis: 'Sinopse original', year: 1999, durationMin: 136 },
    ]);
  });

  it('retorna 404 quando o filme nao existe', async () => {
    moviesRepository.findById.mockReturnValue(undefined);

    await expect(service.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('watcha: cria historico na proxima posicao e soma a duracao', async () => {
    moviesRepository.findById.mockReturnValue(makeMovie({ durationMin: 136 }));
    usersRepository.findById.mockReturnValue(makeUser({ watchedMovieMinutes: 10 }));
    watchedMoviesRepository.count.mockReturnValue(2);
    watchedMoviesRepository.insert.mockImplementation((entry) => entry);

    const result = await service.watch(1, 7);

    expect(result).toEqual({ watchedMovieMinutes: 146 });
    expect(watchedMoviesRepository.insert).toHaveBeenCalledWith({
      userId: 7,
      movieId: 1,
      titleSnapshot: 'Matriz',
      position: 2,
    });
    expect(usersRepository.increment).toHaveBeenCalledWith(7, 'watchedMovieMinutes', 136);
  });

  it('favorite: cria historico + favorito e soma a duracao uma vez (D-04)', async () => {
    moviesRepository.findById.mockReturnValue(makeMovie({ durationMin: 90 }));
    usersRepository.findById.mockReturnValue(makeUser({ watchedMovieMinutes: 0 }));
    watchedMoviesRepository.count.mockReturnValue(0);
    watchedMoviesRepository.insert.mockImplementation((entry) => entry);
    favoritesRepository.count.mockReturnValue(0);
    favoritesRepository.insert.mockImplementation((entry) => entry);

    const result = await service.favorite(1, 7);

    expect(result).toEqual({ watchedMovieMinutes: 90 });
    expect(watchedMoviesRepository.insert).toHaveBeenCalledTimes(1);
    expect(favoritesRepository.insert).toHaveBeenCalledWith({
      userId: 7,
      mediaType: 'movie',
      movieId: 1,
      seriesId: null,
      titleSnapshot: 'Matriz',
      position: 0,
    });
    expect(usersRepository.increment).toHaveBeenCalledWith(7, 'watchedMovieMinutes', 90);
  });

  it('nao soma tempo quando a duracao e nula', async () => {
    moviesRepository.findById.mockReturnValue(makeMovie({ durationMin: null }));
    usersRepository.findById.mockReturnValue(makeUser({ watchedMovieMinutes: 50 }));
    watchedMoviesRepository.count.mockReturnValue(0);
    watchedMoviesRepository.insert.mockImplementation((entry) => entry);

    const result = await service.watch(1, 1);

    expect(result).toEqual({ watchedMovieMinutes: 50 });
    expect(usersRepository.increment).not.toHaveBeenCalled();
  });

  it('remove apaga pelo id (soft delete do mini-ORM)', async () => {
    moviesRepository.findById.mockReturnValue(makeMovie());
    moviesRepository.delete.mockReturnValue(true);

    await service.remove(1);

    expect(moviesRepository.delete).toHaveBeenCalledWith(1);
  });

  it('updateSynopsis altera somente a sinopse', async () => {
    moviesRepository.findById
      .mockReturnValueOnce(makeMovie())
      .mockReturnValueOnce(makeMovie({ synopsis: 'Nova sinopse' }));

    const result = await service.updateSynopsis(1, 'Nova sinopse');

    expect(moviesRepository.update).toHaveBeenCalledWith(1, { synopsis: 'Nova sinopse' });
    expect(result.synopsis).toBe('Nova sinopse');
    expect(result.title).toBe('Matriz');
  });

  it('mapeia favorito de filme com sucesso (sanidade das factories)', () => {
    expect(makeFavorite().mediaType).toBe('movie');
    expect(makeWatchedMovie().titleSnapshot).toBe('Matriz');
  });
});
