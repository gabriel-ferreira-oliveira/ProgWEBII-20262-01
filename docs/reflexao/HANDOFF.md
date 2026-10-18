# HANDOFF (atualizado em 2026-10-18)

## Retomada em 30 segundos
- Branch: `feat/reflexao` | Último commit: `T0.1: auditoria de reflexão, baseline e documentos de acompanhamento` (hash exato: `git log -1 --format=%h`; este arquivo foi commitado junto do próprio commit)
- Árvore limpa? sim (após o commit da T0.1)
- **Próxima ação exata:** T0.2 — Inventário do TypeORM (somente leitura). Primeiro passo: abrir `apps/api/src/database/` (`entities/`, `data-source.ts`, `data-source-options.ts`, `database.module.ts`, `migrations/`) e os 5 services que injetam repositórios, consolidar métodos de `Repository`/`DataSource` usados e o grafo service→entidade, e escrever `docs/reflexao/INVENTARIO.md`. Não alterar código.

## Estado
- Concluídas: **T0.1** — branch criada; scripts confirmados no `package.json`; baseline completa verde; `docs/auditoria-reflexao.md` gerada (a auditoria prévia não existia e o usuário autorizou gerá-la); `docs/reflexao/PLANO.md` e este HANDOFF criados.
- Em andamento: nenhuma.
- Bloqueadas: nenhuma.

## Verificação (última execução)
| Comando | Resultado | Observação |
|---|---|---|
| `git status` (base) | limpo, `main` @ `f0583cc` | antes de criar a branch |
| `npm test` | 26/26 passaram (5 suites) | baseline original (unit, mocks) |
| `npm run test:e2e` | 22/22 passaram | ~27 s; SQLite temporário |
| `npm run typecheck` | sem erros | tsc strict (src + test) |
| `npm run typecheck:web` | sem erros | tsc strict do frontend |
| `git status` (pós-testes) | limpo | os testes não sujam a árvore |

**Nenhuma falha pré-existente.** Não rodados nesta tarefa: `npm run build`/`build:web` (não pedidos pela T0.1).

## Mapa do que foi criado
- `docs/auditoria-reflexao.md` → auditoria prévia (gerada na T0.1): reflexão existente hoje, famílias de decorators, duplicação mapeada às fases, resumo do uso do TypeORM, riscos, referências conferidas por amostragem.
- `docs/reflexao/PLANO.md` → seções 2 e 5 literais do prompt + seção "Decisões" (append-only). Fonte da verdade.
- `docs/reflexao/HANDOFF.md` → este arquivo (reescrito inteiro a cada tarefa).

## Armadilhas descobertas
- **Não há uso direto de `Reflect.*`** no código; `reflect-metadata` é importado só em `data-source.ts:2` e `run-import.ts:1` (no app o polyfill vem do side-effect do `@nestjs/core`). O núcleo da Fase 1 será o primeiro uso manual.
- `data-source-options.ts` tem `enableWAL: true` mas **não tem `busy_timeout`** (risco para a coexistência TypeORM + mini-ORM — registrar na T5.3).
- **Lacunas de e2e:** `GET/PATCH/DELETE /series/:id`, `GET /users/:id/watched-series` (caso de sucesso) e busca por título retornando série não são cobertos; migrações de DTO de série contam só com specs unit + typecheck.
- Front usa HTML nativo (**sem `mat-form-field`**) e nenhum formulário dirigido por metadados; regex `/^\d+$/` duplicada em 3 pontos (`register.component.ts:30`, `home.component.ts:91`, `search-results.component.ts:50`).
- Repo **sem lint configurado** (proposta V-06 da Fase 5 segue aberta; não bloqueia).
- `main` está no commit `f0583cc` ("port trabalho poo1"); não havia branch `feat/reflexao` — criada na T0.1.
- `docs/` cai na regra `DOCS` do `.gitignore:11` (case-insensitive no Windows) e nunca foi versionado (`git ls-files docs` vazio; o próprio `.gitignore` é ignorado, linha 42). A T0.1 commitou os 3 arquivos com `git add -f`; **documento novo em `docs/reflexao/` precisa de `-f` na primeira vez** (depois de rastreado, o `git status` volta a mostrar edições normalmente).

## Perguntas abertas ao usuário
- Nenhuma no momento. (A T3.5 fará a pergunta sobre idade no cadastro quando chegar.)

## Comandos úteis (confirmados no repo)
```bash
# baseline (raiz do monorepo)
npm test; npm run test:e2e; npm run typecheck; npm run typecheck:web

# rodar a aplicação
npm run dev          # API em http://localhost:3000/api (Swagger em /api/docs)
npm run dev:web      # frontend em http://localhost:4200

# banco/importação
npm run migration:run; npm run migrate:legacy
```
- Login de teste: `gsb@gmail.com` / `12345`.
