import { Inject, Injectable } from '@nestjs/common';
import type { SearchResultDto } from '@ceviu/shared';
import { toMovieDto, toSeriesDto } from '../../common/mappers';
import { BaseRepository } from '../../framework/orm/base-repository';
import { Movie } from '../../database/entities/movie.entity';
import { Series } from '../../database/entities/series.entity';
import type { SearchQueryDto } from './dto/search-query.dto';

@Injectable()
export class SearchService {
  constructor(
    @Inject(Movie)
    private readonly movies: BaseRepository<Movie>,
    @Inject(Series)
    private readonly series: BaseRepository<Series>,
  ) {}

  /** O pipe global garante exatamente um filtro (`@ExactlyOneOf` no DTO) antes de chegar aqui. */
  async search(query: SearchQueryDto): Promise<SearchResultDto> {
    if (query.id !== undefined) {
      return this.searchById(query.id);
    }

    return this.searchByTitle(query.title ?? '');
  }

  private searchById(id: number): SearchResultDto {
    const movies = this.movies.findAll({ where: { id }, order: { id: 'ASC' } });
    const series = this.series.findAll({ where: { id }, order: { id: 'ASC' } });
    return { movies: movies.map(toMovieDto), series: series.map(toSeriesDto) };
  }

  private searchByTitle(title: string): SearchResultDto {
    const escaped = title.toLowerCase().replace(/[\\%_]/g, (match) => `\\${match}`);
    const term = `%${escaped}%`;
    const movies = this.movies.query().where('title', 'LIKE', term).orderBy('id', 'ASC').all();
    const series = this.series.query().where('title', 'LIKE', term).orderBy('id', 'ASC').all();
    return { movies: movies.map(toMovieDto), series: series.map(toSeriesDto) };
  }
}
