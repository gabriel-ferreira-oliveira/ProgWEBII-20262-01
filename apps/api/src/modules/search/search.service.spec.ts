import { Test } from '@nestjs/testing';
import { Movie } from '../../database/entities/movie.entity';
import { Series } from '../../database/entities/series.entity';
import { makeMovie, makeSeries } from '../../testing/factories';
import { createBaseRepositoryMock } from '../../testing/repository-mock';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;

  const queryBuilder = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    all: jest.fn(),
  };
  const moviesRepository = createBaseRepositoryMock<Movie>('findAll', 'query');
  const seriesRepository = createBaseRepositoryMock<Series>('findAll', 'query');

  beforeEach(async () => {
    jest.clearAllMocks();
    queryBuilder.where.mockReturnThis();
    queryBuilder.orderBy.mockReturnThis();
    moviesRepository.query.mockReturnValue(queryBuilder);
    seriesRepository.query.mockReturnValue(queryBuilder);

    const moduleRef = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: Movie, useValue: moviesRepository },
        { provide: Series, useValue: seriesRepository },
      ],
    }).compile();
    service = moduleRef.get(SearchService);
  });

  it('busca por titulo (contains, case-insensitive) com escape de curingas', async () => {
    queryBuilder.all.mockReturnValueOnce([makeMovie()]).mockReturnValueOnce([makeSeries()]);

    const result = await service.search({ title: '100% matriz' });

    expect(queryBuilder.where).toHaveBeenCalledWith('title', 'LIKE', '%100\\% matriz%');
    expect(result.movies).toHaveLength(1);
    expect(result.series).toHaveLength(1);
  });

  it('busca por id exato em filmes e series', async () => {
    moviesRepository.findAll.mockReturnValue([makeMovie({ id: 7 })]);
    seriesRepository.findAll.mockReturnValue([]);

    const result = await service.search({ id: 7 });

    expect(moviesRepository.findAll).toHaveBeenCalledWith({
      where: { id: 7 },
      order: { id: 'ASC' },
    });
    expect(result.movies).toEqual([
      { id: 7, title: 'Matriz', genre: 'Ficcao', synopsis: 'Sinopse original', year: 1999, durationMin: 136 },
    ]);
    expect(result.series).toEqual([]);
  });
});
