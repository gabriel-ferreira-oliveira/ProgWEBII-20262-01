import { NotFoundException } from '@nestjs/common';
import type { MovieDto } from '@ceviu/shared';
import type { Repository } from 'typeorm';
import type { Movie } from '../../database/entities/movie.entity';
import { makeMovie } from '../../testing/factories';
import { toMovieDto } from '../mappers';
import { MediaService } from './media-service';

describe('MediaService', () => {
  const repository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
  };
  let service: MediaService<Movie, MovieDto>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MediaService<Movie, MovieDto>({
      repository: repository as unknown as Repository<Movie>,
      toDto: toMovieDto,
      notFoundMessage: 'Filme nao encontrado',
    });
  });

  it('list busca em ordem de id e mapeia com o toDto da runtime', async () => {
    repository.find.mockResolvedValue([makeMovie({ id: 1 }), makeMovie({ id: 2, title: 'Outro' })]);

    const result = await service.list();

    expect(repository.find).toHaveBeenCalledWith({ order: { id: 'ASC' } });
    expect(result).toEqual([
      { id: 1, title: 'Matriz', genre: 'Ficcao', synopsis: 'Sinopse original', year: 1999, durationMin: 136 },
      { id: 2, title: 'Outro', genre: 'Ficcao', synopsis: 'Sinopse original', year: 1999, durationMin: 136 },
    ]);
  });

  it('findOne devolve o DTO mapeado', async () => {
    repository.findOne.mockResolvedValue(makeMovie({ id: 7 }));

    const dto = await service.findOne(7);

    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 7 } });
    expect(dto).toEqual({
      id: 7,
      title: 'Matriz',
      genre: 'Ficcao',
      synopsis: 'Sinopse original',
      year: 1999,
      durationMin: 136,
    });
  });

  it('findOne usa a mensagem de 404 da runtime quando nao existe', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.findOne(99)).rejects.toThrow('Filme nao encontrado');
  });

  it('updateSynopsis altera somente a sinopse da entidade encontrada', async () => {
    repository.findOne.mockResolvedValue(makeMovie());
    repository.save.mockImplementation((entity) => Promise.resolve(entity));

    const result = await service.updateSynopsis(1, 'Nova sinopse');

    expect(repository.save).toHaveBeenCalledWith(makeMovie({ synopsis: 'Nova sinopse' }));
    expect(result.synopsis).toBe('Nova sinopse');
    expect(result.title).toBe('Matriz');
  });

  it('updateSynopsis propaga o 404 sem salvar', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.updateSynopsis(99, 'x')).rejects.toThrow('Filme nao encontrado');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('remove confere a existencia e faz soft delete pelo id', async () => {
    repository.findOne.mockResolvedValue(makeMovie());

    await service.remove(1);

    expect(repository.softDelete).toHaveBeenCalledWith({ id: 1 });
  });

  it('remove propaga o 404 sem soft delete', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.remove(99)).rejects.toThrow('Filme nao encontrado');
    expect(repository.softDelete).not.toHaveBeenCalled();
  });
});
