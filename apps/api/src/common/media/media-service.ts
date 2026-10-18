import { NotFoundException } from '@nestjs/common';
import type { FindOptionsOrder, FindOptionsWhere, Repository } from 'typeorm';

/** Dependencias que variam por tipo de midia (filme ou serie) na `MediaService`. */
export interface MediaRuntime<TEntity extends { id: number }, TDto> {
  readonly repository: Repository<TEntity>;
  readonly toDto: (entity: TEntity) => TDto;
  readonly notFoundMessage: string;
}

/** Operacoes comuns a tipos de midia, por composicao com a `MediaRuntime` do tipo. */
export class MediaService<TEntity extends { id: number }, TDto> {
  constructor(private readonly runtime: MediaRuntime<TEntity, TDto>) {}

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
}
