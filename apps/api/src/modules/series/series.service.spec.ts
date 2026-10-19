import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Favorite } from '../../database/entities/favorite.entity';
import { Series } from '../../database/entities/series.entity';
import { User } from '../../database/entities/user.entity';
import { WatchedSeries } from '../../database/entities/watched-series.entity';
import { makeSeries, makeUser } from '../../testing/factories';
import { createBaseRepositoryMock } from '../../testing/repository-mock';
import { SeriesService } from './series.service';

describe('SeriesService', () => {
  let service: SeriesService;

  const seriesRepository = createBaseRepositoryMock<Series>('findAll', 'findById', 'update', 'delete');
  const usersRepository = createBaseRepositoryMock<User>('findById', 'increment');
  const watchedSeriesRepository = createBaseRepositoryMock<WatchedSeries>('count', 'insert');
  const favoritesRepository = createBaseRepositoryMock<Favorite>('count', 'insert');

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        SeriesService,
        { provide: Series, useValue: seriesRepository },
        { provide: User, useValue: usersRepository },
        { provide: WatchedSeries, useValue: watchedSeriesRepository },
        { provide: Favorite, useValue: favoritesRepository },
      ],
    }).compile();
    service = moduleRef.get(SeriesService);
  });

  it('watch soma a duracao x1 (paridade com o legado)', async () => {
    seriesRepository.findById.mockReturnValue(makeSeries({ durationMin: 45 }));
    usersRepository.findById.mockReturnValue(makeUser({ watchedSeriesMinutes: 10 }));
    watchedSeriesRepository.count.mockReturnValue(1);
    watchedSeriesRepository.insert.mockImplementation((entry) => entry);

    const result = await service.watch(1, 3);

    expect(result).toEqual({ watchedSeriesMinutes: 55 });
    expect(watchedSeriesRepository.insert).toHaveBeenCalledWith({
      userId: 3,
      seriesId: 1,
      titleSnapshot: 'Breaking Bad',
      position: 1,
    });
    expect(usersRepository.increment).toHaveBeenCalledWith(3, 'watchedSeriesMinutes', 45);
  });

  it('favorite cria historico + favorito sem somar tempo', async () => {
    seriesRepository.findById.mockReturnValue(makeSeries({ durationMin: 45 }));
    usersRepository.findById.mockReturnValue(makeUser({ watchedSeriesMinutes: 300 }));
    watchedSeriesRepository.count.mockReturnValue(0);
    watchedSeriesRepository.insert.mockImplementation((entry) => entry);
    favoritesRepository.count.mockReturnValue(4);
    favoritesRepository.insert.mockImplementation((entry) => entry);

    const result = await service.favorite(1, 3);

    expect(result).toEqual({ watchedSeriesMinutes: 300 });
    expect(usersRepository.increment).not.toHaveBeenCalled();
    expect(favoritesRepository.insert).toHaveBeenCalledWith({
      userId: 3,
      mediaType: 'series',
      movieId: null,
      seriesId: 1,
      titleSnapshot: 'Breaking Bad',
      position: 4,
    });
  });

  it('retorna 404 quando a serie nao existe', async () => {
    seriesRepository.findById.mockReturnValue(undefined);

    await expect(service.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('remove apaga pelo id (soft delete do mini-ORM)', async () => {
    seriesRepository.findById.mockReturnValue(makeSeries());
    seriesRepository.delete.mockReturnValue(true);

    await service.remove(1);

    expect(seriesRepository.delete).toHaveBeenCalledWith(1);
  });
});
