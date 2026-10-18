import { NotFoundException } from '@nestjs/common';
import type {
  DeepPartial,
  FindOptionsOrder,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
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
  readonly repository: Repository<TEntity>;
  readonly toDto: (entity: TEntity) => TDto;
  readonly notFoundMessage: string;
  readonly watch: {
    readonly usersRepository: Repository<User>;
    readonly watchedRepository: Repository<TWatched>;
    readonly favoritesRepository: Repository<Favorite>;
    readonly watchedEntryOf: (entity: TEntity, userId: number, position: number) => DeepPartial<TWatched>;
    readonly favoriteEntryOf: (entity: TEntity, userId: number, position: number) => DeepPartial<Favorite>;
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
    // Os casts sao da limitacao dos mapped types do TypeORM com TEntity generico.
    const entities = await this.runtime.repository.find({
      order: { id: 'ASC' } as FindOptionsOrder<TEntity>,
    });
    return entities.map((entity) => this.runtime.toDto(entity));
  }

  async findOne(id: number): Promise<TDto> {
    return this.runtime.toDto(await this.findEntity(id));
  }

  async findEntity(id: number): Promise<TEntity> {
    const entity = await this.runtime.repository.findOne({
      // O generico nao resolve `FindOptionsWhereProperty` para TEntity["id"]; o cast e seguro (id: number).
      where: { id } as FindOptionsWhere<TEntity>,
    });
    if (entity === null) {
      throw new NotFoundException(this.runtime.notFoundMessage);
    }
    return entity;
  }

  async updateSynopsis(id: number, synopsis: string): Promise<TDto> {
    const entity = await this.findEntity(id);
    entity.synopsis = synopsis;
    const saved = await this.runtime.repository.save(entity);
    return this.runtime.toDto(saved);
  }

  async remove(id: number): Promise<void> {
    await this.findEntity(id);
    await this.runtime.repository.softDelete({ id } as FindOptionsWhere<TEntity>);
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

    const position = await watch.watchedRepository.count({
      where: { userId } as FindOptionsWhere<TWatched>,
    });
    const entry = watch.watchedRepository.create(watch.watchedEntryOf(entity, userId, position));
    await watch.watchedRepository.save(entry);

    const countTime = options.favorite ? watch.countTimeOnFavorite : true;
    const minutes = countTime ? (entity.durationMin ?? 0) : 0;
    if (minutes > 0) {
      await watch.usersRepository.increment({ id: userId }, watch.counterField, minutes);
    }

    if (options.favorite) {
      const favoritePosition = await watch.favoritesRepository.count({ where: { userId } });
      const favorite = watch.favoritesRepository.create(
        watch.favoriteEntryOf(entity, userId, favoritePosition),
      );
      await watch.favoritesRepository.save(favorite);
    }

    return watch.toResult(watch.counterOf(user) + minutes);
  }

  private async findUser(userId: number): Promise<User> {
    const user = await this.runtime.watch.usersRepository.findOne({ where: { id: userId } });
    if (user === null) {
      throw new NotFoundException('Usuario nao encontrado');
    }
    return user;
  }
}
