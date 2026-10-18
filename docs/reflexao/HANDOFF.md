# HANDOFF (atualizado em 2026-10-18 13:07)

## Retomada em 30 segundos
- Branch: `feat/reflexao` | Último commit: `T2.1: decorators de validacao gravando no registro` (hash exato: `git log -1 --format=%h`)
- Árvore limpa? sim (após o commit da T2.1)
- **Próxima ação exata:** **T2.2** (aguarda pedido do usuário — regra 1) — motor `validate(Class, plain)` com erros estruturados: conversão plain→instância via `inferType` (ex.: "5" → 5 em query string) e whitelist (propriedade sem decorator é rejeitada, replicando `whitelist/forbidNonWhitelisted` do pipe legado em `setup-app.ts:9-13`). Consumir `getValidationRules` de `validation-registry.ts`. Marcar `[~]`/Em andamento; spec primeiro em `apps/api/src/framework/validation/validate.spec.ts`; depois `validate.ts`; `npm test` + `npm run typecheck`; commit `T2.2: ...`.

## Estado
- Concluídas: **T0.1**, **T0.2**, **T1.1**, **T1.2** (Fase 1 verificada) e **T2.1** (8 decorators de validação; 8 testes).
- Em andamento: nenhuma.
- Bloqueadas: nenhuma.

## Verificação (última execução — 2026-10-18, fim da T2.1)
| Comando | Resultado | Observação |
|---|---|---|
| `git status` (pré-T2.1) | limpo, `feat/reflexao` @ `9bb8339` | antes de qualquer edição |
| `npm test` (baseline T2.1) | 56/56 passaram (7 suites) | pré-implementação |
| `npx jest framework/validation` (spec primeiro) | falhou (TS2307 módulos ausentes + TS2612/TS4114 no spec) | vermelho intencional do TDD; corrigido o spec antes de implementar |
| `npx jest framework/validation` (pós-impl) | 8/8 passaram | `decorators.spec.ts` |
| `npm test` (final) | 64/64 passaram (8 suites) | 56 antigos + 8 novos, sem regressão |
| `npm run typecheck` | sem erros | tsc strict (src + test) |
| `npm run typecheck:web` | sem erros | tsc strict do frontend |

**Não verificado:** e2e/build/build:web não rerodados — T2.1 só cria módulo novo (circuito de validação ainda não está ligado a DTO/rota; migração é T2.5+). Regra 3e não os exige aqui.

## Mapa do que foi criado
- `apps/api/src/framework/validation/validation-registry.ts` → T2.1: registro por classe sob `ceviu:validation:rules` (`Record<propriedade, ValidationRule[]>`); `declareRule` (grava *own*, copy-on-write), `getOwnValidationRules` e `getValidationRules` (mesclada; entrada da filha substitui a da base). Consumido por T2.2 (motor) e T3.2 (`describeForm`).
- `apps/api/src/framework/validation/decorators.ts` → T2.1: `@IsString @IsNotEmpty @IsOptional @IsInt @Min @MaxLength @Matches`, que só gravam no registro; assinaturas espelham class-validator (migração T2.5+ troca só o import). (+ `decorators.spec.ts` — 8 testes, inclui ordem bottom-up e herança.)
- `apps/api/src/framework/reflection/class-metadata.ts` → T1.1: grava metadado *own* no construtor sob `ceviu:<key>`; leitura mesclada raiz→alvo (registros spread, arrays concat, clone). Consumido por F2/F3/F5. (+ `class-metadata.spec.ts` — 14 testes.)
- `apps/api/src/framework/reflection/infer-type.ts` → T1.2: `design:type` → String/Number/Boolean/Date; qualquer outro metadado devolve o `override`. (+ `infer-type.spec.ts` — 16 testes; + fixture em `src/testing/`.)
- `docs/reflexao/INVENTARIO.md` → T0.2: inventário do TypeORM usado (insumo da T5.8). `docs/auditoria-reflexao.md` → T0.1: auditoria de reflexão.
- `docs/reflexao/PLANO.md` → fonte da verdade (seções 2 e 5 + Decisões append-only + "Fase 0/1 verificadas"). `docs/reflexao/HANDOFF.md` → este arquivo.

## Armadilhas descobertas
- **Ordem dos property decorators legados é bottom-up** (caracterizado na T2.1): `@IsString() @IsNotEmpty()` grava `[isNotEmpty, isString]`. O motor (T2.2) não pode depender de ordem para lógica de skip/optional.
- **`noImplicitOverride` ligado:** propriedade redeclarada em subclasse exige `override` (TS4114); se não for sobrescrever de verdade, TS2612 pede inicializador.
- DTOs legados (5) **não usam mensagens customizadas** em nenhum decorator — as mensagens default do motor podem ser definidas livremente na T2.2 (paridade HTTP fica na T2.4).
- Pipe global legado: `setup-app.ts:9-13` → `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`; filtro global de exceções em `common/filters/http-exception.filter.ts`.
- **`emitDecoratorMetadata` (caracterizado na T1.2):** uniões e `| null`/`| undefined` explícitos → `Object`; opcional `?: number` preserva o tipo; `string[]` → `Array`; classe via `import type` → `Function`; sem decorator → metadado ausente. Use `inferType(..., override)` quando o tipo importa.
- `docs/` exige `git add -f` para documento NOVO; "Decisões" do PLANO é append-only (anexar no fim); `git add` misto pode sair non-zero mas deixar tudo staged — conferir `git status`.
- `JwtStrategy` não consulta repositório (`jwt.strategy.ts:17-19`); `created_at` sem DEFAULT no DDL (preenchido pelo driver); sem `busy_timeout` (risco fica para a T5.3).
- Mini-ORM pode ignorar, até prova em contrário: relations loading, cascatas, listeners, `*By`, agregados (INVENTARIO §10).
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
