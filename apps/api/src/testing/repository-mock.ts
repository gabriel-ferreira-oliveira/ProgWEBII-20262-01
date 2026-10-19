import type { BaseRepository } from '../framework/orm/base-repository';

/**
 * Mock de repositório para os specs: cada metodo pedido vira um `jest.fn()`
 * proprio; o nome e conferido contra a interface real do tipo informado.
 */
export function createRepositoryMock<TRepository>(
  ...methods: (keyof TRepository & string)[]
): Record<string, jest.Mock> {
  const mock: Record<string, jest.Mock> = {};
  for (const method of methods) {
    mock[method] = jest.fn();
  }
  return mock;
}

/** Atalho tipado para os specs dos servicos migrados: `createBaseRepositoryMock<Movie>(...)`. */
export function createBaseRepositoryMock<T extends object>(
  ...methods: (keyof BaseRepository<T> & string)[]
): Record<string, jest.Mock> {
  return createRepositoryMock<BaseRepository<T>>(...methods);
}
