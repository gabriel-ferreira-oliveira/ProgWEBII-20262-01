import type { BaseRepository } from '../framework/orm/base-repository';
import type { Movie } from '../database/entities/movie.entity';
import { createBaseRepositoryMock, createRepositoryMock } from './repository-mock';

describe('createRepositoryMock', () => {
  it('cria um jest.fn independente por metodo pedido', () => {
    const repository = createRepositoryMock<Movie>('find', 'findOne', 'save');

    expect(Object.keys(repository).sort()).toEqual(['find', 'findOne', 'save']);
    expect(jest.isMockFunction(repository.find)).toBe(true);
    expect(jest.isMockFunction(repository.findOne)).toBe(true);
    expect(jest.isMockFunction(repository.save)).toBe(true);
    expect(repository.find).not.toBe(repository.findOne);
  });

  it('nao inclui metodos que nao foram pedidos', () => {
    const repository = createRepositoryMock<Movie>('find');

    expect(Object.keys(repository)).toEqual(['find']);
  });

  it('aceita um repositorio de outro tipo (BaseRepository do mini-ORM)', () => {
    const repository = createRepositoryMock<Movie, BaseRepository<Movie>>('insert', 'count');

    expect(Object.keys(repository).sort()).toEqual(['count', 'insert']);
    expect(jest.isMockFunction(repository.insert)).toBe(true);
  });

  it('createBaseRepositoryMock e o atalho tipado para o BaseRepository', () => {
    const repository = createBaseRepositoryMock<Movie>('findById', 'query', 'delete');

    expect(Object.keys(repository).sort()).toEqual(['delete', 'findById', 'query']);
    expect(jest.isMockFunction(repository.query)).toBe(true);
  });
});
