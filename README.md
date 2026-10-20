# CeViu

Catálogo de filmes e séries migrado do sistema legado CeViu (Java/Swing) para uma API
NestJS 11 + SQLite e um frontend Angular 22. O projeto tem um mecanismo próprio de
**reflexão de metadados** nos dois lados: decorators gravam metadados nas classes e os
consumidores leem esses metadados em runtime para validar, montar formulários, gerar SQL e
desenhar telas genéricas.

Este README cobre como rodar, a arquitetura, os endpoints, os testes e — em detalhe — a
reflexão/abstração: o que existe, por que existe e quais são os limites deliberados.

## Visão geral

Funcionalidades:

- cadastro e login (JWT);
- catálogo de filmes e séries: listar, detalhar, editar sinopse, excluir;
- marcar assistido e favorito (registram histórico e somam minutos);
- pesquisa por título ou por id (exatamente um campo);
- perfis da comunidade com listas de assistidos e favoritos;
- home com populares de cada tipo de mídia;
- formulários montados a partir de metadados publicados pela API.

Diferenciais arquiteturais:

- validação declarativa própria, sem `class-validator`/`class-transformer`;
- mini-ORM próprio sobre `better-sqlite3`, sem TypeORM;
- contratos de formulário compartilhados (`packages/shared`) e montagem dinâmica no front;
- telas de mídia 100% genéricas: **uma** tela de catálogo, **um** dialog e **N** tipos
  (filmes/séries) definidos pelo `key` do decorator `@MediaKind`.

## Stack

| Camada | Tecnologia |
|---|---|
| API | NestJS 11, TypeScript 5.7, `better-sqlite3`, Swagger |
| Web | Angular 22 (standalone, signals, `rxResource`), Angular Material/CDK, TypeScript 6 |
| Contratos | `@ceviu/shared` (workspace) |
| Testes | Jest + Supertest (API) e Vitest + jsdom (web) |
| Banco | SQLite em arquivo (WAL), migrations SQL aplicadas no boot |

## Requisitos

- Node.js 22 ou superior (Angular 22 exige `^20.19`, `^22.12` ou `>=24`; prefira 22 LTS).
- npm 11 (o workspace web declara `npm@11.12.1`).
- Windows, Linux ou macOS. Os exemplos usam PowerShell, mas os comandos npm são iguais.

## Como rodar

### 1. Instalar dependências

Na raiz do repositório:

```powershell
npm install
```

O workspace `@ceviu/shared` é compilado no `install` (script `prepare`). Se o `dist` não existir,
compile manualmente; e repita sempre que editar `packages/shared/src`:

```powershell
npm run build --workspace @ceviu/shared
```

### 2. Configurar variáveis de ambiente (opcional)

O arquivo `apps/api/.env` já existe no ambiente local. Para recriá-lo a partir do exemplo:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

| Variável | Padrão | Para que serve |
|---|---|---|
| `PORT` | `3000` | Porta da API |
| `DATABASE_PATH` | `data/ceviu.sqlite` | Caminho do SQLite, relativo à raiz do monorepo |
| `JWT_SECRET` | `troque-este-segredo` | Assinatura do JWT; em produção o valor padrão é rejeitado |
| `JWT_EXPIRES_IN` | `1d` | Validade do token |
| `BCRYPT_ROUNDS` | `10` | Custo do hash de senha |

`DATABASE_PATH` pode ser sobrescrito por `CEVIU_DATA_DIR` (diretório base de dados e legado).

### 3. Banco de dados e dados iniciais

- O banco fica em `data/ceviu.sqlite` (na raiz). As migrations SQL rodam sozinhas no boot
  da API; não há CLI de migration.
- A pasta `data/` é **local e não versionada**. Neste ambiente ela já contém o banco populado
  pela importação do legado. Os arquivos de origem ficam em `data/legacy/` (`Filmes.txt`,
  `Series.txt`, `Perfil.txt`, `Usuarios.txt`) e os relatórios em
  `data/migration-report.json` e `data/migration-report.md`.
- Em um clone novo (sem `data/`), a API sobe com o banco vazio: cadastre-se pela tela
  `/register`. O importador do legado só funciona se os arquivos `.txt` estiverem em
  `data/legacy/`.
- Para reimportar do zero (com os arquivos do legado presentes):

```powershell
npm run migrate:legacy
```

O importador limpa as seis tabelas antes de inserir (pode ser executado novamente sem
duplicar dados) e recria usuários com senha em bcrypt.

### 4. Subir API e frontend

Use dois terminais:

```powershell
npm run dev       # API em http://localhost:3000/api
npm run dev:web   # frontend em http://localhost:4200
```

| Serviço | URL |
|---|---|
| Frontend | http://localhost:4200 |
| API | http://localhost:3000/api |
| Swagger | http://localhost:3000/api/docs |
| Login de teste | `gsb@gmail.com` / `12345` (usuário do banco importado; em banco vazio, cadastre-se) |

O CORS da API libera apenas `http://localhost:4200` e o front aponta para
`http://localhost:3000/api` (`apps/web/src/app/core/api-config.ts`). Se mudar qualquer uma das
portas, ajuste os dois lados (`setup-app.ts` e `api-config.ts`).

### 5. Scripts principais

Na raiz:

| Comando | O que faz |
|---|---|
| `npm run dev` | API em modo watch (`nest start --watch`) |
| `npm run dev:web` | front com `ng serve` |
| `npm run build` | compila a API (`tsc`) |
| `npm run build:web` | build de produção do front |
| `npm run typecheck` | typecheck da API (código e testes) |
| `npm run typecheck:web` | typecheck do app Angular |
| `npm test` | testes unitários da API (Jest) |
| `npm run test:e2e` | testes e2e da API (Supertest, `:memory:`) |
| `npm run migrate:legacy` | importa `data/legacy/*.txt` para o SQLite |
| `npm run test --workspace @ceviu/web -- --watch=false` | testes web (Vitest, uma execução) |
| `npx tsc -p apps\web\tsconfig.spec.json --noEmit` | typecheck dos specs do front |

Observação: os scripts `migration:run`/`migration:revert` do `package.json` raiz são
resquícios da época do TypeORM e **não existem mais** no workspace da API — as migrations são
aplicadas automaticamente no boot.

## Estrutura do repositório

```text
apps/
  api/
    src/
      framework/          # núcleo de reflexão, validação, formulários e mini-ORM
      common/             # decorators @Authenticated/@CurrentUser, filtros, paths
      modules/            # auth, users, movies, series, search, metadata
      database/           # entidades decoradas e migrations SQL
      legacy-migration/   # importador do legado (parser, relatório)
      config/             # configuração e validação de ambiente
    test/                 # e2e
  web/
    src/app/
      core/               # reflection, media (@MediaKind/registry), forms, auth, http
      features/           # shell, auth, home, media, search, profiles, dialogs
      shared/             # componentes e utilitários reutilizáveis
    public/imagens/       # imagens do legado
packages/
  shared/                 # contratos: DTOs, FormMetadata/FieldMetadata/FormRule
data/                     # SQLite, arquivos do legado e relatórios (não versionado)
docs/reflexao/            # plano, handoff, relatório e guia didático (local, fora do git)
```

## API

Rotas públicas: `POST /api/auth/register`, `POST /api/auth/login` e
`GET /api/metadata/:form`. As demais exigem `Authorization: Bearer <token>`.

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/register` | cria usuário (nome, email, idade obrigatória, senha, bio opcional) |
| POST | `/api/auth/login` | autentica e devolve o token |
| GET | `/api/metadata/:form` | publica o descritor do formulário (5 nomes: `register`, `login`, `movie-synopsis`, `series-synopsis`, `search-catalog`) |
| GET | `/api/movies` · `/api/series` | lista o catálogo |
| GET | `/api/movies/:id` · `/api/series/:id` | detalhe |
| PATCH | `/api/movies/:id` · `/api/series/:id` | atualiza a sinopse |
| DELETE | `/api/movies/:id` · `/api/series/:id` | exclui |
| POST | `/api/movies/:id/watch` · `/api/series/:id/watch` | registra assistido (histórico + soma de minutos) |
| POST | `/api/movies/:id/favorite` · `/api/series/:id/favorite` | registra favorito |
| GET | `/api/users` | lista perfis da comunidade |
| GET | `/api/users/:id` | perfil |
| GET | `/api/users/:id/watched-movies` · `watched-series` · `favorites` | listas do perfil |
| GET | `/api/search?title=...` ou `/api/search?id=...` | pesquisa (exatamente um campo; a regra é validada por metadado) |

Formato de erro: `{ "statusCode": 400, "message": string | string[], "error": "Bad Request" }`.

### Formulários dinâmicos

O DTO declara a UI com `@Field` e as regras com os decorators de validação. O endpoint
`GET /api/metadata/:form` lê esses metadados e publica `FormMetadata` (campos, ordem,
`required`, `min`, `maxLength`, `pattern` e regras de classe). No front,
`MetadataApiService` busca o JSON e `buildForm` monta o `FormGroup` com os validadores reais.
Nenhuma tela repete labels ou validação do servidor.

## Reflexão e abstração

### O que é, neste projeto

Um decorator é uma função chamada pelo TypeScript quando a classe é carregada. No CeViu, os
decorators **gravam metadados** no construtor da classe, sob chaves com o prefixo `ceviu:`.
Leitores específicos consultam esses metadados em runtime:

- o pipe global de validação valida cada requisição;
- o descritor de formulário publica o JSON para o front;
- o mini-ORM monta SQL, hidrata linhas e valida colunas;
- no front, o registry de tipos de mídia monta menu, catálogo, dialog, home e pesquisa.

Não há geração de código nem passo de build especial: é metadado gravado e lido em runtime.

### Backend — onde a reflexão está

| Concern | Decorators | Leitor em runtime | Chave |
|---|---|---|---|
| Validação de DTOs | `@IsString`, `@IsNotEmpty`, `@IsOptional`, `@IsInt`, `@Min`, `@MaxLength`, `@Matches`, `@ExactlyOneOf` | `FrameworkValidationPipe` → `validate` | `ceviu:validation:rules` e `ceviu:validation:class-rules` |
| Formulários | `@Field` | `describeForm` → `GET /api/metadata/:form` | `ceviu:form:fields` |
| ORM | `@Entity`, `@PrimaryKey`, `@Column`, `@ManyToOne`, `@OneToMany` | `TableContext`, `BaseRepository`, `hydrate`, `QueryBuilder`, `createTableSql` | `ceviu:orm:entity`, `ceviu:orm:columns`, `ceviu:orm:relations` |
| Autenticação | `@Authenticated` (composto sobre Nest/Swagger), `@CurrentUser` | guards/param decorators do Nest | metadados do próprio Nest |
| Frontend | `@MediaKind` | `MediaKindRegistry` | `ceviu:media:kind` |

O núcleo inteiro cabe em **4 chamadas de `Reflect.*`**
(`framework/reflection/class-metadata.ts:76,81,95` e `infer-type.ts:35`). `reflect-metadata`
existe apenas para fornecer o `Reflect` no runtime do Node.

### Frontend — reflexão própria

O web **não usa `Reflect` nem `reflect-metadata`**. O store é um
`WeakMap<object, Map<string, unknown>>` em `apps/web/src/app/core/reflection/class-metadata.ts`.
O decorator `@MediaKind(descritor)` grava o objeto descritor da classe
(`core/media/media-kind.ts:67-73`) e o `MediaKindRegistry` o lê em runtime
(`core/media/media-kind.registry.ts:19-46`).

O registry é **explícito** (`MEDIA_KINDS = [MoviesApiService, SeriesApiService]`) e há um
`MEDIA_KINDS_TOKEN` para testes trocarem o conjunto sem tocar nas telas.

### Por que reflexão e abstração estão ali

1. **Fonte única de verdade por concern.** O DTO declara a regra uma vez; o motor, o
   descritor e o front a consomem. Coluna de entidade declara o tipo uma vez; SQL, hidratação
   e DDL de teste saem do mesmo metadado. Tipo de mídia declara seus rótulos e telas uma vez;
   menu, catálogo, home, busca e dialog leem o mesmo descritor.
2. **O metadado não pode mentir.** `required` do formulário é derivado das regras reais de
   validação (`isOptional`), não de um booleano digitado à mão. O DDL gerado pelo metadado é
   comparado com o schema real (migrations) nos testes.
3. **Paridade com o legado.** Mensagens, títulos e até typos do Swing foram preservados como
   contrato (`search` usa "prenchido", por exemplo) e ficam cobertos por testes com textos
   divergentes de fixture, provando que a fonte é o servidor.
4. **Menos duplicação.** Filmes e séries tinham telas, dialogs e seções duplicados no Angular;
   hoje há uma implementação de cada e dois descritores. No backend, a lógica comum de mídia
   mora no `MediaService`, e os controllers permanecem finos e concretos.
5. **Testes provam o mecanismo, não só a tela.** Há specs para o núcleo de metadados, para o
   motor de validação, para o descritor, para o ORM e specs parametrizados pelos dois tipos de
   mídia. A revisão incluiu mutação (inverter a condição do guard derruba os specs).

### Limites deliberados (e por quê)

- **`design:type` degrada.** Uniões com `null` viram `Object`, `string[]` vira `Array` e
  `import type` vira `Function`. Por isso `@Column` exige `type` explícito em propriedades
  anuláveis, e a inferência é só um fallback.
- **Erros de metadado aparecem em runtime.** Não há checagem em compile-time; a decoração
  falha alto (por exemplo, coluna sem tipo resolvível) e os specs cobrem esses caminhos.
- **Controllers são concretos.** Em um controller genérico, o `design:paramtypes` do `@Body`
  degrada para `Object` e a validação dinâmica se perde. A abstração fica no `MediaService`;
  os controllers continuam explícitos.
- **Migrations SQL são a fonte da verdade.** Índices e constraints não vivem no metadado. O
  `createTableSql` existe para testar conformidade, não para gerar migrations.
- **Registries são explícitos.** Nest e Angular não enumeram providers com segurança em
  runtime; `FORMS` e `MEDIA_KINDS` custam uma linha e dão erro determinístico (classe
  registrada sem decorator falha citando a classe).
- **O front não usa `Reflect`.** O store `WeakMap` resolve o mesmo problema sem polyfill.
- **Sem lint configurado.** A garantia vem de typecheck, testes e build.

## A tela genérica de mídia (o `key` do `@MediaKind`)

Esta é a parte que mais confunde à primeira vista: **não existe uma tela por nome de mídia** e
nada é inferido do nome da classe. Existe uma tela genérica preenchida por um **descritor**
gravado pelo decorator. A identidade do tipo é o `key`; os textos como "Filmes" são apenas
rótulos de exibição.

O descritor de filmes, por exemplo:

```ts
// apps/web/src/app/core/api/movies-api.service.ts
@MediaKind({
  key: 'movies',
  navLabel: 'Filmes',
  pageTitle: 'Filmes e series',
  listTitle: 'Todos os Filmes',
  form: 'movie-synopsis',
  // ... mensagens do legado, imagePath, cardLines, searchLine, detailLines
})
@Injectable({ providedIn: 'root' })
export class MoviesApiService { /* list, get, updateSynopsis, remove, watch, favorite */ }
```

Fluxo completo:

1. **Gravação.** `@MediaKind` grava o descritor em `ceviu:media:kind`
   (`core/media/media-kind.ts:67-73` → `core/reflection/class-metadata.ts`).
2. **Registry.** `MediaKindRegistry.entradas()` resolve cada classe registrada em
   `MEDIA_KINDS`; `porKey(key)` encontra a entrada pelo `key`
   (`core/media/media-kind.registry.ts:27-46`). Classe sem decorator falha com mensagem
   explícita.
3. **Rota.** `/media/:kind` (`app.routes.ts:40-49`) usa `mediaKindGuard`: tipo desconhecido
   volta para `/home`. O título da janela vem do `pageTitle` do descritor.
4. **Binding.** `withComponentInputBinding()` liga o parâmetro `:kind` ao `input` do
   `MediaListComponent`; trocar de tipo na mesma tela refaz o `rxResource` sem recriar o
   componente.
5. **Tela.** O componente faz `registry.porKey(kind)` e usa **um único template**:
   `listTitle`, `listEmptyMessage`, `listErrorMessage`, cards (3 por linha), `imagePath`,
   `cardLines` e o serviço HTTP (`injector.get(entrada.api)`) saem da entrada. Não há `if`
   para filme ou série no template.
6. **Menu.** O shell itera `MediaKindRegistry.entradas()` e monta os links
   `/media/<key>` com `navLabel` (`shell.component.ts:31`).
7. **Home e pesquisa.** A home cria uma seção por entrada (`popularTitle`, 4 cards por linha)
   e a pesquisa monta uma seção por tipo com `searchSectionLabel`/`searchCountLabel`
   (`home.component.ts:52`, `search-results.component.ts:44`).
8. **Dialog.** Aberto com `{ kind, id }`; resolve o descritor, mostra `dialogTitlePrefix`,
   `imagePath` e `detailLines`, carrega o formulário publicado pela API (`entrada.metadados.form`
   — `movie-synopsis` ou `series-synopsis`) e usa `deleteOkMessage`/`deleteErrorMessage`.

Para adicionar um tipo de mídia no front: **1 decorator + 1 linha** em `MEDIA_KINDS`. As telas
se ajustam sozinhas. No backend, um tipo real ainda precisa de entidade, DTO, service,
controller e (se tiver tela de formulário) um nome em `FORMS` — novela é apenas o exemplo
hipotético usado na documentação; o código atual registra filmes e séries.

## Verificação e testes

Estado em 2026-10-19:

| Gate | Resultado |
|---|---|
| Testes unitários da API | 205/205 em 26 suítes |
| Testes e2e da API | 28/28 |
| Testes do front | 67/67 em 12 arquivos |
| `npm run typecheck` e `npm run typecheck:web` | ok |
| `npm run build` e `npm run build:web` | ok |

Comandos:

```powershell
npm test
npm run test:e2e
npm run typecheck
npm run typecheck:web
npm run test --workspace @ceviu/web -- --watch=false
npx tsc -p apps\web\tsconfig.spec.json --noEmit
npm run build
npm run build:web
```

Os testes unitários da API usam banco em memória (`:memory:`) e o e2e usa um arquivo separado
(`apps/api/test/ceviu-e2e.sqlite`, apagado e recriado a cada execução) — nenhum dos dois toca em
`data/ceviu.sqlite`. Os specs do front não são cobertos pelo `typecheck:web`; use o comando
`tsc -p apps\web\tsconfig.spec.json` acima.

## Documentação adicional

`docs/reflexao/` (local, não versionado por regra do projeto) contém:

- `PLANO.md` — fases, tarefas e decisões;
- `HANDOFF.md` — estado atual, roteiro manual e armadilhas;
- `RELATORIO.md` — inventário técnico da reflexão (chaves, fluxos, limitações);
- `guia/` — guia didático: mapa da reflexão, catálogo dos 18 decorators e tutorial de nova
  classe.

## Problemas comuns

| Sintoma | Causa | Solução |
|---|---|---|
| `EADDRINUSE` na API | Porta 3000 ocupada | Encerre o processo ou mude `PORT` |
| Front sem dados / erro de CORS | API em outra porta ou front fora da 4200 | Mantenha as duas portas ou ajuste `setup-app.ts` e `api-config.ts` |
| Login `gsb@gmail.com` falha | Banco vazio | Rode `npm run migrate:legacy` |
| `JWT_SECRET deve ser definido em producao` | `NODE_ENV=production` com o segredo padrão | Defina `JWT_SECRET` |
| `SQLITE_BUSY` / banco travado | Outra instância da API aberta | Feche a outra instância; os arquivos `-wal`/`-shm` somem ao encerrar |
| Tipos de `@ceviu/shared` desatualizados | Editou `packages/shared/src` | `npm run build --workspace @ceviu/shared` |
| `npm run migration:run` falha | Script residual do TypeORM | Não use; migrations rodam no boot |
| Specs do front com erro de tipo mas testes verdes | `typecheck:web` não inclui specs | `npx tsc -p apps\web\tsconfig.spec.json --noEmit` |
| `better-sqlite3` não carrega | Binário incompatível com a versão do Node | Use Node 22 LTS e rode `npm rebuild better-sqlite3` |

## Paridade e mudanças registradas

O projeto busca paridade com o legado, inclusive nas mensagens ao usuário. Algumas mudanças
foram registradas de propósito e estão detalhadas em `docs/reflexao/PLANO.md`:

- idade obrigatória no cadastro (o DTO passou a refletir a tela);
- login com campos vazios mostra "Usuário ou senha inválidos..." (antes: "Falha ao conectar");
- id não numérico na pesquisa navega para os resultados e mostra o vazio do legado, em vez de
  "Campos inválidos!";
- sinopse vazia continua aceita pelo servidor (sem `@IsNotEmpty`), como no legado.
