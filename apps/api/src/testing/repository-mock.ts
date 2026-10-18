import type { ObjectLiteral, Repository } from 'typeorm';

/**
 * Mock de `Repository<T>` para os specs: cada metodo pedido vira um `jest.fn()`
 * proprio; o nome e conferido contra a interface real do TypeORM.
 */
export function createRepositoryMock<T extends ObjectLiteral>(
  ...methods: (keyof Repository<T> & string)[]
): Record<string, jest.Mock> {
  const mock: Record<string, jest.Mock> = {};
  for (const method of methods) {
    mock[method] = jest.fn();
  }
  return mock;
}
