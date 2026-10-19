import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Favorite } from '../../database/entities/favorite.entity';
import { User } from '../../database/entities/user.entity';
import { WatchedMovie } from '../../database/entities/watched-movie.entity';
import { WatchedSeries } from '../../database/entities/watched-series.entity';
import { makeFavorite, makeUser, makeWatchedMovie } from '../../testing/factories';
import { createBaseRepositoryMock } from '../../testing/repository-mock';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const usersQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    all: jest.fn(),
  };
  const usersRepository = createBaseRepositoryMock<User>('findById', 'query');
  const watchedMoviesRepository = createBaseRepositoryMock<WatchedMovie>('findAll');
  const watchedSeriesRepository = createBaseRepositoryMock<WatchedSeries>('findAll');
  const favoritesRepository = createBaseRepositoryMock<Favorite>('findAll');

  beforeEach(async () => {
    jest.clearAllMocks();
    usersQueryBuilder.where.mockReturnThis();
    usersQueryBuilder.orderBy.mockReturnThis();
    usersRepository.query.mockReturnValue(usersQueryBuilder);

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: User, useValue: usersRepository },
        { provide: WatchedMovie, useValue: watchedMoviesRepository },
        { provide: WatchedSeries, useValue: watchedSeriesRepository },
        { provide: Favorite, useValue: favoritesRepository },
      ],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  it('lista a comunidade excluindo o usuario logado', async () => {
    usersQueryBuilder.all.mockReturnValue([
      makeUser({ id: 1, name: 'A' }),
      makeUser({ id: 2, name: 'B' }),
    ]);

    const result = await service.listCommunity(2);

    expect(usersQueryBuilder.where).toHaveBeenCalledWith('id', '<>', 2);
    expect(result).toEqual([
      { id: 1, name: 'A', age: 21 },
      { id: 2, name: 'B', age: 21 },
    ]);
  });

  it('detalhe devolve perfil e tempos', async () => {
    usersRepository.findById.mockReturnValue(
      makeUser({
        watchedMovieMinutes: 100,
        watchedSeriesMinutes: 200,
        totalMinutes: 0,
      }),
    );

    const result = await service.getDetail(1);

    expect(result.times).toEqual({
      watchedMovieMinutes: 100,
      watchedSeriesMinutes: 200,
      totalMinutes: 0,
    });
    expect(result.profile.email).toBe('gsb@gmail.com');
  });

  it('lista assistidos em ordem de posicao', async () => {
    usersRepository.findById.mockReturnValue(makeUser());
    watchedMoviesRepository.findAll.mockReturnValue([
      makeWatchedMovie({ position: 0, titleSnapshot: 'A' }),
      makeWatchedMovie({ id: 2, position: 1, titleSnapshot: 'B' }),
    ]);

    const result = await service.getWatchedMovies(1);

    expect(watchedMoviesRepository.findAll).toHaveBeenCalledWith({
      where: { userId: 1 },
      order: { position: 'ASC' },
    });
    expect(result.map((entry) => entry.title)).toEqual(['A', 'B']);
  });

  it('favoritos mapeados com tipo de midia', async () => {
    usersRepository.findById.mockReturnValue(makeUser());
    favoritesRepository.findAll.mockReturnValue([
      makeFavorite({ mediaType: 'series', movieId: null, seriesId: 3 }),
    ]);

    const result = await service.getFavorites(1);

    expect(result).toEqual([
      { title: 'Matriz', mediaType: 'series', position: 0, movieId: null, seriesId: 3 },
    ]);
  });

  it('retorna 404 para usuario inexistente', async () => {
    usersRepository.findById.mockReturnValue(undefined);

    await expect(service.getDetail(99)).rejects.toBeInstanceOf(NotFoundException);
  });
});
