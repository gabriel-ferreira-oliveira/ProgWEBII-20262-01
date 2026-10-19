import type { BaseRepository } from '../framework/orm/base-repository';
import type { Movie } from '../database/entities/movie.entity';
import { createBaseRepositoryMock, createRepositoryMock } from './repository-mock';

describe('createRepositoryMock', () => {
  it('cria um jest.fn independente por metodo pedido', () => {
    const repository = createRepositoryMock<BaseRepository<Movie>>('findById', 'insert', 'update');

    expect(Object.keys(repository).sort()).toEqual(['findById', 'insert', 'update']);
    expect(jest.isMockFunction(repository.findById)).toBe(true);
    expect(jest.isMockFunction(repository.insert)).toBe(true);
    expect(jest.isMockFunction(repository.update)).toBe(true);
    expect(repository.findById).not.toBe(repository.insert);
  });

  it('nao inclui metodos que nao foram pedidos', () => {
    const repository = createRepositoryMock<BaseRepository<Movie>>('findById');

    expect(Object.keys(repository)).toEqual(['findById']);
  });

  it('createBaseRepositoryMock e o atalho tipado para o BaseRepository', () => {
    const repository = createBaseRepositoryMock<Movie>('findById', 'query', 'delete');

    expect(Object.keys(repository).sort()).toEqual(['delete', 'findById', 'query']);
    expect(jest.isMockFunction(repository.query)).toBe(true);
  });
});
