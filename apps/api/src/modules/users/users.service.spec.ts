import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Favorite } from '../../database/entities/favorite.entity';
import { User } from '../../database/entities/user.entity';
import { WatchedMovie } from '../../database/entities/watched-movie.entity';
import { WatchedSeries } from '../../database/entities/watched-series.entity';
import { makeFavorite, makeUser, makeWatchedMovie } from '../../testing/factories';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const usersQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };
  const usersRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const watchedMoviesRepository = {
    find: jest.fn(),
  };
  const watchedSeriesRepository = {
    find: jest.fn(),
  };
  const favoritesRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    usersQueryBuilder.where.mockReturnThis();
    usersQueryBuilder.orderBy.mockReturnThis();
    usersRepository.createQueryBuilder.mockReturnValue(usersQueryBuilder);

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: getRepositoryToken(WatchedMovie), useValue: watchedMoviesRepository },
        { provide: getRepositoryToken(WatchedSeries), useValue: watchedSeriesRepository },
        { provide: getRepositoryToken(Favorite), useValue: favoritesRepository },
      ],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  it('lista a comunidade excluindo o usuario logado', async () => {
    usersQueryBuilder.getMany.mockResolvedValue([
      makeUser({ id: 1, name: 'A' }),
      makeUser({ id: 2, name: 'B' }),
    ]);

    const result = await service.listCommunity(2);

    expect(usersQueryBuilder.where).toHaveBeenCalledWith('user.id != :currentUserId', {
      currentUserId: 2,
    });
    expect(result).toEqual([
      { id: 1, name: 'A', age: 21 },
      { id: 2, name: 'B', age: 21 },
    ]);
  });

  it('detalhe devolve perfil e tempos', async () => {
    usersRepository.findOne.mockResolvedValue(
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
    usersRepository.findOne.mockResolvedValue(makeUser());
    watchedMoviesRepository.find.mockResolvedValue([
      makeWatchedMovie({ position: 0, titleSnapshot: 'A' }),
      makeWatchedMovie({ id: 2, position: 1, titleSnapshot: 'B' }),
    ]);

    const result = await service.getWatchedMovies(1);

    expect(watchedMoviesRepository.find).toHaveBeenCalledWith({
      where: { userId: 1 },
      order: { position: 'ASC' },
    });
    expect(result.map((entry) => entry.title)).toEqual(['A', 'B']);
  });

  it('favoritos mapeados com tipo de midia', async () => {
    usersRepository.findOne.mockResolvedValue(makeUser());
    favoritesRepository.find.mockResolvedValue([makeFavorite({ mediaType: 'series', movieId: null, seriesId: 3 })]);

    const result = await service.getFavorites(1);

    expect(result).toEqual([
      { title: 'Matriz', mediaType: 'series', position: 0, movieId: null, seriesId: 3 },
    ]);
  });

  it('retorna 404 para usuario inexistente', async () => {
    usersRepository.findOne.mockResolvedValue(null);

    await expect(service.getDetail(99)).rejects.toBeInstanceOf(NotFoundException);
  });
});
