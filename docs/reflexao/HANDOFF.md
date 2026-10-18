# HANDOFF (atualizado em 2026-10-18 13:42)

## Retomada em 30 segundos
- Branch: `feat/reflexao` | Último commit: `T2.2: motor de validacao proprio (Fase 2)` (hash exato: `git log -1 --format=%h`)
- Árvore limpa? sim (após o commit da T2.2)
- **Próxima ação exata:** **T2.3** (aguarda pedido do usuário — regra 1) — `@ExactlyOneOf([...], message)` como **regra de classe** (não por propriedade): armazenamento próprio no registro, execução pelo motor `validate` e legível como metadado. Paridade: o e2e espera a mensagem "Campos de pesquisa vazio" (linha 132) que hoje o `search.service` lança manualmente; a T2.7 remove a checagem manual. Marcar `[~]`/Em andamento; spec primeiro em `apps/api/src/framework/validation/`; `npm test` + `npm run typecheck`; commit `T2.3: ...`.

## Estado
- Concluídas: **T0.1**, **T0.2**, **T1.1**, **T1.2** (Fase 1 verificada), **T2.1** (decorators) e **T2.2** (motor `validate`; 15 testes).
- Em andamento: nenhuma.
- Bloqueadas: nenhuma.

## Verificação (última execução — 2026-10-18, fim da T2.2)
| Comando | Resultado | Observação |
|---|---|---|
| `git status` (pré-T2.2) | limpo, `feat/reflexao` @ `a5eff8b` | antes de qualquer edição |
| `npm test` (baseline T2.2) | 64/64 passaram (8 suites) | pré-implementação |
| `npx jest validate` (spec primeiro) | falhou (TS2307: módulo ausente) | vermelho intencional do TDD |
| `npx jest validate` (1ª rodada pós-impl) | 14/15 — falha de expectativa no spec | `'abc'` viola `min` **e** `isInt` (class-validator reporta todos); expectativa corrigida |
| `npx jest validate` (final) | 15/15 passaram | `validate.spec.ts` |
| `npm test` (final) | 79/79 passaram (9 suites) | 64 antigos + 15 novos, sem regressão |
| `npm run typecheck` | sem erros | tsc strict (src + test) |
| `npm run typecheck:web` | sem erros | tsc strict do frontend |

**Não verificado:** e2e/build/build:web não rerodados — o motor ainda não está ligado a nenhuma rota (pipe composto é T2.4; migração de DTOs é T2.5+).

## Mapa do que foi criado
- `apps/api/src/framework/validation/validate.ts` → T2.2: motor `validate(Class, plain)` → `{ value, errors }`; `ValidationIssue = {property, kind, message}`; conversão só Number (string numérica com trim); whitelist `property X should not exist`; mensagens padrão class-validator. Consumido pela T2.4 (pipe) e specs. (+ `validate.spec.ts` — 15 testes.)
- `apps/api/src/framework/validation/validation-registry.ts` → T2.1: registro `ceviu:validation:rules` + `declareRule`/`getOwnValidationRules`/`getValidationRules`.
- `apps/api/src/framework/validation/decorators.ts` → T2.1: 7 decorators que só gravam regras (+ `decorators.spec.ts` — 8 testes).
- `apps/api/src/framework/reflection/class-metadata.ts` → T1.1 (14 testes); `infer-type.ts` → T1.2 (16 testes; fixture em `src/testing/`).
- `docs/reflexao/INVENTARIO.md` (T0.2), `docs/auditoria-reflexao.md` (T0.1), `PLANO.md` (fonte da verdade), `HANDOFF.md` (este arquivo).

## Armadilhas descobertas
- **Sem cascata na validação (caracterizado na T2.2):** todas as regras de uma propriedade são avaliadas; `'abc'` viola `min` **e** `isInt` (mesmo comportamento do class-validator). Specs devem esperar a lista completa de erros.
- **`min`/`maxLength`/`matches` falham também para tipo errado** (`typeof` check): `min` em string falha, igual class-validator.
- **Conversão Number:** `Number('')` → 0 e `Number('1e3')` → 1000 são armadilhas; o motor usa regex `^-?\d+(\.\d+)?$` sobre o valor com `trim` (paridade com `@Type(() => Number)`).
- Ordem dos property decorators legados é **bottom-up**: `@IsString() @IsNotEmpty()` grava `[isNotEmpty, isString]` (ordem visível nos erros).
- `noImplicitOverride`: propriedade redeclarada em subclasse exige `override` (TS4114) ou inicializador (TS2612).
- **`emitDecoratorMetadata` (T1.2):** uniões e `| null` explícitos → `Object`; `?: number` preserva `Number`; `string[]` → `Array`; `import type` → `Function`; sem decorator → ausente. Use `inferType(..., override)`.
- DTOs legados não usam mensagens customizadas; pipe legado em `setup-app.ts:9-13` (`whitelist`/`forbidNonWhitelisted`/`transform`); filtro global em `common/filters/http-exception.filter.ts`.
- `docs/` exige `git add -f` para documento NOVO; "Decisões" do PLANO é append-only; `git add` misto pode sair non-zero mas deixar staged — conferir `git status`.
- `JwtStrategy` não consulta repositório (`jwt.strategy.ts:17-19`); `created_at` sem DEFAULT no DDL; sem `busy_timeout` (risco fica para a T5.3).
- Lacunas de e2e seguem: `GET/PATCH/DELETE /series/:id`, `GET /users/:id/watched-series` (sucesso) e busca por título retornando série.
- Repo sem lint; regex `/^\d+$/` duplicada em `register.component.ts:30`, `home.component.ts:91`, `search-results.component.ts:50` (T3.9 remove).

## Perguntas abertas ao usuário
- Nenhuma no momento. (A T3.5 fará a pergunta sobre idade no cadastro quando chegar.)

## Comandos úteis (confirmados no repo)
```bash
# suíte completa (raiz do monorepo)
npm test; npm run test:e2e; npm run typecheck; npm run typecheck:web; npm run build; npm run build:web

# rodar só uma pasta de testes (cwd apps/api — usa o jest do package.json do workspace)
npx jest framework/validation

# rodar a aplicação
npm run dev          # API em http://localhost:3000/api (Swagger em /api/docs)
npm run dev:web      # frontend em http://localhost:4200

# banco/importação
npm run migration:run; npm run migrate:legacy
```
- Login de teste: `gsb@gmail.com` / `12345`.
