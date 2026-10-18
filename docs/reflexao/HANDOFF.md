# HANDOFF (atualizado em 2026-10-18 12:58)

## Retomada em 30 segundos
- Branch: `feat/reflexao` | Último commit: `T1.2: inferência de tipo sobre design:type (Fase 1 completa)` (hash exato: `git log -1 --format=%h`)
- Árvore limpa? sim (após o commit da T1.2)
- **Próxima ação exata:** Fase 2, **T2.1** (aguarda pedido do usuário — regra 1) — decorators `@IsString @IsNotEmpty @IsOptional @IsInt @Min @MaxLength @Matches` que só gravam regras no registro (usar `defineOwnMetadata`/`getMergedMetadata` de T1.1; chaves novas prefixadas `ceviu:`). Marcar `[~]` no PLANO e "Em andamento" no HANDOFF; spec primeiro em `apps/api/src/framework/validation/`; depois `npm test` + `npm run typecheck`; commit `T2.1: ...`.

## Estado
- Concluídas: **T0.1**, **T0.2**, **T1.1** (registro reflexivo) e **T1.2** (`inferType`). **Fase 1 verificada** no PLANO (suíte completa verde ao fim da T1.2).
- Em andamento: nenhuma.
- Bloqueadas: nenhuma.

## Verificação (última execução — 2026-10-18, fim da T1.2 / fechamento da Fase 1)
| Comando | Resultado | Observação |
|---|---|---|
| `git status` (pré-T1.2) | limpo, `feat/reflexao` @ `82ff7f8` | antes de qualquer edição |
| `npm test` (baseline T1.2) | 40/40 passaram (6 suites) | pré-implementação |
| experimento `_experimento.spec.ts` (descartado) | — | caracterizou `design:type`: uniões/null → `Object`; `?` preserva tipo; `string[]` → `Array`; `import type` → `Function`; sem decorator → ausente |
| `npx jest infer-type` (spec primeiro) | falhou (TS2307: módulo inexistente) | vermelho intencional do TDD |
| `npx jest infer-type` (pós-impl) | 16/16 passaram | `infer-type.spec.ts` (11 de comportamento + 5 de caracterização bruta) |
| `npm test` (final) | 56/56 passaram (7 suites) | 40 antigos + 16 novos, sem regressão |
| `npm run test:e2e` | 22/22 passaram | fechamento de fase (regra 14) |
| `npm run typecheck` | sem erros | tsc strict (src + test) |
| `npm run typecheck:web` | sem erros | tsc strict do frontend |
| `npm run build` | sem erros | dist/ da API |
| `npm run build:web` | ok (390,78 kB inicial) | `ng build`, ~2,2 s |

**Não verificado:** nada pendente para esta fase; experimento de caracterização foi removido (`_experimento*`) e não está no commit.

## Mapa do que foi criado
- `apps/api/src/framework/reflection/class-metadata.ts` → T1.1: grava metadado *own* no **construtor** sob chave `ceviu:<key>` (`Reflect.defineMetadata`), normalizando alvo (construtor/protótipo/instância); leitura mesclada raiz→alvo (registros por spread, arrays concat, demais tipos descendente vence; contêiner clonado). Consumido por F2/F3/F5. (+ `class-metadata.spec.ts` — 14 testes.)
- `apps/api/src/framework/reflection/infer-type.ts` → T1.2: lê `design:type` (protótipo do alvo) e devolve o tipo **só** para String/Number/Boolean/Date; qualquer outro metadado (Object, Array, Function, classe, ausente) devolve o `override` (fallback). Consumido por F2 (conversão plain→instância) e F5 (tipo da coluna). (+ `infer-type.spec.ts` — 16 testes, inclui caracterização bruta do emissor.)
- `apps/api/src/testing/infer-type-fixture.ts` → T1.2: classe usada **apenas** via `import type` no spec, para caracterizar a limitação (vira `Function`). `src/testing/` já é a convenção de helpers de teste (vide `factories.ts`) e é excluída do build.
- `docs/reflexao/INVENTARIO.md` → T0.2: métodos de `Repository`/`DataSource` realmente usados (com `arquivo:linha`), decorators das entidades, mocks/specs/e2e, grafo service↔entidade, "não usados" e implicações para o mini-ORM (insumo da T5.8).
- `docs/auditoria-reflexao.md` → T0.1: reflexão atual (zero `Reflect.*` manual), famílias de decorators, duplicação mapeada às fases, riscos.
- `docs/reflexao/PLANO.md` → seções 2 e 5 literais do prompt + "Decisões" (append-only) + "Fase 0/1 verificadas". Fonte da verdade.
- `docs/reflexao/HANDOFF.md` → este arquivo (reescrito inteiro a cada tarefa).

## Armadilhas descobertas
- **`emitDecoratorMetadata` (caracterizado na T1.2, TS 5.7 + tsconfig base):** uniões e `| null`/`| undefined` explícitos → `Object`; propriedade **opcional** (`?: number`) preserva o tipo (`Number`); `string[]` → `Array`; classe importada via **`import type`** → `Function` (não `Object`!); propriedade **sem decorator** não recebe metadado. Sempre use `inferType(..., override)` quando o tipo real importa.
- tsconfig base: `strict`, `strictNullChecks`, `emitDecoratorMetadata` ligados; **sem** `isolatedModules` (por isso `import type` compila, só degrada o metadado).
- `docs/` cai na regra `DOCS` do `.gitignore:11` (case-insensitive no Windows); documento **novo** em `docs/` exige `git add -f` na primeira vez; depois de rastreado, edições aparecem normalmente.
- "Decisões" do PLANO é **append-only**: anexar no fim (nunca substituir cabeçalho de decisão existente — quase corrompeu na T1.1).
- `git add` com pathspec misto (novo + docs modificados) pode sair com erro "paths are ignored" mas ainda deixar tudo staged — conferir com `git status` antes de assumir falha.
- `JwtStrategy` **não** consulta repositório (`jwt.strategy.ts:17-19` devolve o payload direto) — o texto do `docs/HANDOFF.md` §12.3 descrevia um carregamento de usuário que não existe.
- `created_at` não tem DEFAULT no DDL; quem preenche é o driver TypeORM (`@CreateDateColumn`) — o mini-ORM deve fazer o mesmo no insert. No schema só existem `integer` e `text` (datas como texto).
- Sem `busy_timeout` em lugar nenhum (WAL ligado) — risco da coexistência TypeORM+mini-ORM fica para a T5.3.
- Mini-ORM pode ignorar, até prova em contrário: relations loading, cascatas ORM, listeners, variantes `*By`, `update/delete/insert` diretos, agregados (INVENTARIO §10).
- Lacunas de e2e seguem: `GET/PATCH/DELETE /series/:id`, `GET /users/:id/watched-series` (caso de sucesso) e busca por título retornando série.
- Repo sem lint configurado (proposta V-06 segue aberta). Front usa HTML nativo sem `mat-form-field`; regex `/^\d+$/` duplicada em 3 pontos (`register.component.ts:30`, `home.component.ts:91`, `search-results.component.ts:50`).

## Perguntas abertas ao usuário
- Nenhuma no momento. (A T3.5 fará a pergunta sobre idade no cadastro quando chegar.)

## Comandos úteis (confirmados no repo)
```bash
# suíte completa (raiz do monorepo)
npm test; npm run test:e2e; npm run typecheck; npm run typecheck:web; npm run build; npm run build:web

# rodar só uma pasta de testes (cwd apps/api — usa o jest do package.json do workspace)
npx jest framework/reflection

# rodar a aplicação
npm run dev          # API em http://localhost:3000/api (Swagger em /api/docs)
npm run dev:web      # frontend em http://localhost:4200

# banco/importação
npm run migration:run; npm run migrate:legacy
```
- Login de teste: `gsb@gmail.com` / `12345`.
