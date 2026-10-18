import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Favorite } from '../../database/entities/favorite.entity';
import { Series } from '../../database/entities/series.entity';
import { User } from '../../database/entities/user.entity';
import { WatchedSeries } from '../../database/entities/watched-series.entity';
import { makeSeries, makeUser } from '../../testing/factories';
import { createRepositoryMock } from '../../testing/repository-mock';
import { SeriesService } from './series.service';

describe('SeriesService', () => {
  let service: SeriesService;

  const seriesRepository = createRepositoryMock<Series>('find', 'findOne', 'save', 'softDelete');
  const usersRepository = createRepositoryMock<User>('findOne', 'increment');
  const watchedSeriesRepository = createRepositoryMock<WatchedSeries>('count', 'create', 'save');
  const favoritesRepository = createRepositoryMock<Favorite>('count', 'create', 'save');

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        SeriesService,
        { provide: getRepositoryToken(Series), useValue: seriesRepository },
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: getRepositoryToken(WatchedSeries), useValue: watchedSeriesRepository },
        { provide: getRepositoryToken(Favorite), useValue: favoritesRepository },
      ],
    }).compile();
    service = moduleRef.get(SeriesService);
  });

  it('watch soma a duracao x1 (paridade com o legado)', async () => {
    seriesRepository.findOne.mockResolvedValue(makeSeries({ durationMin: 45 }));
    usersRepository.findOne.mockResolvedValue(makeUser({ watchedSeriesMinutes: 10 }));
    watchedSeriesRepository.count.mockResolvedValue(1);
    watchedSeriesRepository.create.mockImplementation((input) => input);
    watchedSeriesRepository.save.mockResolvedValue(undefined);
    usersRepository.increment.mockResolvedValue({});

    const result = await service.watch(1, 3);

    expect(result).toEqual({ watchedSeriesMinutes: 55 });
    expect(watchedSeriesRepository.create).toHaveBeenCalledWith({
      userId: 3,
      seriesId: 1,
      titleSnapshot: 'Breaking Bad',
      position: 1,
    });
    expect(usersRepository.increment).toHaveBeenCalledWith({ id: 3 }, 'watchedSeriesMinutes', 45);
  });

  it('favorite cria historico + favorito sem somar tempo', async () => {
    seriesRepository.findOne.mockResolvedValue(makeSeries({ durationMin: 45 }));
    usersRepository.findOne.mockResolvedValue(makeUser({ watchedSeriesMinutes: 300 }));
    watchedSeriesRepository.count.mockResolvedValue(0);
    watchedSeriesRepository.create.mockImplementation((input) => input);
    watchedSeriesRepository.save.mockResolvedValue(undefined);
    favoritesRepository.count.mockResolvedValue(4);
    favoritesRepository.create.mockImplementation((input) => input);
    favoritesRepository.save.mockResolvedValue(undefined);

    const result = await service.favorite(1, 3);

    expect(result).toEqual({ watchedSeriesMinutes: 300 });
    expect(usersRepository.increment).not.toHaveBeenCalled();
    expect(favoritesRepository.create).toHaveBeenCalledWith({
      userId: 3,
      mediaType: 'series',
      movieId: null,
      seriesId: 1,
      titleSnapshot: 'Breaking Bad',
      position: 4,
    });
  });

  it('retorna 404 quando a serie nao existe', async () => {
    seriesRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('remove faz soft delete', async () => {
    seriesRepository.findOne.mockResolvedValue(makeSeries());
    seriesRepository.softDelete.mockResolvedValue({ affected: 1 });

    await service.remove(1);

    expect(seriesRepository.softDelete).toHaveBeenCalledWith({ id: 1 });
  });
});
