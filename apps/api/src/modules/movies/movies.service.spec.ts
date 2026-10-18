import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Favorite } from '../../database/entities/favorite.entity';
import { Movie } from '../../database/entities/movie.entity';
import { User } from '../../database/entities/user.entity';
import { WatchedMovie } from '../../database/entities/watched-movie.entity';
import { makeFavorite, makeMovie, makeUser, makeWatchedMovie } from '../../testing/factories';
import { createRepositoryMock } from '../../testing/repository-mock';
import { MoviesService } from './movies.service';

describe('MoviesService', () => {
  let service: MoviesService;

  const moviesRepository = createRepositoryMock<Movie>('find', 'findOne', 'save', 'softDelete');
  const usersRepository = createRepositoryMock<User>('findOne', 'increment');
  const watchedMoviesRepository = createRepositoryMock<WatchedMovie>('count', 'create', 'save');
  const favoritesRepository = createRepositoryMock<Favorite>('count', 'create', 'save');

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        MoviesService,
        { provide: getRepositoryToken(Movie), useValue: moviesRepository },
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: getRepositoryToken(WatchedMovie), useValue: watchedMoviesRepository },
        { provide: getRepositoryToken(Favorite), useValue: favoritesRepository },
      ],
    }).compile();
    service = moduleRef.get(MoviesService);
  });

  it('lista o catalogo mapeado para DTO', async () => {
    moviesRepository.find.mockResolvedValue([makeMovie({ id: 1 }), makeMovie({ id: 2, title: 'Outro' })]);

    const result = await service.list();

    expect(result).toEqual([
      { id: 1, title: 'Matriz', genre: 'Ficcao', synopsis: 'Sinopse original', year: 1999, durationMin: 136 },
      { id: 2, title: 'Outro', genre: 'Ficcao', synopsis: 'Sinopse original', year: 1999, durationMin: 136 },
    ]);
  });

  it('retorna 404 quando o filme nao existe', async () => {
    moviesRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('watcha: cria historico na proxima posicao e soma a duracao', async () => {
    moviesRepository.findOne.mockResolvedValue(makeMovie({ durationMin: 136 }));
    usersRepository.findOne.mockResolvedValue(makeUser({ watchedMovieMinutes: 10 }));
    watchedMoviesRepository.count.mockResolvedValue(2);
    watchedMoviesRepository.create.mockImplementation((input) => input);
    watchedMoviesRepository.save.mockResolvedValue(undefined);
    usersRepository.increment.mockResolvedValue({});

    const result = await service.watch(1, 7);

    expect(result).toEqual({ watchedMovieMinutes: 146 });
    expect(watchedMoviesRepository.create).toHaveBeenCalledWith({
      userId: 7,
      movieId: 1,
      titleSnapshot: 'Matriz',
      position: 2,
    });
    expect(usersRepository.increment).toHaveBeenCalledWith({ id: 7 }, 'watchedMovieMinutes', 136);
  });

  it('favorite: cria historico + favorito e soma a duracao uma vez (D-04)', async () => {
    moviesRepository.findOne.mockResolvedValue(makeMovie({ durationMin: 90 }));
    usersRepository.findOne.mockResolvedValue(makeUser({ watchedMovieMinutes: 0 }));
    watchedMoviesRepository.count.mockResolvedValue(0);
    watchedMoviesRepository.create.mockImplementation((input) => input);
    watchedMoviesRepository.save.mockResolvedValue(undefined);
    favoritesRepository.count.mockResolvedValue(0);
    favoritesRepository.create.mockImplementation((input) => input);
    favoritesRepository.save.mockResolvedValue(undefined);
    usersRepository.increment.mockResolvedValue({});

    const result = await service.favorite(1, 7);

    expect(result).toEqual({ watchedMovieMinutes: 90 });
    expect(watchedMoviesRepository.save).toHaveBeenCalledTimes(1);
    expect(favoritesRepository.create).toHaveBeenCalledWith({
      userId: 7,
      mediaType: 'movie',
      movieId: 1,
      seriesId: null,
      titleSnapshot: 'Matriz',
      position: 0,
    });
    expect(usersRepository.increment).toHaveBeenCalledWith({ id: 7 }, 'watchedMovieMinutes', 90);
  });

  it('nao soma tempo quando a duracao e nula', async () => {
    moviesRepository.findOne.mockResolvedValue(makeMovie({ durationMin: null }));
    usersRepository.findOne.mockResolvedValue(makeUser({ watchedMovieMinutes: 50 }));
    watchedMoviesRepository.count.mockResolvedValue(0);
    watchedMoviesRepository.create.mockImplementation((input) => input);
    watchedMoviesRepository.save.mockResolvedValue(undefined);

    const result = await service.watch(1, 1);

    expect(result).toEqual({ watchedMovieMinutes: 50 });
    expect(usersRepository.increment).not.toHaveBeenCalled();
  });

  it('remove faz soft delete', async () => {
    moviesRepository.findOne.mockResolvedValue(makeMovie());
    moviesRepository.softDelete.mockResolvedValue({ affected: 1 });

    await service.remove(1);

    expect(moviesRepository.softDelete).toHaveBeenCalledWith({ id: 1 });
  });

  it('updateSynopsis altera somente a sinopse', async () => {
    const movie = makeMovie();
    moviesRepository.findOne.mockResolvedValue(movie);
    moviesRepository.save.mockImplementation((input) => Promise.resolve(input));

    const result = await service.updateSynopsis(1, 'Nova sinopse');

    expect(result.synopsis).toBe('Nova sinopse');
    expect(result.title).toBe('Matriz');
  });

  it('mapeia favorito de filme com sucesso (sanidade das factories)', () => {
    expect(makeFavorite().mediaType).toBe('movie');
    expect(makeWatchedMovie().titleSnapshot).toBe('Matriz');
  });
});
