import { Inject, Injectable } from '@nestjs/common';
import type { SeriesDto, SeriesWatchResultDto } from '@ceviu/shared';
import { MediaService } from '../../common/media/media-service';
import { toSeriesDto } from '../../common/mappers';
import { BaseRepository } from '../../framework/orm/base-repository';
import { Database } from '../../framework/orm/database';
import { Favorite } from '../../database/entities/favorite.entity';
import { Series } from '../../database/entities/series.entity';
import { User } from '../../database/entities/user.entity';
import { WatchedSeries } from '../../database/entities/watched-series.entity';

@Injectable()
export class SeriesService {
  private readonly media: MediaService<Series, SeriesDto, SeriesWatchResultDto, WatchedSeries>;

  constructor(
    @Inject(Database)
    database: Database,
    @Inject(Series)
    series: BaseRepository<Series>,
    @Inject(User)
    users: BaseRepository<User>,
    @Inject(WatchedSeries)
    watchedSeries: BaseRepository<WatchedSeries>,
    @Inject(Favorite)
    favorites: BaseRepository<Favorite>,
  ) {
    this.media = new MediaService<Series, SeriesDto, SeriesWatchResultDto, WatchedSeries>({
      database,
      repository: series,
      toDto: toSeriesDto,
      notFoundMessage: 'Serie nao encontrada',
      saveSynopsis: (id, synopsis) => {
        series.update(id, { synopsis });
      },
      watch: {
        usersRepository: users,
        watchedRepository: watchedSeries,
        favoritesRepository: favorites,
        watchedEntryOf: (serie, userId, position) =>
          Object.assign(new WatchedSeries(), {
            userId,
            seriesId: serie.id,
            titleSnapshot: serie.title,
            position,
          }),
        favoriteEntryOf: (serie, userId, position) =>
          Object.assign(new Favorite(), {
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
