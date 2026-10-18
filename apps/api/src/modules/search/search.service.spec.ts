import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Movie } from '../../database/entities/movie.entity';
import { Series } from '../../database/entities/series.entity';
import { makeMovie, makeSeries } from '../../testing/factories';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;

  const queryBuilder = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };
  const moviesRepository = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const seriesRepository = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    queryBuilder.where.mockReturnThis();
    queryBuilder.orderBy.mockReturnThis();
    moviesRepository.createQueryBuilder.mockReturnValue(queryBuilder);
    seriesRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const moduleRef = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: getRepositoryToken(Movie), useValue: moviesRepository },
        { provide: getRepositoryToken(Series), useValue: seriesRepository },
      ],
    }).compile();
    service = moduleRef.get(SearchService);
  });

  it('busca por titulo (contains, case-insensitive) com escape de curingas', async () => {
    queryBuilder.getMany
      .mockResolvedValueOnce([makeMovie()])
      .mockResolvedValueOnce([makeSeries()]);

    const result = await service.search({ title: '100% matriz' });

    expect(queryBuilder.where).toHaveBeenCalledWith("LOWER(movie.title) LIKE :term ESCAPE '\\'", {
      term: '%100\\% matriz%',
    });
    expect(result.movies).toHaveLength(1);
    expect(result.series).toHaveLength(1);
  });

  it('busca por id exato em filmes e series', async () => {
    moviesRepository.find.mockResolvedValue([makeMovie({ id: 7 })]);
    seriesRepository.find.mockResolvedValue([]);

    const result = await service.search({ id: 7 });

    expect(moviesRepository.find).toHaveBeenCalledWith({ where: { id: 7 }, order: { id: 'ASC' } });
    expect(result.movies).toEqual([
      { id: 7, title: 'Matriz', genre: 'Ficcao', synopsis: 'Sinopse original', year: 1999, durationMin: 136 },
    ]);
    expect(result.series).toEqual([]);
  });
});
