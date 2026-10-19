import { NotFoundException } from '@nestjs/common';
import type { MovieDto, MovieWatchResultDto } from '@ceviu/shared';
import { BaseRepository } from '../../framework/orm/base-repository';
import { createTableSql } from '../../framework/orm/create-table-sql';
import { Database } from '../../framework/orm/database';
import { Favorite } from '../../database/entities/favorite.entity';
import { Movie } from '../../database/entities/movie.entity';
import { User } from '../../database/entities/user.entity';
import { WatchedMovie } from '../../database/entities/watched-movie.entity';
import { makeMovie, makeUser } from '../../testing/factories';
import { createBaseRepositoryMock } from '../../testing/repository-mock';
import { toMovieDto } from '../mappers';
import { MediaService } from './media-service';

describe('MediaService', () => {
  const repository = createBaseRepositoryMock<Movie>('findAll', 'findById', 'update', 'delete');
  const usersRepository = createBaseRepositoryMock<User>('findById', 'increment');
  const watchedRepository = createBaseRepositoryMock<WatchedMovie>('count', 'insert');
  const favoritesRepository = createBaseRepositoryMock<Favorite>('count', 'insert');
  const databaseTransaction = jest.fn((fn: () => unknown) => fn());
  const database = { transaction: databaseTransaction } as unknown as Database;

  function createService(countTimeOnFavorite: boolean): MediaService<Movie, MovieDto, MovieWatchResultDto, WatchedMovie> {
    return new MediaService<Movie, MovieDto, MovieWatchResultDto, WatchedMovie>({
      database,
      repository: repository as unknown as BaseRepository<Movie>,
      toDto: toMovieDto,
      notFoundMessage: 'Filme nao encontrado',
      saveSynopsis: (id, synopsis) => {
        repository.update(id, { synopsis });
      },
      watch: {
        usersRepository: usersRepository as unknown as BaseRepository<User>,
        watchedRepository: watchedRepository as unknown as BaseRepository<WatchedMovie>,
        favoritesRepository: favoritesRepository as unknown as BaseRepository<Favorite>,
        watchedEntryOf: (movie, userId, position) =>
          Object.assign(new WatchedMovie(), {
            userId,
            movieId: movie.id,
            titleSnapshot: movie.title,
            position,
          }),
        favoriteEntryOf: (movie, userId, position) =>
          Object.assign(new Favorite(), {
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
    repository.findAll.mockReturnValue([makeMovie({ id: 1 }), makeMovie({ id: 2, title: 'Outro' })]);

    const result = await service.list();

    expect(repository.findAll).toHaveBeenCalledWith({ order: { id: 'ASC' } });
    expect(result).toEqual([
      { id: 1, title: 'Matriz', genre: 'Ficcao', synopsis: 'Sinopse original', year: 1999, durationMin: 136 },
      { id: 2, title: 'Outro', genre: 'Ficcao', synopsis: 'Sinopse original', year: 1999, durationMin: 136 },
    ]);
  });

  it('findOne devolve o DTO mapeado', async () => {
    repository.findById.mockReturnValue(makeMovie({ id: 7 }));

    const dto = await service.findOne(7);

    expect(repository.findById).toHaveBeenCalledWith(7);
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
    repository.findById.mockReturnValue(undefined);

    await expect(service.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.findOne(99)).rejects.toThrow('Filme nao encontrado');
  });

  it('updateSynopsis altera somente a sinopse e recarrega a entidade', async () => {
    repository.findById
      .mockReturnValueOnce(makeMovie())
      .mockReturnValueOnce(makeMovie({ synopsis: 'Nova sinopse' }));

    const result = await service.updateSynopsis(1, 'Nova sinopse');

    expect(repository.update).toHaveBeenCalledWith(1, { synopsis: 'Nova sinopse' });
    expect(result.synopsis).toBe('Nova sinopse');
    expect(result.title).toBe('Matriz');
  });

  it('updateSynopsis propaga o 404 sem atualizar', async () => {
    repository.findById.mockReturnValue(undefined);

    await expect(service.updateSynopsis(99, 'x')).rejects.toThrow('Filme nao encontrado');
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('remove confere a existencia e apaga pelo id', async () => {
    repository.findById.mockReturnValue(makeMovie());

    await service.remove(1);

    expect(repository.delete).toHaveBeenCalledWith(1);
  });

  it('remove propaga o 404 sem apagar', async () => {
    repository.findById.mockReturnValue(undefined);

    await expect(service.remove(99)).rejects.toThrow('Filme nao encontrado');
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('watch cria historico na proxima posicao, soma a duracao e mapeia o resultado', async () => {
    repository.findById.mockReturnValue(makeMovie({ durationMin: 136 }));
    usersRepository.findById.mockReturnValue(makeUser({ watchedMovieMinutes: 10 }));
    watchedRepository.count.mockReturnValue(2);
    watchedRepository.insert.mockImplementation((entry) => entry);

    const result = await service.watch(1, 7);

    expect(databaseTransaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ watchedMovieMinutes: 146 });
    expect(watchedRepository.insert).toHaveBeenCalledWith({
      userId: 7,
      movieId: 1,
      titleSnapshot: 'Matriz',
      position: 2,
    });
    expect(usersRepository.increment).toHaveBeenCalledWith(7, 'watchedMovieMinutes', 136);
  });

  it('favorite soma a duracao quando countTimeOnFavorite e true (semantica de filme)', async () => {
    repository.findById.mockReturnValue(makeMovie({ durationMin: 90 }));
    usersRepository.findById.mockReturnValue(makeUser({ watchedMovieMinutes: 0 }));
    watchedRepository.count.mockReturnValue(0);
    watchedRepository.insert.mockImplementation((entry) => entry);
    favoritesRepository.count.mockReturnValue(0);
    favoritesRepository.insert.mockImplementation((entry) => entry);

    const result = await service.favorite(1, 7);

    expect(result).toEqual({ watchedMovieMinutes: 90 });
    expect(watchedRepository.insert).toHaveBeenCalledTimes(1);
    expect(favoritesRepository.insert).toHaveBeenCalledWith({
      userId: 7,
      mediaType: 'movie',
      movieId: 1,
      seriesId: null,
      titleSnapshot: 'Matriz',
      position: 0,
    });
    expect(usersRepository.increment).toHaveBeenCalledTimes(1);
    expect(usersRepository.increment).toHaveBeenCalledWith(7, 'watchedMovieMinutes', 90);
  });

  it('favorite nao soma a duracao quando countTimeOnFavorite e false (semantica de serie)', async () => {
    service = createService(false);
    repository.findById.mockReturnValue(makeMovie({ durationMin: 90 }));
    usersRepository.findById.mockReturnValue(makeUser({ watchedMovieMinutes: 50 }));
    watchedRepository.count.mockReturnValue(1);
    watchedRepository.insert.mockImplementation((entry) => entry);
    favoritesRepository.count.mockReturnValue(3);
    favoritesRepository.insert.mockImplementation((entry) => entry);

    const result = await service.favorite(1, 7);

    expect(result).toEqual({ watchedMovieMinutes: 50 });
    expect(usersRepository.increment).not.toHaveBeenCalled();
    expect(watchedRepository.insert).toHaveBeenCalledWith({
      userId: 7,
      movieId: 1,
      titleSnapshot: 'Matriz',
      position: 1,
    });
    expect(favoritesRepository.insert).toHaveBeenCalledWith({
      userId: 7,
      mediaType: 'movie',
      movieId: 1,
      seriesId: null,
      titleSnapshot: 'Matriz',
      position: 3,
    });
  });

  it('watch com usuario inexistente falha sem criar historico', async () => {
    repository.findById.mockReturnValue(makeMovie());
    usersRepository.findById.mockReturnValue(undefined);

    await expect(service.watch(1, 99)).rejects.toThrow('Usuario nao encontrado');
    expect(watchedRepository.insert).not.toHaveBeenCalled();
  });
});

describe('MediaService — transacao real no SQLite (:memory:, T5.10)', () => {
  let database: Database;
  let moviesRepository: BaseRepository<Movie>;
  let usersRepository: BaseRepository<User>;
  let watchedRepository: BaseRepository<WatchedMovie>;
  let favoritesRepository: BaseRepository<Favorite>;
  let service: MediaService<Movie, MovieDto, MovieWatchResultDto, WatchedMovie>;

  beforeEach(() => {
    database = new Database(':memory:');
    database.run(createTableSql(User));
    database.run(createTableSql(Movie));
    database.run(createTableSql(WatchedMovie));
    database.run(createTableSql(Favorite));
    moviesRepository = new BaseRepository(database, Movie);
    usersRepository = new BaseRepository(database, User);
    watchedRepository = new BaseRepository(database, WatchedMovie);
    favoritesRepository = new BaseRepository(database, Favorite);

    usersRepository.insert(Object.assign(new User(), { email: 'a@a.com', passwordHash: 'x', name: 'A' }));
    moviesRepository.insert(
      Object.assign(new Movie(), {
        id: 1,
        title: 'Matriz',
        genre: 'Ficcao',
        synopsis: 'S',
        year: 1999,
        durationMin: 136,
      }),
    );

    service = new MediaService<Movie, MovieDto, MovieWatchResultDto, WatchedMovie>({
      database,
      repository: moviesRepository,
      toDto: toMovieDto,
      notFoundMessage: 'Filme nao encontrado',
      saveSynopsis: (id, synopsis) => {
        moviesRepository.update(id, { synopsis });
      },
      watch: {
        usersRepository,
        watchedRepository,
        favoritesRepository,
        watchedEntryOf: (movie, userId, position) =>
          Object.assign(new WatchedMovie(), {
            userId,
            movieId: movie.id,
            titleSnapshot: movie.title,
            position,
          }),
        favoriteEntryOf: (movie, userId, position) =>
          Object.assign(new Favorite(), {
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
        countTimeOnFavorite: true,
      },
    });
  });

  afterEach(() => {
    database.close();
  });

  it('watch confirma historico e minutos num unico commit', async () => {
    const result = await service.watch(1, 1);

    expect(result).toEqual({ watchedMovieMinutes: 136 });
    expect(watchedRepository.count()).toBe(1);
    expect(usersRepository.findById(1)?.watchedMovieMinutes).toBe(136);
  });

  it('falha no meio do favorite desfaz historico, favorito e minutos (rollback)', async () => {
    jest.spyOn(usersRepository, 'increment').mockImplementation(() => {
      throw new Error('falha forcada');
    });

    await expect(service.favorite(1, 1)).rejects.toThrow('falha forcada');

    expect(watchedRepository.count()).toBe(0);
    expect(favoritesRepository.count()).toBe(0);
    expect(usersRepository.findById(1)?.watchedMovieMinutes).toBe(0);
  });
});
