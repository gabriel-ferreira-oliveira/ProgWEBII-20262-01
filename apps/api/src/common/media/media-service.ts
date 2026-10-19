import { NotFoundException } from '@nestjs/common';
import type { BaseRepository } from '../../framework/orm/base-repository';
import type { Favorite } from '../../database/entities/favorite.entity';
import type { User } from '../../database/entities/user.entity';

/** Coluna de minutos do usuario que cada tipo de midia incrementa. */
export type UserMinutesField = 'watchedMovieMinutes' | 'watchedSeriesMinutes';

/** Forma comum das entradas de historico (`watched_movies`/`watched_series`). */
export interface WatchedEntryShape {
  readonly id: number;
  readonly userId: number;
  readonly titleSnapshot: string;
  readonly position: number;
}

/** Dependencias que variam por tipo de midia (filme ou serie) na `MediaService`. */
export interface MediaRuntime<
  TEntity extends { id: number; synopsis: string | null; durationMin: number | null },
  TDto,
  TWatchResult,
  TWatched extends WatchedEntryShape,
> {
  readonly repository: BaseRepository<TEntity>;
  readonly toDto: (entity: TEntity) => TDto;
  readonly notFoundMessage: string;
  /** Atualiza a sinopse pelo id (concreto por tipo, como os `*EntryOf`: o `update` da `BaseRepository` só tipa bem sem generico). */
  readonly saveSynopsis: (id: number, synopsis: string) => void;
  readonly watch: {
    readonly usersRepository: BaseRepository<User>;
    readonly watchedRepository: BaseRepository<TWatched>;
    readonly favoritesRepository: BaseRepository<Favorite>;
    readonly watchedEntryOf: (entity: TEntity, userId: number, position: number) => TWatched;
    readonly favoriteEntryOf: (entity: TEntity, userId: number, position: number) => Favorite;
    readonly counterField: UserMinutesField;
    readonly counterOf: (user: User) => number;
    readonly toResult: (minutes: number) => TWatchResult;
    readonly countTimeOnFavorite: boolean;
  };
}

/** Operacoes comuns a tipos de midia, por composicao com a `MediaRuntime` do tipo. */
export class MediaService<
  TEntity extends { id: number; synopsis: string | null; durationMin: number | null },
  TDto,
  TWatchResult,
  TWatched extends WatchedEntryShape,
> {
  constructor(private readonly runtime: MediaRuntime<TEntity, TDto, TWatchResult, TWatched>) {}

  async list(): Promise<TDto[]> {
    return this.runtime.repository
      .findAll({ order: { id: 'ASC' } })
      .map((entity) => this.runtime.toDto(entity));
  }

  async findOne(id: number): Promise<TDto> {
    return this.runtime.toDto(await this.findEntity(id));
  }

  async findEntity(id: number): Promise<TEntity> {
    const entity = this.runtime.repository.findById(id);
    if (entity === undefined) {
      throw new NotFoundException(this.runtime.notFoundMessage);
    }
    return entity;
  }

  async updateSynopsis(id: number, synopsis: string): Promise<TDto> {
    await this.findEntity(id);
    this.runtime.saveSynopsis(id, synopsis);
    return this.runtime.toDto(await this.findEntity(id));
  }

  async remove(id: number): Promise<void> {
    await this.findEntity(id);
    this.runtime.repository.delete(id);
  }

  async watch(id: number, userId: number): Promise<TWatchResult> {
    return this.recordWatch(id, userId, { favorite: false });
  }

  async favorite(id: number, userId: number): Promise<TWatchResult> {
    return this.recordWatch(id, userId, { favorite: true });
  }

  private async recordWatch(id: number, userId: number, options: { favorite: boolean }): Promise<TWatchResult> {
    const watch = this.runtime.watch;
    const entity = await this.findEntity(id);
    const user = await this.findUser(userId);

    const position = watch.watchedRepository.count({ where: { userId } });
    watch.watchedRepository.insert(watch.watchedEntryOf(entity, userId, position));

    const countTime = options.favorite ? watch.countTimeOnFavorite : true;
    const minutes = countTime ? (entity.durationMin ?? 0) : 0;
    if (minutes > 0) {
      watch.usersRepository.increment(userId, watch.counterField, minutes);
    }

    if (options.favorite) {
      const favoritePosition = watch.favoritesRepository.count({ where: { userId } });
      watch.favoritesRepository.insert(watch.favoriteEntryOf(entity, userId, favoritePosition));
    }

    return watch.toResult(watch.counterOf(user) + minutes);
  }

  private async findUser(userId: number): Promise<User> {
    const user = this.runtime.watch.usersRepository.findById(userId);
    if (user === undefined) {
      throw new NotFoundException('Usuario nao encontrado');
    }
    return user;
  }
}
