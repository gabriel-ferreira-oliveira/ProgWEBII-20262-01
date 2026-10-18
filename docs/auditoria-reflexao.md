# Auditoria de reflexão e decorators — CeViu

> **Insumo da refatoração (gerada na T0.1).** Branch `feat/reflexao`, base `f0583cc` (`main`), 2026-10-18.
> Trate como **hipótese**: as referências `arquivo:linha` valem para a base acima — confirme no código antes
> de agir, pois as tarefas seguintes movem estes números. Método: varredura de `apps/api` e `apps/web` com
> leitura direta dos arquivos (4 levantamentos: reflexão/decorators, duplicação da API, frontend, TypeORM);
> amostra de referências conferida linha a linha (seção 6).

## 1. Reflexão hoje: o que já existe

- Flags de compilação em `tsconfig.base.json`: `experimentalDecorators: true` (:21) e
  `emitDecoratorMetadata: true` (:22), `target ES2022` (:3). Sem elas nenhum metadata `design:*` é emitido.
- Dependência declarada: `reflect-metadata` em `apps/api/package.json:36`.
- **Uso explícito de `reflect-metadata` no código: apenas 2 imports** —
  `apps/api/src/database/data-source.ts:2` (usado pelos scripts CLI de migration/import) e
  `apps/api/src/legacy-migration/run-import.ts:1`. `main.ts` não importa; no app o polyfill entra pelo
  side-effect de `@nestjs/core` (que o requer internamente).
- **Zero uso direto de `Reflect.*`** (`getMetadata`/`defineMetadata`/`design:type`/`design:paramtypes`):
  todo o metadata é emitido pelo compilador e consumido pelas bibliotecas (NestJS, TypeORM,
  class-validator/transformer, Swagger). Confirma a premissa do plano: há espaço para um registro próprio.
- `apps/api/nest-cli.json` não configura o plugin do Swagger CLI → todo metadata OpenAPI vem de
  decorators explícitos.

## 2. Famílias de decorators em uso (inventário)

### 2.1 NestJS (DI, rotas, guards)

- `@Module` ×7: `app.module.ts:12`, `auth/auth.module.ts:15`, `users/users.module.ts:10`,
  `movies/movies.module.ts:10`, `series/series.module.ts:10`, `search/search.module.ts:8`,
  `database/database.module.ts:6`.
- `@Controller` ×5: `auth.controller.ts:9` (`auth`), `movies.controller.ts:25` (`movies`),
  `series.controller.ts:25` (`series`), `users.controller.ts:17` (`users`), `search.controller.ts:11` (`search`).
- `@Injectable` ×8: `auth.service.ts:14`, `jwt-auth.guard.ts:4`, `jwt.strategy.ts:7`, `movies.service.ts:11`,
  `series.service.ts:11`, `users.service.ts:23`, `search.service.ts:10`.
- Rotas: `@Get` ×10, `@Post` ×6, `@Patch` ×2, `@Delete` ×2; `@Body`, `@Param('id', ParseIntPipe)`, `@Query`;
  `@HttpCode` ×7 (204 no delete; 200 no login/watch/favorite).
- `@InjectRepository` ×15 (auth 1, movies 4, series 4, users 4, search 2).
- Guard: `@UseGuards(JwtAuthGuard)` na classe em 4 controllers (`movies.controller.ts:24`,
  `series.controller.ts:24`, `users.controller.ts:16`, `search.controller.ts:10`); `auth.controller.ts`
  é público. Não há `@SetMetadata`/roles.
- Único decorator customizado: `@CurrentUser()`
  (`common/decorators/current-user.decorator.ts:8-13`, via `createParamDecorator`), usado em
  `movies.controller.ts:62,72`, `series.controller.ts:62,72`, `users.controller.ts:23`.

### 2.2 TypeORM (entidades/mapeamento)

- 6 entidades em `apps/api/src/database/entities/`: `Movie` (`movie.entity.ts:3-4`), `Series` (:3-4),
  `User` (`user.entity.ts:14-15`), `WatchedMovie` (`watched-movie.entity.ts:13-15`), `WatchedSeries`,
  `Favorite` (`favorite.entity.ts:14-16`).
- Chaves: `@PrimaryColumn` (id preservado do legado) em `movie.entity.ts:6` / `series.entity.ts:6`;
  `@PrimaryGeneratedColumn` em `user.entity.ts:16`, `watched-movie.entity.ts:16`, `watched-series.entity.ts:16`,
  `favorite.entity.ts:17`.
- Colunas: `@Column` ×35; `@CreateDateColumn`; `@DeleteDateColumn` ×3 (`movie.entity.ts:28`,
  `series.entity.ts:37`, `user.entity.ts:50` — soft delete); `@Index` (ex.: `user.entity.ts:19` único NOCASE).
- Relações: `@ManyToOne`+`@JoinColumn` (Favorite/Watched*) e `@OneToMany` (`user.entity.ts:53,56,59`).
  Sem `@ManyToMany`/`@OneToOne`.

### 2.3 Validação (class-validator/class-transformer)

- Conjunto completo em uso: `IsString`, `IsNotEmpty`, `IsOptional`, `IsInt`, `Min` — nada mais.
- Por DTO: `auth/dto/register.dto.ts` (`:6,7,11,12,16,17,21,22,23,27,28`),
  `auth/dto/login.dto.ts` (`:6,7,11,12`), `movies/dto/update-movie.dto.ts:6`,
  `series/dto/update-series.dto.ts:6`, `search/dto/search-query.dto.ts:7,8,12,14,15`.
- class-transformer: único uso — `@Type(() => Number)` em `search-query.dto.ts:13`.
- Pipe global: `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` em
  `setup-app.ts:8-14` — é o que garante "campo desconhecido → 400" (e2e `test/app.e2e-spec.ts:77-83`).

### 2.4 Swagger

- `@ApiProperty` ×5, `@ApiPropertyOptional` ×6, `@ApiTags` ×5, `@ApiBearerAuth` ×4 (ausente só no auth),
  `@ApiOperation` ×20. Sem `@ApiResponse*` e sem plugin CLI.

## 3. Duplicação e pontos de abstração (mapeados às fases do plano)

### 3.1 MoviesService × SeriesService (→ Fase 4, `MediaService`)

Espelhados método a método (`movies.service.ts:24-64` ≡ `series.service.ts:24-64`):

- `list` 24-27 ≡ 24-27; `findEntity` 29-35 ≡ 29-35 (só muda a mensagem: `'Filme nao encontrado'` :32 ×
  `'Serie nao encontrada'` :32); `findOne` 37-39; `updateSynopsis` 41-46; `remove` 48-51 (`softDelete`).
- `watch`/`favorite` 53-64 com semânticas distintas e paridade provada pelo e2e: filme soma `durationMin`
  **de novo** no favorite (`movies.service.ts:59-64`, `:77-81`; e2e `:164` = 136 e `:173` = 272); série só
  soma no watch via `countTime` (`series.service.ts:69,81`; e2e `:194` = 45 e `:203` = 45).
- `appendWatched*` 66-82 ≡ 66-86 (~95% iguais; só `countTime` e o nome do contador); `appendFavorite`
  84-95 ≡ 88-99 (só `mediaType`/ids); `findUser` 97-103 ≡ 101-107 **byte-idênticos**, inclusive a mensagem
  `'Usuario nao encontrado'` (também repetida em `users.service.ts:48`).

### 3.2 Controllers Movies × Series (→ Fase 4, `@Authenticated`)

`movies.controller.ts` × `series.controller.ts` (76 linhas cada): `@ApiTags` :22, `@ApiBearerAuth()` :23,
`@UseGuards(JwtAuthGuard)` :24, `@Controller` :25 idênticos em forma; os 6 métodos têm o mesmo corpo (só
mudam service/DTO/sumários de `@ApiOperation`). Candidato direto a decorator composto.

### 3.3 Busca (→ Fase 2, `@ExactlyOneOf`)

- Regra "exatamente um" manual em `search.service.ts:19-30` (mensagens :26 e :29, com typo de legado);
  re-testa `id !== undefined` redundante em :32.
- `SearchQueryDto` sem regra de classe (só opcionais individuais).
- Mensagens duplicadas no front: `core/legacy-messages.ts:10-11`; a regra no front em
  `home.component.ts:79-96` (com regex `/^\d+$/` :91); a mesma regex também em `register.component.ts:30`
  e `search-results.component.ts:50`.

### 3.4 DTOs e validação (→ Fase 2)

- Trio `@ApiProperty + @IsString + @IsNotEmpty` repetido 5× (login 2×, register 3×).
- `update-movie.dto.ts` × `update-series.dto.ts` estruturalmente idênticos.
- Divergência a tratar na T2.6: ambos usam `@ApiPropertyOptional` mas o campo é `!: string` **sem**
  `@IsOptional` — o pipe atual não rejeita ausência? (conferir comportamento no e2e/pipe ao migrar).

### 3.5 Specs (→ Fase 4, `createRepositoryMock`)

- 5 specs montam mocks `{ ...jest.fn() }` manualmente; literais repetidos: `usersRepository {findOne,
  increment}` idêntico em `movies.service.spec.ts:20-23` × `series.service.spec.ts:20-23`;
  `{count, create, save}` ×4; mocks de QueryBuilder em `search.service.spec.ts:12-16` ≈
  `users.service.spec.ts:14-18`.
- `src/testing/factories.ts` só tem fábricas de entidades; não há fábrica de mock de repositório.

### 3.6 Frontend (→ Fase 3, contrato de formulário)

- Campos 100% hardcoded, sem mecanismo de metadados: `register.component.ts:27-33` (+ `.html:6-25`),
  `login.component.ts:25-29`, `home.component.ts:53-56` (+ `.html:4-14`), dialogs de sinopse
  (`movie/series-details-dialog.component.ts:46/47` e `.html:29`).
- `MoviesApiService` × `SeriesApiService` são cópias estruturais (métodos nas mesmas linhas 13-37).
- Dialogs de filme/série são 1:1 (~110 linhas espelhadas).
- Sem `mat-form-field`: inputs são HTML nativo (`<input class="campo-ceviu">`) — facilita template gerado.
- Único spec do front: `apps/web/src/app/app.spec.ts`.

### 3.7 Cobertura e2e (relevante para os "e2e verdes" da Fase 2)

`test/app.e2e-spec.ts` tem 22 `it` (auth, movies, series, search, users, soft delete). Lacunas verificadas:
`GET /series/:id`, `PATCH /series/:id`, `DELETE /series/:id`, `GET /users/:id/watched-series` (sem caso de
sucesso) e busca por título retornando série. Migrações de DTO de série contam só com specs unit + typecheck.

## 4. Dados e mini-ORM (→ Fase 5; resumo — detalhamento fica na T0.2/`INVENTARIO.md`)

- Opções únicas do DataSource em `apps/api/src/database/data-source-options.ts`: `better-sqlite3` :8,
  `database` :9, `entities` :10, `migrations` :11, `migrationsTableName` :12, `synchronize: false` :13,
  `enableWAL: true` :15. **`busy_timeout` não existe em lugar nenhum** (a T5.3 pede registrar o risco da
  coexistência).
- `database.module.ts:8-11`: `forRootAsync` + `migrationsRun: true` (migrations rodam no boot da API).
- 1 migration: `1730000000000-InitialSchema.ts` (SQL cru; CHECK em `media_type` :89-104).
- Métodos de `Repository` usados no total: `find`, `findOne`, `save`, `softDelete`, `increment`, `count`,
  `create`, `createQueryBuilder` (+ `clear`/`save`/`create` via manager no
  `legacy-migration/run-import.ts:136-282`, dentro de `AppDataSource.transaction` :136).
- QueryBuilder em 3 lugares: `users.service.ts:37-41` (excluir o logado), `auth.service.ts:24-28`
  (`withDeleted` para e-mail duplicado), `search.service.ts:51-60` (LIKE case-insensitive; escape de
  `%`/`_` em :48).
- Specs unitários usam mocks (sem banco); só o e2e usa SQLite real (arquivo temporário).

## 5. Riscos e limitações observados

1. `design:type` só cobre os DTOs fáceis (String/Number). Uniões `X | null` e arrays existem apenas nas
   entities (`user.entity.ts:30,33,36,51,54,57,60`; `movie.entity.ts:13,19,22,29` etc.) — os testes de
   caracterização da T1.2 devem usar esses casos.
2. Contrato HTTP a preservar: shape de erro do filtro global
   (`common/filters/http-exception.filter.ts`, corpo `{statusCode,message,error,path,timestamp}`),
   `whitelist/forbidNonWhitelisted` (e2e :77) e mensagens do legado com typos.
3. Coexistência SQLite: mesmo arquivo, WAL ligado, sem `busy_timeout` — risco de `SQLITE_BUSY` nos
   testes/import (registrar na T5.3).
4. Lacunas de e2e (seção 3.7) — compensar com specs unitários ao migrar DTOs/rotas de série.
5. Repo sem lint configurado (proposta V-06 da Fase 5 segue aberta).

## 6. Referências conferidas por amostragem (leitura direta, 2026-10-18)

| Referência | O que foi confirmado |
|---|---|
| `tsconfig.base.json:21-22` | `experimentalDecorators`/`emitDecoratorMetadata` ligados |
| `setup-app.ts:6-25` | `setGlobalPrefix('api')` :7; `ValidationPipe` :8-14; filtro :15; Swagger :18-25 |
| `search.service.ts:19-30` | regra manual "exatamente um"; mensagens :26/:29; redundância :32 |
| `movies.service.ts` (íntegra) | métodos/linhas da duplicação (24-64, 66-103) e mensagem :100 |
| `series.service.ts` (íntegra) | espelhamento; `countTime` :69; mensagem :104 |
| `current-user.decorator.ts:8-13` | `createParamDecorator` retornando `request.user` |
| `search-query.dto.ts:5-17` | `title`/`id` opcionais; `@Type(() => Number)` :13 |
| `legacy-messages.ts:10-11` | mensagens da busca com typos preservados |
| `register.component.ts:27-33` | form fixo; `Validators.pattern(/^\d+$/)` :30 |
| `git status` pós-baseline | árvore limpa (testes não sujam o repo) |

## 7. Incertezas

- Referências vindas da varredura (fora da amostra acima) não foram reconferidas uma a uma — em especial
  entities, controllers e specs (contagens como `@Column` ×35 podem variar). O próprio plano já manda
  tratar a auditoria como hipótese.
- A divergência `@ApiPropertyOptional` × falta de `@IsOptional` (seção 3.4) foi observada no código, mas o
  comportamento exato do `ValidationPipe` com o campo ausente deve ser confirmado ao migrar (T2.6).
