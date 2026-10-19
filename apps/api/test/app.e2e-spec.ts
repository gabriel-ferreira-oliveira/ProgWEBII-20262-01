import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import type { Response } from 'supertest';
import type {
  FavoriteEntryDto,
  FormMetadata,
  LoginResponseDto,
  MovieDto,
  SearchResultDto,
  UserProfileDto,
  WatchedEntryDto,
} from '@ceviu/shared';
import { AppModule } from '../src/app.module';
import { Movie } from '../src/database/entities/movie.entity';
import { Series } from '../src/database/entities/series.entity';
import type { BaseRepository } from '../src/framework/orm/base-repository';
import { configureApp } from '../src/setup-app';

function readJson<T>(response: Response): T {
  return response.body as T;
}

describe('CeViu API (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  let token = '';
  let userId = 0;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    httpServer = app.getHttpServer() as Server;

    // Seed pelo mini-ORM com PK explicita (como no import do banco legado).
    const movies = app.get<BaseRepository<Movie>>(Movie);
    movies.insert(
      Object.assign(new Movie(), {
        id: 1,
        title: 'Matriz',
        genre: 'Ficcao',
        synopsis: 'Sinopse 1',
        year: 1999,
        durationMin: 136,
      }),
    );
    movies.insert(
      Object.assign(new Movie(), {
        id: 2,
        title: 'O Senhor dos Aneis',
        genre: 'Fantasia',
        synopsis: 'Sinopse 2',
        year: 2001,
        durationMin: 178,
      }),
    );
    const series = app.get<BaseRepository<Series>>(Series);
    series.insert(
      Object.assign(new Series(), {
        id: 1,
        title: 'Breaking Bad',
        genre: 'Drama',
        synopsis: 'Sinopse 1',
        year: 2008,
        durationMin: 45,
        episodes: 62,
      }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('bloqueia rotas protegidas sem token', async () => {
    await request(httpServer).get('/api/movies').expect(401);
    await request(httpServer).get('/api/series').expect(401);
    await request(httpServer).get('/api/users').expect(401);
    await request(httpServer).get('/api/search').expect(401);
  });

  it('cadastra usuario com pais fixo Brasil', async () => {
    const response = await request(httpServer)
      .post('/api/auth/register')
      .send({ name: 'Gabriel', email: 'gabriel@exemplo.com', password: '12345', age: 21, bio: 'Oi' })
      .expect(201);

    const body = readJson<UserProfileDto>(response);
    userId = body.id;
    expect(body.country).toBe('Brasil');
    expect(body.email).toBe('gabriel@exemplo.com');
    expect(response.body).not.toHaveProperty('passwordHash');
  });

  it('rejeita email duplicado (case-insensitive) com 409', async () => {
    await request(httpServer)
      .post('/api/auth/register')
      .send({ name: 'Outro', email: 'GABRIEL@EXEMPLO.COM', password: '999', age: 20 })
      .expect(409);
  });

  it('rejeita campo desconhecido no cadastro com 400', async () => {
    await request(httpServer)
      .post('/api/auth/register')
      .send({ name: 'X', email: 'x@x.com', password: '1', age: 20, country: 'Uganda' })
      .expect(400);
  });

  it('rejeita login invalido com a mensagem do legado', async () => {
    const response = await request(httpServer)
      .post('/api/auth/login')
      .send({ email: 'gabriel@exemplo.com', password: 'errada' })
      .expect(401);

    expect(readJson<{ message: string }>(response).message).toBe('Email ou senha inválidos!');
  });

  it('faz login e devolve token JWT', async () => {
    const response = await request(httpServer)
      .post('/api/auth/login')
      .send({ email: 'Gabriel@Exemplo.com', password: '12345' })
      .expect(200);

    const body = readJson<LoginResponseDto>(response);
    expect(body.token).toEqual(expect.any(String));
    expect(body.user.id).toBe(userId);
    token = body.token;
  });

  it('lista o catalogo de filmes (sem soft-deleted)', async () => {
    const response = await request(httpServer)
      .get('/api/movies')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(readJson<MovieDto[]>(response)).toHaveLength(2);
  });

  it('pesquisa por titulo (contains, case-insensitive)', async () => {
    const response = await request(httpServer)
      .get('/api/search')
      .query({ title: 'matriz' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = readJson<SearchResultDto>(response);
    expect(body.movies.map((movie) => movie.id)).toEqual([1]);
    expect(body.series).toEqual([]);
  });

  it('pesquisa vazia devolve a mensagem do legado', async () => {
    const response = await request(httpServer)
      .get('/api/search')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    expect(readJson<{ message: string[] }>(response).message).toEqual(['Campos de pesquisa vazio']);
  });

  it('pesquisa com title vazio trata como ausente (mensagem do legado)', async () => {
    const response = await request(httpServer)
      .get('/api/search')
      .query({ title: '' })
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    expect(readJson<{ message: string[] }>(response).message).toEqual(['Campos de pesquisa vazio']);
  });

  it('pesquisa com dois filtros devolve a mensagem do legado', async () => {
    const response = await request(httpServer)
      .get('/api/search')
      .query({ title: 'matriz', id: 1 })
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    expect(readJson<{ message: string[] }>(response).message).toEqual([
      'Apenas um campo pode ser prenchido para a pesquisa',
    ]);
  });

  it('pesquisa por id exato', async () => {
    const response = await request(httpServer)
      .get('/api/search')
      .query({ id: 1 })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = readJson<SearchResultDto>(response);
    expect(body.movies.map((movie) => movie.id)).toEqual([1]);
  });

  it('assistir filme soma a duracao', async () => {
    const response = await request(httpServer)
      .post('/api/movies/1/watch')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(readJson<{ watchedMovieMinutes: number }>(response).watchedMovieMinutes).toBe(136);
  });

  it('favoritar filme tambem marca como assistido e soma de novo (duplicatas preservadas)', async () => {
    const response = await request(httpServer)
      .post('/api/movies/1/favorite')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(readJson<{ watchedMovieMinutes: number }>(response).watchedMovieMinutes).toBe(272);
  });

  it('lista historico de filmes com ordem e duplicatas', async () => {
    const response = await request(httpServer)
      .get(`/api/users/${userId}/watched-movies`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = readJson<WatchedEntryDto[]>(response);
    expect(body).toHaveLength(2);
    expect(body.map((entry) => entry.position)).toEqual([0, 1]);
    expect(body.every((entry) => entry.title === 'Matriz')).toBe(true);
  });

  it('assistir serie soma a duracao x1', async () => {
    const response = await request(httpServer)
      .post('/api/series/1/watch')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(readJson<{ watchedSeriesMinutes: number }>(response).watchedSeriesMinutes).toBe(45);
  });

  it('favoritar serie nao soma tempo', async () => {
    const response = await request(httpServer)
      .post('/api/series/1/favorite')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(readJson<{ watchedSeriesMinutes: number }>(response).watchedSeriesMinutes).toBe(45);
  });

  it('favoritos misturam filmes e series', async () => {
    const response = await request(httpServer)
      .get(`/api/users/${userId}/favorites`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = readJson<FavoriteEntryDto[]>(response);
    expect(body.map((entry) => entry.mediaType)).toEqual(['movie', 'series']);
  });

  it('detalhe do usuario devolve perfil e tempos (total sempre 0)', async () => {
    const response = await request(httpServer)
      .get(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = readJson<{ profile: UserProfileDto; times: { watchedMovieMinutes: number; watchedSeriesMinutes: number; totalMinutes: number } }>(response);
    expect(body.profile.id).toBe(userId);
    expect(body.times).toEqual({
      watchedMovieMinutes: 272,
      watchedSeriesMinutes: 45,
      totalMinutes: 0,
    });
  });

  it('altera somente a sinopse do filme', async () => {
    const response = await request(httpServer)
      .patch('/api/movies/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ synopsis: 'Nova sinopse' })
      .expect(200);

    const body = readJson<MovieDto>(response);
    expect(body.synopsis).toBe('Nova sinopse');
    expect(body.title).toBe('Matriz');
  });

  it('rejeita alteracao de sinopse sem o campo com 400 (synopsis obrigatorio)', async () => {
    const response = await request(httpServer)
      .patch('/api/movies/1')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);

    expect(readJson<{ message: string[] }>(response).message).toEqual([
      'synopsis must be a string',
    ]);
  });

  it('lista a comunidade excluindo o usuario logado', async () => {
    await request(httpServer)
      .post('/api/auth/register')
      .send({ name: 'Maria', email: 'maria@exemplo.com', password: '12345', age: 30 })
      .expect(201);

    const response = await request(httpServer)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = readJson<Array<{ id: number; name: string }>>(response);
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe('Maria');
  });

  it('remove filme com soft delete e preserva o historico', async () => {
    await request(httpServer)
      .delete('/api/movies/1')
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    const listResponse = await request(httpServer)
      .get('/api/movies')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(readJson<MovieDto[]>(listResponse).map((movie) => movie.id)).toEqual([2]);

    await request(httpServer)
      .get('/api/movies/1')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    const historyResponse = await request(httpServer)
      .get(`/api/users/${userId}/watched-movies`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(readJson<WatchedEntryDto[]>(historyResponse)).toHaveLength(2);
  });

  it('devolve 404 para usuario inexistente', async () => {
    await request(httpServer)
      .get('/api/users/999')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  describe('GET /api/metadata/:form (publico, sem token)', () => {
    it('descreve o cadastro: ordem da tela, labels, controles e restricoes reais', async () => {
      const response = await request(httpServer).get('/api/metadata/register').expect(200);

      const metadata = readJson<FormMetadata>(response);
      expect(metadata.rules).toEqual([]);
      expect(metadata.fields.map((field) => field.name)).toEqual([
        'name',
        'email',
        'age',
        'password',
        'bio',
      ]);
      expect(metadata.fields.map((field) => [field.label, field.control, field.required])).toEqual([
        ['Nome', 'text', true],
        ['Email', 'text', true],
        ['Idade', 'number', true],
        ['Senha', 'password', true],
        ['Sobre', 'textarea', false],
      ]);
      expect(metadata.fields[2]).toEqual({
        name: 'age',
        label: 'Idade',
        control: 'number',
        order: 3,
        required: true,
        min: 0,
      });
    });

    it('descreve o login e as sinopses', async () => {
      const login = readJson<FormMetadata>(await request(httpServer).get('/api/metadata/login').expect(200));
      expect(login.fields.map((field) => field.name)).toEqual(['email', 'password']);
      expect(login.fields.map((field) => field.control)).toEqual(['text', 'password']);

      const movie = readJson<FormMetadata>(
        await request(httpServer).get('/api/metadata/movie-synopsis').expect(200),
      );
      const series = readJson<FormMetadata>(
        await request(httpServer).get('/api/metadata/series-synopsis').expect(200),
      );
      expect(movie.fields).toEqual([
        { name: 'synopsis', label: 'Sinopse', control: 'textarea', order: 1, required: true },
      ]);
      expect(series.fields).toEqual(movie.fields);
    });

    it('descreve a busca: sem campos de UI e com a regra exactlyOneOf do legado', async () => {
      const response = await request(httpServer).get('/api/metadata/search-catalog').expect(200);

      const metadata = readJson<FormMetadata>(response);
      expect(metadata.fields).toEqual([]);
      expect(metadata.rules).toEqual([
        {
          kind: 'exactlyOneOf',
          properties: ['title', 'id'],
          missingMessage: 'Campos de pesquisa vazio',
          multipleMessage: 'Apenas um campo pode ser prenchido para a pesquisa',
        },
      ]);
    });

    it('devolve 404 para formulario desconhecido', async () => {
      await request(httpServer).get('/api/metadata/nao-existe').expect(404);
    });
  });
});
