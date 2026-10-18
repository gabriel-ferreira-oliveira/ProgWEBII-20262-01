import type { ObjectLiteral, Repository } from 'typeorm';
import type { BaseRepository } from '../framework/orm/base-repository';

/**
 * Mock de repositório para os specs: cada metodo pedido vira um `jest.fn()`
 * proprio; o nome e conferido contra a interface real (por padrao o
 * `Repository<T>` do TypeORM; a partir da T5.9.1 tambem aceita o
 * `BaseRepository<T>` do mini-ORM via segundo parametro).
 */
export function createRepositoryMock<T extends ObjectLiteral, TRepository = Repository<T>>(
  ...methods: (keyof TRepository & string)[]
): Record<string, jest.Mock> {
  const mock: Record<string, jest.Mock> = {};
  for (const method of methods) {
    mock[method] = jest.fn();
  }
  return mock;
}

/** Atalho tipado para os specs dos servicos migrados: `createBaseRepositoryMock<Movie>(...)`. */
export function createBaseRepositoryMock<T extends ObjectLiteral>(
  ...methods: (keyof BaseRepository<T> & string)[]
): Record<string, jest.Mock> {
  return createRepositoryMock<T, BaseRepository<T>>(...methods);
}
