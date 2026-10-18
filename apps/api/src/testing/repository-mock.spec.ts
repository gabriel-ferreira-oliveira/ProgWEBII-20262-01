import type { Movie } from '../database/entities/movie.entity';
import { createRepositoryMock } from './repository-mock';

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
});
