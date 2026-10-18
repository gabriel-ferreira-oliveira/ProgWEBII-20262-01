# INVENTÁRIO — Uso do TypeORM no backend (CeViu)

> **T0.2 (somente leitura de código).** Branch `feat/reflexao`, commit de partida `3dde161` (base `f0583cc`), 2026-10-18.
> Método: leitura integral dos 35 arquivos citados na seção 13 + greps de confirmação (seção 13). Referências
> `arquivo:linha` conferidas na leitura direta. **Nenhum arquivo de código foi alterado nesta tarefa.**

## 1. Visão geral

- Dependências (`apps/api/package.json`): `typeorm ^0.3.20` (:39), `@nestjs/typeorm ^11.0.0` (:28),
  `better-sqlite3 ^13.0.3` (:30); scripts CLI usam `typeorm-ts-node-commonjs` (:15-17) e `ts-node` (:18).
- **26 arquivos** usam TypeORM (17 importam `@nestjs/typeorm`, 15 importam `typeorm`, com sobreposição nos 5
  services e no e2e): 6 entidades, 3 arquivos de `database/`, 1 migration, 5 services, 6 módulos, 5 specs e 1 e2e.
- 6 entidades / 6 tabelas · 1 migration com SQL cru (18 chamadas `queryRunner.query`) · 5 services injetando
  **15 repositórios** (`@InjectRepository`) · 1 `DataSource` standalone para os scripts CLI · e2e com SQLite real
  temporário; specs unitários 100% com mocks (sem banco).

## 2. Arquivos que importam TypeORM

| Arquivo | Import (linha) | Papel |
|---|---|---|
| `database/entities/movie.entity.ts` | `typeorm` (:1) | decorators de coluna/índice |
| `database/entities/series.entity.ts` | `typeorm` (:1) | idem |
| `database/entities/user.entity.ts` | `typeorm` (:1-9) | idem + `OneToMany` |
| `database/entities/watched-movie.entity.ts` | `typeorm` (:1-9) | idem + `ManyToOne/JoinColumn` |
| `database/entities/watched-series.entity.ts` | `typeorm` (:1-9) | idem |
| `database/entities/favorite.entity.ts` | `typeorm` (:1-9) | idem |
| `database/data-source-options.ts` | `type DataSourceOptions` (:1) | opções únicas do banco |
| `database/data-source.ts` | `DataSource` (:3) | instância para CLI |
| `database/migrations/1730000000000-InitialSchema.ts` | `MigrationInterface, QueryRunner` (:1) | schema |
| `modules/auth/auth.service.ts` | `InjectRepository` (:4), `Repository` (:6) | 1 repo |
| `modules/users/users.service.ts` | `InjectRepository` (:2), `Repository` (:3) | 4 repos |
| `modules/movies/movies.service.ts` | `InjectRepository` (:2), `Repository` (:3) | 4 repos |
| `modules/series/series.service.ts` | `InjectRepository` (:2), `Repository` (:3) | 4 repos |
| `modules/search/search.service.ts` | `InjectRepository` (:2), `Repository` (:3) | 2 repos |
| `test/app.e2e-spec.ts` | `getRepositoryToken` (:3), `type Repository` (:7) | seed do banco |

Módulos que importam `TypeOrmModule`: `database.module.ts:2-3`, `auth.module.ts:6`, `users.module.ts:2`,
`movies.module.ts:2`, `series.module.ts:2`, `search.module.ts:2`.
Specs importam `getRepositoryToken` de `@nestjs/typeorm` para montar mocks (seção 8).

## 3. Entidades e decorators TypeORM

Resumo por entidade (todos os decorators lidos de perto):

| Entidade (tabela) | PK | `@Column` | `@CreateDateColumn` | `@DeleteDateColumn` | Índices | Relações |
|---|---|---|---|---|---|---|
| `Movie` — `movies` (:3-4) | `@PrimaryColumn` :6 (id legado) | :9 :12 :15 :18 :21 | :24 | :27(precede)+:28 | `@Index` :27 | — |
| `Series` — `series` (:3-4) | `@PrimaryColumn` :6 | :9 :12 :15 :18 :22 :26 :30 | :33 | :36+:37 | `@Index` :36 | — |
| `User` — `users` (:14-15) | `@PrimaryGeneratedColumn` :16 | :20 :23 :26 :29 :32 :35 :38 :41 :44 | :47 | :50 | `@Index` único :19 | `@OneToMany` :53 :56 :59 |
| `WatchedMovie` — `watched_movies` (:13) | autoinc :16 | :19 :22 :26 :29 | :32 | — | `@Index` classe :14 (`userId`,`position`) | `@ManyToOne` :35 :39 + `@JoinColumn` :36 :40 |
| `WatchedSeries` — `watched_series` (:13) | autoinc :16 | :19 :22 :25 :28 | :31 | — | `@Index` classe :14 | `@ManyToOne` :34 :38 + `@JoinColumn` :35 :39 |
| `Favorite` — `favorites` (:14) | autoinc :17 | :20 :24 :27 :30 :33 :36 | :39 | — | `@Index` classe :15 | `@ManyToOne` :42 :46 :50 + `@JoinColumn` :43 :47 :51 |

Contagens: `@Column` ×35, `@PrimaryColumn` ×2, `@PrimaryGeneratedColumn` ×4, `@Index` ×6 (3 de propriedade,
3 de classe), `@ManyToOne` ×7, `@OneToMany` ×3, `@JoinColumn` ×7, `@CreateDateColumn` ×6, `@DeleteDateColumn` ×3
(soft delete real só em `movies`, `series` e `users`).

Detalhes relevantes ao mini-ORM:
- Só existem tipos `integer` e `text`; datas são **texto ISO** (`createdAt`/`deletedAt` são `string`).
- `user.entity.ts:20` usa `collation: 'NOCASE'` + índice único `idx_users_email` (:19) — a unicidade
  case-insensitive do e-mail depende disso (migração :10 e :24).
- Muitos campos são uniões com `null` (`string | null`, `number | null`) — casos que o `design:type` do
  `emitDecoratorMetadata` não distingue (insumo para T1.2/T5.1).
- `onDelete` declarado só no lado dono das relações: `CASCADE` para `User` (:35, :34, :42) e `SET NULL`
  para `Movie`/`Series` (:39, :38, :46, :50); o inverso existe só em `User` (`OneToMany`).

## 4. DataSource, opções e módulo Nest

- `data-source-options.ts:6-17` é a **fonte única** das opções: `type: 'better-sqlite3'` (:8),
  `database: databasePath()` (:9), `entities` (lista explícita das 6, :10), `migrations: [InitialSchema…]` (:11),
  `migrationsTableName: 'migrations'` (:12), `synchronize: false` (:13), `logging: false` (:14),
  `enableWAL: true` (:15). **Não há `busy_timeout`** (zero ocorrências no repo — seção 13).
- `data-source.ts:6` cria `AppDataSource = new DataSource(dataSourceOptions())`; é importado **apenas** pelos
  scripts CLI: `migration:run/revert/generate` (`apps/api/package.json:15-17`, `-d src/database/data-source.ts`)
  e `migrate:legacy` (:18 → `run-import.ts`).
- `database.module.ts:8-13`: `TypeOrmModule.forRootAsync` com `migrationsRun: true` (:11) — no boot da API as
  migrations rodam sozinhas. Registrado em `app.module.ts:19`.
- `TypeOrmModule.forFeature` por módulo (grafo da seção 11): `auth.module.ts:17`, `users.module.ts:11`,
  `movies.module.ts:11`, `series.module.ts:11`, `search.module.ts:9`.
- Injeção: 15 `@InjectRepository` (auth 1, users 4, movies 4, series 4, search 2). Nenhum controller, guard
  ou estratégia toca repositório: `jwt.strategy.ts:17-19` valida só o payload, **sem consultar o banco**
  (divergência com o texto de `docs/HANDOFF.md` §12.3, que descreve um carregamento de usuário que não existe).

## 5. Migrations

- Uma única migration: `1730000000000-InitialSchema.ts` (`InitialSchema1730000000000`).
- `up` (:6-108): 12 chamadas `queryRunner.query(...)` com **SQL cru** (sem repository): cria as 6 tabelas,
  3 índices de `deleted_at` + 1 único de e-mail + 3 compostos `(user_id, position)`.
- `down` (:110-117): 6 `DROP TABLE` (favorites → watched_series → watched_movies → series → movies → users).
- Peculiaridades do schema a preservar (T5.5 vai comparar via `PRAGMA table_info`):
  - `AUTOINCREMENT` só em `users` (:9), `watched_movies` (:59), `watched_series` (:75), `favorites` (:91);
    `movies` (:29) e `series` (:43) usam PK **preservada do legado** (sem autoincrement).
  - `created_at text NOT NULL` **sem DEFAULT** — o valor é preenchido pelo driver TypeORM (`@CreateDateColumn`);
    o mini-ORM precisará fazer o mesmo no insert.
  - `DEFAULT (0)`: `watched_movie_minutes` (:16), `watched_series_minutes` (:17), `total_minutes` (:18),
    `season` (:50).
  - `CHECK ("media_type" IN ('movie','series'))` (:99) — não expresso no decorator.
  - FKs: `watched_movies` :65-66, `watched_series` :81-82, `favorites` :100-102 (CASCADE no `user_id`,
    SET NULL nos demais).

## 6. Importador legado (`legacy-migration/run-import.ts`)

Uso do `AppDataSource` (única transação do backend hoje):
- `isInitialized` (:78) → `initialize()` (:79) → `runMigrations()` (:81) → `transaction(async (manager) => …)` (:136) →
  `destroy()` (:318).
- Dentro da transação: `manager.getRepository(X)` ×12 (:137-142, :144, :158, :174, :207, :208, :209);
  `clear()` nas 6 tabelas, na ordem **favorites → watched_movies → watched_series → users → movies → series**
  (:137-142); `create()` + `save()` por linha ou em lote: movies (:145-156), series (:159-172), users (:191-203),
  watched_movies (:224-231), watched_series (:241-248), favorites (:273-282).
- Sem outros usos de `manager` além desse callback (o `AppDataSource.manager` direto nunca é usado).

## 7. Services — injeções e métodos de `Repository` usados

| Service | Repositórios injetados (construtor) | Métodos usados (linhas) |
|---|---|---|
| `auth.service.ts` | `User` :17-18 | `createQueryBuilder('user')` :25 → `.withDeleted()` :26 → `.where(...)` :27 → `.getOne()` :28; `create` :34; `save` :42; `findOne` :47 |
| `users.service.ts` | `User` :26-27, `WatchedMovie` :28-29, `WatchedSeries` :30-31, `Favorite` :32-33 | `createQueryBuilder('user')` :38 → `.where` :39 → `.orderBy` :40 → `.getMany` :41; `findOne` :46; `find` :60-63, :69-72, :78-81 (`where`+`order.position ASC`) |
| `movies.service.ts` | `Movie` :14-15, `User` :16-17, `WatchedMovie` :18-19, `Favorite` :20-21 | `find` :25; `findOne` :30, :98; `save` :44, :75, :94; `softDelete` :50; `count` :68, :85; `create` :69, :86; `increment` :79 |
| `series.service.ts` | `Series` :14-15, `User` :16-17, `WatchedSeries` :18-19, `Favorite` :20-21 | `find` :25; `findOne` :30, :102; `save` :44, :79, :98; `softDelete` :50; `count` :72, :89; `create` :73, :90; `increment` :83 |
| `search.service.ts` | `Movie` :13-14, `Series` :15-16 | `find` :41, :42; `createQueryBuilder` `movie` :52-55 e `series` :57-60 (`.where` :53/:58, `.orderBy` :54/:59, `.getMany` :55/:60) |

Comportamentos implícitos do TypeORM que o código depende:
- **Soft delete automático**: `find`/`findOne` escondem `deleted_at` preenchido (movies/series/users);
  só `auth.service.ts:26` usa `.withDeleted()` (duplicidade de e-mail inclui usuário soft-deletado).
- `save(entidade)` faz insert (com PK explícita no import) ou update por PK (ex.: `updateSynopsis`).
- `increment({ id }, 'campo', n)` (:79, :83) soma direto no banco.

## 8. Specs, mocks, factories e e2e

- **Specs unitários (5)** mockam o repositório inteiro com objetos `jest.fn()` + `getRepositoryToken`; nunca abrem banco:
  - `auth.service.spec.ts`: `queryBuilder {withDeleted :15, where :16, getOne :17}`; `usersRepository {createQueryBuilder :20, findOne :21, create :22, save :23}`; wiring :34-36, :41.
  - `movies.service.spec.ts`: `moviesRepository {find :15, findOne :16, save :17, softDelete :18}`; `usersRepository {findOne :21, increment :22}`; `watchedMoviesRepository`/`favoritesRepository` `{count, create, save}` :24-33; providers :40-43.
  - `series.service.spec.ts`: mesma forma (:14-33, providers :40-43).
  - `users.service.spec.ts`: `usersQueryBuilder {where :15, orderBy :16, getMany :17}`; `usersRepository {findOne :20, createQueryBuilder :21}`; os 3 repos de listas só `{find}` :23-31; providers :42-45.
  - `search.service.spec.ts`: `queryBuilder {where :13, orderBy :14, getMany :15}`; repos `{find, createQueryBuilder}` :17-24; providers :36-37.
- Superfície mockada = exatamente os métodos usados (seção 7); nada de `insert/update/remove` etc.
- `testing/factories.ts` não importa TypeORM: fábrica pura de entidades (`makeUser` :8, `makeMovie` :29,
  `makeSeries` :43, `makeWatchedMovie` :59, `makeWatchedSeries` :73, `makeFavorite` :87), preenchendo inclusive
  os objetos de relação (`user`/`movie`/`series`) — usado pelos specs.
- **e2e** (`test/app.e2e-spec.ts`): sobe o `AppModule` real (:32-35) com `migrationsRun: true`; seed via
  `app.get<Repository<Movie>>(getRepositoryToken(Movie))` :38 e `.save([...])` :39-42 (filmes) e :43-46 (séries);
  o resto do teste é HTTP puro. `test/setup-e2e.ts:4-12` aponta `DATABASE_PATH` para `test/ceviu-e2e.sqlite`
  (arquivo + `-wal`/`-shm` apagados a cada run, :7-9) e fixa `JWT_SECRET` e `BCRYPT_ROUNDS=4`.

## 9. Matriz consolidada: métodos realmente usados

| Método | Usos (`arquivo:linha`) |
|---|---|
| `find` | users :60, :69, :78 · movies :25 · series :25 · search :41, :42 |
| `findOne` | auth :47 · users :46 · movies :30, :98 · series :30, :102 |
| `count` | movies :68, :85 · series :72, :89 |
| `create` | auth :34 · movies :69, :86 · series :73, :90 · run-import :147, :161, :192, :224, :241, :273 |
| `save` | auth :42 · movies :44, :75, :94 · series :44, :79, :98 · run-import :145, :159, :191, :231, :248, :282 · e2e :39, :44 |
| `softDelete` | movies :50 · series :50 |
| `increment` | movies :79 · series :83 |
| `createQueryBuilder` | auth :25 · users :38 · search :52, :57 — cadeia: `withDeleted` (auth :26), `where` (auth :27 · users :39 · search :53, :58), `orderBy` (users :40 · search :54, :59), `getOne` (auth :28), `getMany` (users :41 · search :55, :60) |
| `clear` (via manager) | run-import :137-142 |
| `manager.getRepository` | run-import :137-142, :144, :158, :174, :207-209 |
| `DataSource.isInitialized/initialize/runMigrations/transaction/destroy` | run-import :78, :79, :81, :136, :318 |
| `QueryRunner.query` | migration :7, :23, :27, :39, :41, :55, :57, :69, :73, :85, :89, :105 (up) e :111-116 (down) |
| `getRepositoryToken` + `app.get` | e2e :38, :43 · specs (seção 8) |

## 10. O que **não** é usado hoje (candidato a ficar fora do mini-ORM)

Confirmado por grep (seção 13) em `apps/api/src` + `test`: não existem chamadas a
`findOneBy`/`findBy`/`findAndCount`/`countBy`, `update`/`delete`/`remove`/`insert`/`upsert`/`preload`/
`decrement`/`recover`/`restore`/`exists`, agregados (`sum`/`minimum`/`maximum`/`average`), `repo.query` cru,
carregamento de relações (`relations:`/`join`/eager), cascatas em nível de ORM (o `onDelete` é de banco),
listeners/subscribers, `manager` fora do `run-import`, `synchronize: true` (nenhum lugar), `migrations:generate`
e `migrations:revert` (scripts existem em `apps/api/package.json:16-17`, mas o fluxo documentado só usa
`migration:run` + `migrate:legacy`).

## 11. Grafo de dependência

Módulos → serviço → entidades (`forFeature` e injeções):

```
AppModule
└─ DatabaseModule (forRootAsync, migrationsRun: true)
AuthModule   [User]                                     → AuthService   (User)
UsersModule  [User, WatchedMovie, WatchedSeries, Favorite] → UsersService  (User, WatchedMovie, WatchedSeries, Favorite)
MoviesModule [Movie, User, WatchedMovie, Favorite]      → MoviesService (Movie, User, WatchedMovie, Favorite)
SeriesModule [Series, User, WatchedSeries, Favorite]    → SeriesService (Series, User, WatchedSeries, Favorite)
SearchModule [Movie, Series]                            → SearchService (Movie, Series)
```

Entidade → quem injeta: `User` (auth, users, movies, series), `Movie` (movies, search), `Series` (series, search),
`WatchedMovie` (users, movies), `WatchedSeries` (users, series), `Favorite` (users, movies, series) = 15 injeções.

FKs entre entidades (lado dono): `WatchedMovie → User (CASCADE) / Movie (SET NULL)`;
`WatchedSeries → User (CASCADE) / Series (SET NULL)`; `Favorite → User (CASCADE) / Movie (SET NULL) / Series (SET NULL)`.
Não há FK entre `movies` e `series`.

Ordem já usada pela aplicação para lidar com os FKs (evidência para a T5.8):
- limpeza no import: `favorites → watched_movies → watched_series → users → movies → series` (`run-import.ts:137-142`);
- inserção no import: `movies → series → users → watched_* → favorites` (`run-import.ts:145-282`).

## 12. Implicações diretas para a Fase 5 (insumo da T5.8)

API mínima que o `BaseRepository<T>`/`Database` precisa cobrir (tudo que existe hoje):
1. `find` com `where` + `order` e exclusão de soft-deleted por padrão;
2. `findOne` com `where`;
3. `count` com `where`;
4. `create` + `save` (insert com PK explícita em movies/series; lote no import);
5. `save` em entidade carregada (update por PK — `updateSynopsis`);
6. `increment(campo, n)`;
7. `softDelete` (preencher `deleted_at`);
8. Query builder: `where` (incl. condição de maior), `orderBy`, `getOne`/`getMany` e um modo `withDeleted`
   (único uso: `auth.service.ts:24-28`);
9. `transaction` com `manager.getRepository` + `clear` (import);
10. `runMigrations` (runner mínimo — T5.11) e ciclo `initialize/isInitialized/destroy` (CLI).

Pegadinhas de paridade a honrar no mini-ORM: e-mail único **NOCASE** (collation + índice); `CHECK media_type`;
PKs legadas vs. autoincrement; `created_at` preenchido na aplicação (DDL não tem DEFAULT); defaults 0;
tipos só `integer`/`text` (datas como texto); FKs CASCADE/SET NULL; WAL ligado e **sem `busy_timeout`**
(risco da coexistência — T5.3).

## 13. Verificação e limites

- Arquivos lidos integralmente nesta tarefa (35): 6 entidades + `entities/index.ts`; `data-source.ts`,
  `data-source-options.ts`, `database.module.ts`, `InitialSchema.ts`; os 5 `*.service.ts`; `jwt.strategy.ts`;
  `app.module.ts`; os 5 `*.module.ts`; os 5 `*.service.spec.ts`; `testing/factories.ts`; `legacy-migration/run-import.ts`;
  `test/app.e2e-spec.ts`, `test/setup-e2e.ts`; `common/paths.ts`; `apps/api/package.json`, `package.json` (raiz).
- Greps de confirmação (ferramenta Grep, `apps/api`): `from 'typeorm'`; `forFeature`;
  `getRepositoryToken|DataSource|queryRunner|manager\.getRepository|\.transaction\(`;
  `busy_timeout|busyTimeout|\.query\(|\.manager\b`;
  `\.(insert|upsert|preload|decrement|findAndCount|findBy|findOneBy|countBy|sum|average|minimum|maximum|exists|recover|restore|remove|update|delete)\(`;
  `Repository|typeorm` em `src/modules`.
- Não verificado: comportamento interno do TypeORM (ex.: como `@CreateDateColumn` formata o texto) —
  só a evidência de que a coluna existe sem DEFAULT e é preenchida pelo driver nos fluxos atuais;
  `migration:generate`/`migration:revert` nunca foram executados no fluxo documentado.
- Testes: nenhum arquivo de código foi tocado, mas por ser a **última tarefa da Fase 0** a suíte completa foi
  rodada ao fim (regra 14): `npm test` 26/26 · `npm run test:e2e` 22/22 · `npm run typecheck` e
  `npm run typecheck:web` sem erros · `npm run build` e `npm run build:web` ok (2026-10-18).
