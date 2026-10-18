import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { SeriesDto, SeriesWatchResultDto } from '@ceviu/shared';
import { MediaService } from '../../common/media/media-service';
import { toSeriesDto } from '../../common/mappers';
import { Favorite } from '../../database/entities/favorite.entity';
import { Series } from '../../database/entities/series.entity';
import { User } from '../../database/entities/user.entity';
import { WatchedSeries } from '../../database/entities/watched-series.entity';

@Injectable()
export class SeriesService {
  private readonly media: MediaService<Series, SeriesDto, SeriesWatchResultDto, WatchedSeries>;

  constructor(
    @InjectRepository(Series)
    series: Repository<Series>,
    @InjectRepository(User)
    users: Repository<User>,
    @InjectRepository(WatchedSeries)
    watchedSeries: Repository<WatchedSeries>,
    @InjectRepository(Favorite)
    favorites: Repository<Favorite>,
  ) {
    this.media = new MediaService<Series, SeriesDto, SeriesWatchResultDto, WatchedSeries>({
      repository: series,
      toDto: toSeriesDto,
      notFoundMessage: 'Serie nao encontrada',
      watch: {
        usersRepository: users,
        watchedRepository: watchedSeries,
        favoritesRepository: favorites,
        watchedEntryOf: (serie, userId, position) => ({
          userId,
          seriesId: serie.id,
          titleSnapshot: serie.title,
          position,
        }),
        favoriteEntryOf: (serie, userId, position) => ({
          userId,
          mediaType: 'series',
          movieId: null,
          seriesId: serie.id,
          titleSnapshot: serie.title,
          position,
        }),
        counterField: 'watchedSeriesMinutes',
        counterOf: (user) => user.watchedSeriesMinutes,
        toResult: (watchedSeriesMinutes) => ({ watchedSeriesMinutes }),
        countTimeOnFavorite: false,
      },
    });
  }

  async list(): Promise<SeriesDto[]> {
    return this.media.list();
  }

  async findOne(id: number): Promise<SeriesDto> {
    return this.media.findOne(id);
  }

  async updateSynopsis(id: number, synopsis: string): Promise<SeriesDto> {
    return this.media.updateSynopsis(id, synopsis);
  }

  async remove(id: number): Promise<void> {
    return this.media.remove(id);
  }

  async watch(id: number, userId: number): Promise<SeriesWatchResultDto> {
    return this.media.watch(id, userId);
  }

  async favorite(id: number, userId: number): Promise<SeriesWatchResultDto> {
    return this.media.favorite(id, userId);
  }
}
