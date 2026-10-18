import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import { Favorite } from '../../database/entities/favorite.entity';
import { User } from '../../database/entities/user.entity';
import { WatchedMovie } from '../../database/entities/watched-movie.entity';
import { WatchedSeries } from '../../database/entities/watched-series.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(WatchedMovie)
    private readonly watchedMovies: Repository<WatchedMovie>,
    @InjectRepository(WatchedSeries)
    private readonly watchedSeries: Repository<WatchedSeries>,
    @InjectRepository(Favorite)
    private readonly favorites: Repository<Favorite>,
  ) {}

  async listCommunity(currentUserId: number): Promise<UserSummaryDto[]> {
    const users = await this.users
      .createQueryBuilder('user')
      .where('user.id != :currentUserId', { currentUserId })
      .orderBy('user.id', 'ASC')
      .getMany();
    return users.map(toUserSummaryDto);
  }

  async findEntity(id: number): Promise<User> {
    const user = await this.users.findOne({ where: { id } });
    if (user === null) {
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
    const entries = await this.watchedMovies.find({
      where: { userId: id },
      order: { position: 'ASC' },
    });
    return entries.map(toWatchedMovieEntryDto);
  }

  async getWatchedSeries(id: number): Promise<WatchedEntryDto[]> {
    await this.findEntity(id);
    const entries = await this.watchedSeries.find({
      where: { userId: id },
      order: { position: 'ASC' },
    });
    return entries.map(toWatchedSeriesEntryDto);
  }

  async getFavorites(id: number): Promise<FavoriteEntryDto[]> {
    await this.findEntity(id);
    const entries = await this.favorites.find({
      where: { userId: id },
      order: { position: 'ASC' },
    });
    return entries.map(toFavoriteEntryDto);
  }
}
