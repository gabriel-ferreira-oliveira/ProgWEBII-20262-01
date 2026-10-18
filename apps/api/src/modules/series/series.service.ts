import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { SeriesDto, SeriesWatchResultDto } from '@ceviu/shared';
import { toSeriesDto } from '../../common/mappers';
import { Favorite } from '../../database/entities/favorite.entity';
import { Series } from '../../database/entities/series.entity';
import { User } from '../../database/entities/user.entity';
import { WatchedSeries } from '../../database/entities/watched-series.entity';

@Injectable()
export class SeriesService {
  constructor(
    @InjectRepository(Series)
    private readonly series: Repository<Series>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(WatchedSeries)
    private readonly watchedSeries: Repository<WatchedSeries>,
    @InjectRepository(Favorite)
    private readonly favorites: Repository<Favorite>,
  ) {}

  async list(): Promise<SeriesDto[]> {
    const series = await this.series.find({ order: { id: 'ASC' } });
    return series.map(toSeriesDto);
  }

  async findEntity(id: number): Promise<Series> {
    const serie = await this.series.findOne({ where: { id } });
    if (serie === null) {
      throw new NotFoundException('Serie nao encontrada');
    }
    return serie;
  }

  async findOne(id: number): Promise<SeriesDto> {
    return toSeriesDto(await this.findEntity(id));
  }

  async updateSynopsis(id: number, synopsis: string): Promise<SeriesDto> {
    const serie = await this.findEntity(id);
    serie.synopsis = synopsis;
    const saved = await this.series.save(serie);
    return toSeriesDto(saved);
  }

  async remove(id: number): Promise<void> {
    await this.findEntity(id);
    await this.series.softDelete({ id });
  }

  async watch(id: number, userId: number): Promise<SeriesWatchResultDto> {
    const serie = await this.findEntity(id);
    const watchedSeriesMinutes = await this.appendWatchedSeries(serie, userId, true);
    return { watchedSeriesMinutes };
  }

  async favorite(id: number, userId: number): Promise<SeriesWatchResultDto> {
    const serie = await this.findEntity(id);
    const watchedSeriesMinutes = await this.appendWatchedSeries(serie, userId, false);
    await this.appendFavorite(serie, userId);
    return { watchedSeriesMinutes };
  }

  private async appendWatchedSeries(
    serie: Series,
    userId: number,
    countTime: boolean,
  ): Promise<number> {
    const user = await this.findUser(userId);
    const position = await this.watchedSeries.count({ where: { userId } });
    const entry = this.watchedSeries.create({
      userId,
      seriesId: serie.id,
      titleSnapshot: serie.title,
      position,
    });
    await this.watchedSeries.save(entry);

    const minutes = countTime ? (serie.durationMin ?? 0) : 0;
    if (minutes > 0) {
      await this.users.increment({ id: userId }, 'watchedSeriesMinutes', minutes);
    }
    return user.watchedSeriesMinutes + minutes;
  }

  private async appendFavorite(serie: Series, userId: number): Promise<void> {
    const position = await this.favorites.count({ where: { userId } });
    const favorite = this.favorites.create({
      userId,
      mediaType: 'series',
      movieId: null,
      seriesId: serie.id,
      titleSnapshot: serie.title,
      position,
    });
    await this.favorites.save(favorite);
  }

  private async findUser(userId: number): Promise<User> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (user === null) {
      throw new NotFoundException('Usuario nao encontrado');
    }
    return user;
  }
}
