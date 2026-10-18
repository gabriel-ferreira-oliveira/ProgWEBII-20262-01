# HANDOFF (atualizado em 2026-10-18 12:35)

## Retomada em 30 segundos
- Branch: `feat/reflexao` | Último commit: `T0.2: inventário do TypeORM (somente leitura)` (hash exato: `git log -1 --format=%h`)
- Árvore limpa? sim (após o commit da T0.2)
- **Próxima ação exata:** T1.1 — helpers de metadado por classe (gravar *own*, ler com merge pela cadeia de protótipos, isolamento entre classes). Primeiro passo: criar o teste primeiro em `apps/api/src/framework/reflection/` (spec com casos de herança/isolamento) e só então o helper; rodar `npm test`. Marcar `[~]` no PLANO antes de codar.

## Estado
- Concluídas: **T0.1** (branch, baseline, `docs/auditoria-reflexao.md`, PLANO/HANDOFF) e **T0.2** (`docs/reflexao/INVENTARIO.md` — inventário do TypeORM somente leitura; nenhum código tocado; suíte completa revalidada → **Fase 0 verificada** no PLANO).
- Em andamento: nenhuma.
- Bloqueadas: nenhuma.

## Verificação (última execução — 2026-10-18, fim da T0.2)
| Comando | Resultado | Observação |
|---|---|---|
| `git status` (pré-T0.2) | limpo, `feat/reflexao` @ `3dde161` | antes de qualquer edição |
| `npm test` | 26/26 passaram (5 suites) | baseline da T0.1, revalidada ao fim da T0.2 |
| `npm run test:e2e` | 22/22 passaram | ~2,8 s; SQLite temporário |
| `npm run typecheck` | sem erros | tsc strict (src + test) |
| `npm run typecheck:web` | sem erros | tsc strict do frontend |
| `npm run build` | sem erros | dist/ da API |
| `npm run build:web` | ok (390,78 kB inicial) | `ng build`, 8,5 s |
| `git status` (pós-testes) | limpo | testes/builds não sujam a árvore |

**Nenhuma falha pré-existente.** Baseline original da T0.1: mesmos resultados (unit/e2e/typechecks); `build`/`build:web` não haviam sido rodados na T0.1 e ficaram verdes na T0.2.

## Mapa do que foi criado
- `docs/reflexao/INVENTARIO.md` → T0.2: métodos de `Repository`/`DataSource` realmente usados (com `arquivo:linha`), decorators das entidades, mocks/specs/e2e, grafo service↔entidade, "não usados" e implicações para o mini-ORM (insumo da T5.8).
- `docs/auditoria-reflexao.md` → T0.1: reflexão atual (zero `Reflect.*` manual), famílias de decorators, duplicação mapeada às fases, riscos.
- `docs/reflexao/PLANO.md` → seções 2 e 5 literais do prompt + "Decisões" (append-only) + "Fase 0 verificada". Fonte da verdade.
- `docs/reflexao/HANDOFF.md` → este arquivo (reescrito inteiro a cada tarefa).

## Armadilhas descobertas
- `docs/` cai na regra `DOCS` do `.gitignore:11` (case-insensitive no Windows); documento **novo** em `docs/` exige `git add -f` na primeira vez (o `INVENTARIO.md` foi commitado assim); depois de rastreado, edições aparecem normalmente.
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

# rodar a aplicação
npm run dev          # API em http://localhost:3000/api (Swagger em /api/docs)
npm run dev:web      # frontend em http://localhost:4200

# banco/importação
npm run migration:run; npm run migrate:legacy
```
- Login de teste: `gsb@gmail.com` / `12345`.
