import { NotFoundException } from '@nestjs/common';
import type { MovieDto, MovieWatchResultDto } from '@ceviu/shared';
import type { Repository } from 'typeorm';
import { Favorite } from '../../database/entities/favorite.entity';
import type { Movie } from '../../database/entities/movie.entity';
import { User } from '../../database/entities/user.entity';
import { WatchedMovie } from '../../database/entities/watched-movie.entity';
import { makeMovie, makeUser } from '../../testing/factories';
import { createRepositoryMock } from '../../testing/repository-mock';
import { toMovieDto } from '../mappers';
import { MediaService } from './media-service';

describe('MediaService', () => {
  const repository = createRepositoryMock<Movie>('find', 'findOne', 'save', 'softDelete');
  const usersRepository = createRepositoryMock<User>('findOne', 'increment');
  const watchedRepository = createRepositoryMock<WatchedMovie>('count', 'create', 'save');
  const favoritesRepository = createRepositoryMock<Favorite>('count', 'create', 'save');

  function createService(countTimeOnFavorite: boolean): MediaService<Movie, MovieDto, MovieWatchResultDto, WatchedMovie> {
    return new MediaService<Movie, MovieDto, MovieWatchResultDto, WatchedMovie>({
      repository: repository as unknown as Repository<Movie>,
      toDto: toMovieDto,
      notFoundMessage: 'Filme nao encontrado',
      watch: {
        usersRepository: usersRepository as unknown as Repository<User>,
        watchedRepository: watchedRepository as unknown as Repository<WatchedMovie>,
        favoritesRepository: favoritesRepository as unknown as Repository<Favorite>,
        watchedEntryOf: (movie, userId, position) => ({
          userId,
          movieId: movie.id,
          titleSnapshot: movie.title,
          position,
        }),
        favoriteEntryOf: (movie, userId, position) => ({
          userId,
          mediaType: 'movie',
          movieId: movie.id,
          seriesId: null,
          titleSnapshot: movie.title,
          position,
        }),
        counterField: 'watchedMovieMinutes',
        counterOf: (user) => user.watchedMovieMinutes,
        toResult: (watchedMovieMinutes) => ({ watchedMovieMinutes }),
        countTimeOnFavorite,
      },
    });
  }

  let service: MediaService<Movie, MovieDto, MovieWatchResultDto, WatchedMovie>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createService(true);
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

  it('watch cria historico na proxima posicao, soma a duracao e mapeia o resultado', async () => {
    repository.findOne.mockResolvedValue(makeMovie({ durationMin: 136 }));
    usersRepository.findOne.mockResolvedValue(makeUser({ watchedMovieMinutes: 10 }));
    watchedRepository.count.mockResolvedValue(2);
    watchedRepository.create.mockImplementation((input) => input);
    watchedRepository.save.mockResolvedValue(undefined);
    usersRepository.increment.mockResolvedValue({});

    const result = await service.watch(1, 7);

    expect(result).toEqual({ watchedMovieMinutes: 146 });
    expect(watchedRepository.create).toHaveBeenCalledWith({
      userId: 7,
      movieId: 1,
      titleSnapshot: 'Matriz',
      position: 2,
    });
    expect(usersRepository.increment).toHaveBeenCalledWith({ id: 7 }, 'watchedMovieMinutes', 136);
  });

  it('favorite soma a duracao quando countTimeOnFavorite e true (semantica de filme)', async () => {
    repository.findOne.mockResolvedValue(makeMovie({ durationMin: 90 }));
    usersRepository.findOne.mockResolvedValue(makeUser({ watchedMovieMinutes: 0 }));
    watchedRepository.count.mockResolvedValue(0);
    watchedRepository.create.mockImplementation((input) => input);
    watchedRepository.save.mockResolvedValue(undefined);
    favoritesRepository.count.mockResolvedValue(0);
    favoritesRepository.create.mockImplementation((input) => input);
    favoritesRepository.save.mockResolvedValue(undefined);
    usersRepository.increment.mockResolvedValue({});

    const result = await service.favorite(1, 7);

    expect(result).toEqual({ watchedMovieMinutes: 90 });
    expect(watchedRepository.save).toHaveBeenCalledTimes(1);
    expect(favoritesRepository.create).toHaveBeenCalledWith({
      userId: 7,
      mediaType: 'movie',
      movieId: 1,
      seriesId: null,
      titleSnapshot: 'Matriz',
      position: 0,
    });
    expect(usersRepository.increment).toHaveBeenCalledTimes(1);
    expect(usersRepository.increment).toHaveBeenCalledWith({ id: 7 }, 'watchedMovieMinutes', 90);
  });

  it('favorite nao soma a duracao quando countTimeOnFavorite e false (semantica de serie)', async () => {
    service = createService(false);
    repository.findOne.mockResolvedValue(makeMovie({ durationMin: 90 }));
    usersRepository.findOne.mockResolvedValue(makeUser({ watchedMovieMinutes: 50 }));
    watchedRepository.count.mockResolvedValue(1);
    watchedRepository.create.mockImplementation((input) => input);
    watchedRepository.save.mockResolvedValue(undefined);
    favoritesRepository.count.mockResolvedValue(3);
    favoritesRepository.create.mockImplementation((input) => input);
    favoritesRepository.save.mockResolvedValue(undefined);

    const result = await service.favorite(1, 7);

    expect(result).toEqual({ watchedMovieMinutes: 50 });
    expect(usersRepository.increment).not.toHaveBeenCalled();
    expect(watchedRepository.create).toHaveBeenCalledWith({
      userId: 7,
      movieId: 1,
      titleSnapshot: 'Matriz',
      position: 1,
    });
    expect(favoritesRepository.create).toHaveBeenCalledWith({
      userId: 7,
      mediaType: 'movie',
      movieId: 1,
      seriesId: null,
      titleSnapshot: 'Matriz',
      position: 3,
    });
  });

  it('watch com usuario inexistente falha sem criar historico', async () => {
    repository.findOne.mockResolvedValue(makeMovie());
    usersRepository.findOne.mockResolvedValue(null);

    await expect(service.watch(1, 99)).rejects.toThrow('Usuario nao encontrado');
    expect(watchedRepository.save).not.toHaveBeenCalled();
  });
});
