import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  FavoriteEntryDto,
  UserDetailDto,
  UserSummaryDto,
  WatchedEntryDto,
} from '@ceviu/shared';
import {
  toFavoriteEntryDto,
  toUserProfileDto,
  toUserSummaryDto,
  toUserTimesDto,
  toWatchedMovieEntryDto,
  toWatchedSeriesEntryDto,
} from '../../common/mappers';
import { BaseRepository } from '../../framework/orm/base-repository';
import { Favorite } from '../../database/entities/favorite.entity';
import { User } from '../../database/entities/user.entity';
import { WatchedMovie } from '../../database/entities/watched-movie.entity';
import { WatchedSeries } from '../../database/entities/watched-series.entity';

@Injectable()
export class UsersService {
  constructor(
    @Inject(User)
    private readonly users: BaseRepository<User>,
    @Inject(WatchedMovie)
    private readonly watchedMovies: BaseRepository<WatchedMovie>,
    @Inject(WatchedSeries)
    private readonly watchedSeries: BaseRepository<WatchedSeries>,
    @Inject(Favorite)
    private readonly favorites: BaseRepository<Favorite>,
  ) {}

  async listCommunity(currentUserId: number): Promise<UserSummaryDto[]> {
    const users = this.users.query().where('id', '<>', currentUserId).orderBy('id').all();
    return users.map(toUserSummaryDto);
  }

  async findEntity(id: number): Promise<User> {
    const user = this.users.findById(id);
    if (user === undefined) {
      throw new NotFoundException('Usuario nao encontrado');
    }
    return user;
  }

  async getDetail(id: number): Promise<UserDetailDto> {
    const user = await this.findEntity(id);
    return { profile: toUserProfileDto(user), times: toUserTimesDto(user) };
  }

  async getWatchedMovies(id: number): Promise<WatchedEntryDto[]> {
    await this.findEntity(id);
    return this.watchedMovies
      .findAll({ where: { userId: id }, order: { position: 'ASC' } })
      .map(toWatchedMovieEntryDto);
  }

  async getWatchedSeries(id: number): Promise<WatchedEntryDto[]> {
    await this.findEntity(id);
    return this.watchedSeries
      .findAll({ where: { userId: id }, order: { position: 'ASC' } })
      .map(toWatchedSeriesEntryDto);
  }

  async getFavorites(id: number): Promise<FavoriteEntryDto[]> {
    await this.findEntity(id);
    return this.favorites
      .findAll({ where: { userId: id }, order: { position: 'ASC' } })
      .map(toFavoriteEntryDto);
  }
}
