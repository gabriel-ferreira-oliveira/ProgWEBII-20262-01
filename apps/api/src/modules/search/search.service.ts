import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { SearchResultDto } from '@ceviu/shared';
import { toMovieDto, toSeriesDto } from '../../common/mappers';
import { Movie } from '../../database/entities/movie.entity';
import { Series } from '../../database/entities/series.entity';
import type { SearchQueryDto } from './dto/search-query.dto';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Movie)
    private readonly movies: Repository<Movie>,
    @InjectRepository(Series)
    private readonly series: Repository<Series>,
  ) {}

  async search(query: SearchQueryDto): Promise<SearchResultDto> {
    const title = query.title;
    const id = query.id;
    const hasTitle = title !== undefined && title.length > 0;
    const hasId = id !== undefined;

    if (!hasTitle && !hasId) {
      throw new BadRequestException('Campos de pesquisa vazio');
    }
    if (hasTitle && hasId) {
      throw new BadRequestException('Apenas um campo pode ser prenchido para a pesquisa');
    }

    if (hasId && id !== undefined) {
      return this.searchById(id);
    }

    return this.searchByTitle(title ?? '');
  }

  private async searchById(id: number): Promise<SearchResultDto> {
    const [movies, series] = await Promise.all([
      this.movies.find({ where: { id }, order: { id: 'ASC' } }),
      this.series.find({ where: { id }, order: { id: 'ASC' } }),
    ]);
    return { movies: movies.map(toMovieDto), series: series.map(toSeriesDto) };
  }

  private async searchByTitle(title: string): Promise<SearchResultDto> {
    const escaped = title.toLowerCase().replace(/[\\%_]/g, (match) => `\\${match}`);
    const term = `%${escaped}%`;
    const [movies, series] = await Promise.all([
      this.movies
        .createQueryBuilder('movie')
        .where("LOWER(movie.title) LIKE :term ESCAPE '\\'", { term })
        .orderBy('movie.id', 'ASC')
        .getMany(),
      this.series
        .createQueryBuilder('series')
        .where("LOWER(series.title) LIKE :term ESCAPE '\\'", { term })
        .orderBy('series.id', 'ASC')
        .getMany(),
    ]);
    return { movies: movies.map(toMovieDto), series: series.map(toSeriesDto) };
  }
}
