# HANDOFF (atualizado em 2026-10-18 12:50)

## Retomada em 30 segundos
- Branch: `feat/reflexao` | Último commit: `T1.1: helpers de metadado por classe (registro reflexivo)` (hash exato: `git log -1 --format=%h`)
- Árvore limpa? sim (após o commit da T1.1)
- **Próxima ação exata:** T1.2 (aguarda pedido do usuário — regra 1) — marcar `[~]` no PLANO e "Em andamento" no HANDOFF; escrever o spec primeiro em `apps/api/src/framework/reflection/infer-type.spec.ts` para `inferType(target, key, override?)` sobre `design:type` (String/Number/Boolean/Date), com fallback para override quando `Object`; depois `infer-type.ts`; rodar `npm test` + `npm run typecheck`; commit `T1.2: ...`.

## Estado
- Concluídas: **T0.1**, **T0.2** e **T1.1** (helpers do registro reflexivo: `defineOwnMetadata`/`getOwnMetadata`/`getMergedMetadata` em `apps/api/src/framework/reflection/class-metadata.ts` + 14 testes; semântica registrada em Decisões no PLANO).
- Em andamento: nenhuma.
- Bloqueadas: nenhuma.

## Verificação (última execução — 2026-10-18, fim da T1.1)
| Comando | Resultado | Observação |
|---|---|---|
| `git status` (pré-T1.1) | limpo, `feat/reflexao` @ `ef2623b` | antes de qualquer edição |
| `npm test` (baseline T1.1) | 26/26 passaram (5 suites) | pré-implementação |
| `npx jest framework/reflection` (spec primeiro) | falhou (TS2307: módulo inexistente) | vermelho intencional do TDD (spec antes do helper) |
| `npx jest framework/reflection` (pós-impl) | 14/14 passaram | novo spec `class-metadata.spec.ts` |
| `npm test` (final) | 40/40 passaram (6 suites) | 26 antigos + 14 novos, sem regressão |
| `npm run typecheck` | sem erros | tsc strict (src + test) |
| `npm run typecheck:web` | sem erros | tsc strict do frontend |

**Não verificado nesta tarefa:** `test:e2e`, `build` e `build:web` não foram rerodados — a T1.1 não toca rotas, DTO, banco nem front (só módulo novo + spec). A regra 3e os exigiria; o tipo de mudança não. Rodá-los de novo na T1.2 se ela tocar `emitDecoratorMetadata` sem criar rota (também não deve exigir).

## Mapa do que foi criado
- `apps/api/src/framework/reflection/class-metadata.ts` → T1.1: grava metadado *own* no **construtor** sob chave `ceviu:<key>` (`Reflect.defineMetadata`), normalizando alvo (construtor/protótipo/instância); leitura mesclada raiz→alvo (registros por spread, arrays concat, demais tipos descendente vence; contêiner clonado). Doc-comment no topo diz o que grava e onde é lido (regra 13). Consumido por F2/F3/F5.
- `apps/api/src/framework/reflection/class-metadata.spec.ts` → T1.1: 14 testes (roundtrip, isolamento entre classes/irmãs, own sem merge, herança multinível, override de chave, arrays, primitivos, filha não altera base, normalização de alvo, chave inexistente, merge customizado, clone da leitura).
- `docs/reflexao/INVENTARIO.md` → T0.2: métodos de `Repository`/`DataSource` realmente usados (com `arquivo:linha`), decorators das entidades, mocks/specs/e2e, grafo service↔entidade, "não usados" e implicações para o mini-ORM (insumo da T5.8).
- `docs/auditoria-reflexao.md` → T0.1: reflexão atual (zero `Reflect.*` manual), famílias de decorators, duplicação mapeada às fases, riscos.
- `docs/reflexao/PLANO.md` → seções 2 e 5 literais do prompt + "Decisões" (append-only) + "Fase 0 verificada". Fonte da verdade.
- `docs/reflexao/HANDOFF.md` → este arquivo (reescrito inteiro a cada tarefa).

## Armadilhas descobertas
- `docs/` cai na regra `DOCS` do `.gitignore:11` (case-insensitive no Windows); documento **novo** em `docs/` exige `git add -f` na primeira vez; depois de rastreado, edições aparecem normalmente.
- Ao editar "Decisões" do PLANO: o arquivo é **append-only**; anexar no fim (a T1.1 quase corrompeu a seção ao tentar substituir cabeçalho existente — conferir após editar).
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
