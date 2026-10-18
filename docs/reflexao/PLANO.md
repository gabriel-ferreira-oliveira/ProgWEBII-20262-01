# PLANO — Reflexão e decorators no CeViu (fonte da verdade)

> Fonte: `docs/Planejamento.md`. Este arquivo grava **literalmente** as seções 2 e 5 do prompt, conforme
> pedido na seção 3 do mesmo. A seção "Decisões" no fim é append-only.

## 2. Regras de operação (inegociáveis)
1. **Uma mini-tarefa por vez.** Faça, teste, documente, **pare** e reporte (tarefa concluída, resultado dos testes, próxima tarefa sugerida). Só siga para a próxima se o usuário pedir.
2. **Ler antes de agir.** Em toda execução, leia `docs/reflexao/HANDOFF.md` e depois a tarefa em `docs/reflexao/PLANO.md`. Não confie em memória de conversa.
3. **Ritual de cada tarefa:**
   a. `git status`. Se não estiver limpo, aplique a regra 6.
   b. Marque `[~]` no PLANO e preencha "Em andamento" no HANDOFF (intenção e arquivos que pretende tocar) **antes** de escrever código.
   c. Rode os testes da área que vai tocar (baseline).
   d. Implemente o mínimo da tarefa. Para infraestrutura nova, escreva o teste primeiro quando possível.
   e. Verifique: testes unitários dos arquivos tocados, mais `typecheck` (api e/ou web), mais e2e se tocou em rota, DTO ou banco.
   f. **Verde:** commit `T<id>: resumo`, marque `[x]`, reescreva o HANDOFF. **Vermelho:** corrija dentro da tarefa; se não resolver em ~3 tentativas, marque `[!]`, registre no HANDOFF (erro, o que tentou, hipótese) e pare.
4. **Mudou, testou.** Nenhum código novo sem teste. Nunca enfraqueça, pule (`skip`/`xit`) ou apague teste existente para ficar verde. Se um teste antigo estiver errado, registre a justificativa em Decisões. Infra reflexiva (registro, validadores, ORM) exige testes de borda: herança, `string | null` virando `Object` em `design:type`, tentativa de injeção de SQL.
5. **Honestidade.** Só marque `[x]` com testes realmente executados. Registre no HANDOFF os comandos rodados e o resultado resumido. Registre também o que **não** foi verificado.
6. **Árvore limpa ao fim de cada tarefa** (tudo commitado). Ao retomar com mudanças não commitadas, leia "Em andamento" no HANDOFF e o `git diff`, decida entre terminar ou descartar (`git restore`/`git stash`) e registre a decisão. Nunca use `reset --hard`, `push --force` ou apague branches.
7. **Branch `feat/reflexao`**, um commit por tarefa, sem push a menos que o usuário peça.
8. **Escopo.** Só o que a tarefa pede, sem refatorar de passagem. Não altere `JAVA/` nem `docs/fase*.md`. Dependência nova só se imprescindível e registrada em Decisões. Remover class-validator, class-transformer e TypeORM só nas tarefas de remoção.
9. **Decisões.** Se algo for ambíguo, escolha o default indicado e registre em "Decisões" no PLANO (data, opção, motivo). Pergunte ao usuário apenas nos itens **DECISÃO DO USUÁRIO**; enquanto aguarda, siga com tarefas que não dependam da resposta.
10. **Convivência na transição.** Sistema antigo e novo coexistem. Ao fim de toda tarefa a aplicação compila e os testes estão verdes.
11. **Segurança SQL.** Valores sempre com `?`. Nomes de tabela e coluna vêm só dos metadados e passam por whitelist.
12. **Compatibilidade.** Preserve o contrato HTTP (rotas, status, formato de erro, mensagens do legado, inclusive typos de paridade como "prenchido"), salvo decisão registrada.
13. **Documente a reflexão.** Todo decorator ou helper leva um comentário curto dizendo **o que grava e onde é lido**. Isso alimenta o relatório final.
14. Ao concluir a última tarefa de uma fase, rode a suíte completa e registre "Fase N verificada" no PLANO.

## 5. Plano (checklist)
Legenda: `[ ]` pendente · `[~]` em andamento · `[x]` concluída · `[!]` bloqueada

### Fase 0: Preparação
- [x] T0.1 Criar a branch. Confirmar os scripts reais no `package.json` (a auditoria cita `test`, `test:e2e`, `typecheck`, `typecheck:web`). Rodar a baseline completa e anotar falhas pré-existentes. Conferir 5 referências da auditoria por amostragem. Criar PLANO.md e HANDOFF.md. Pronto quando estiverem commitados com a baseline documentada.
- [x] T0.2 Inventário do TypeORM (somente leitura): métodos de `Repository`/`DataSource` realmente usados e onde (entities, migrations, data-source, legacy-migration, factories, specs e mocks), mais o grafo de dependência entre services e entidades. Saída em `docs/reflexao/INVENTARIO.md`.

> **Fase 0 verificada** em 2026-10-18: suíte completa verde ao fim da T0.2 (26 unit · 22 e2e · typecheck · typecheck:web · build · build:web).

### Fase 1: Núcleo de reflexão
- [x] T1.1 Helpers de metadado por classe: gravar *own*, ler com merge pela cadeia de protótipos (herança), isolamento entre classes. Testes.
- [x] T1.2 `inferType(target, key, override?)` sobre `design:type` (String, Number, Boolean, Date), com fallback para override quando vier `Object`. Testes de caracterização das limitações do `emitDecoratorMetadata` (uniões, `null`, `import type`).

> **Fase 1 verificada** em 2026-10-18: suíte completa verde ao fim da T1.2 (56 unit · 22 e2e · typecheck · typecheck:web · build · build:web).

### Fase 2: Validação própria
- [ ] T2.1 Decorators `@IsString @IsNotEmpty @IsOptional @IsInt @Min @MaxLength @Matches`, que só gravam regras no registro. Testes.
- [ ] T2.2 Motor `validate(Class, plain)` com erros estruturados. Conversão plain→instância via `inferType` (ex.: "5" → 5 em query string) e whitelist (propriedade sem decorator é rejeitada, replicando `whitelist/forbidNonWhitelisted`). Testes.
- [ ] T2.3 `@ExactlyOneOf([...], message)` como regra de classe executada pelo motor e legível como metadado. Testes.
- [ ] T2.4 Pipe global composto (`PipeTransform`): se a classe tem regras no registro próprio, usa o motor próprio; senão delega ao `ValidationPipe` antigo. Mesmo formato de erro HTTP. Testes unitários e e2e (nada muda ainda).
- [ ] T2.5 Migrar `LoginDto` e `RegisterDto` (trocar imports, manter `@ApiProperty`). E2e de auth verdes.
- [ ] T2.6 Migrar `UpdateMovieDto` e `UpdateSeriesDto`. Resolver a divergência `@ApiPropertyOptional` × falta de `@IsOptional` (decisão registrada).
- [ ] T2.7 Migrar `SearchQueryDto` com `@ExactlyOneOf` e remover a checagem manual do `search.service`. E2e de busca verdes.
- [ ] T2.8 Remover class-validator/class-transformer (um `grep` deve provar zero usos) e simplificar o pipe global. Suíte completa.

### Fase 3: Contrato de formulário (back ↔ front)
- [ ] T3.1 `@Field({label, control, order, ...})` **só de UI**. `required`, `min` e `pattern` vêm das regras de validação, nunca do `@Field`. Testes.
- [ ] T3.2 `describeForm(Class)` une `@Field`, regras de validação e regras de classe em `FormMetadata` (`required` = não é `@IsOptional`; `min`, `maxLength`, `pattern`, `rules`). Teste-chave: para cada DTO registrado, todo campo `required` realmente falha no motor quando ausente. O metadado não pode mentir.
- [ ] T3.3 Tipos `FormMetadata`, `FieldMetadata` e `FormRule` em `packages/shared`. Typecheck dos dois apps.
- [ ] T3.4 `MetadataController` **público** (`GET /api/metadata/:form`) com registry explícito (register, login, movie-synopsis, series-synopsis, search-catalog) e 404 para desconhecido. E2e.
- [ ] T3.5 **DECISÃO DO USUÁRIO, idade no cadastro:** a tela exige, a API aceita opcional. Pergunte. Default recomendado: alinhar o DTO ao que a tela faz (obrigatória), se e2e e paridade permitirem. Registrar. Não bloqueia T3.6 e T3.7.
- [ ] T3.6 Front: serviço de metadados com estados loading/erro/ok (signals ou `rxResource`). Testes (Vitest).
- [ ] T3.7 Front: `buildForm(fb, fields)` (required, pattern, min, maxLength). Testes.
- [ ] T3.8 Front: `RegisterComponent` monta formulário e template (`@for`) dos metadados, com estados de loading e erro (com retry) e sem campo hardcoded. Testes e roteiro de verificação manual no HANDOFF.
- [ ] T3.9 Front: busca da home usa `search-catalog` e a regra `exactlyOneOf`. Remover regex e mensagem duplicadas.
- [ ] T3.10 (opcional) Login e dialogs de sinopse via metadados.

### Fase 4: Abstração no backend
- [ ] T4.1 `@Authenticated(tag)` com `applyDecorators` (ApiTags + ApiBearerAuth + UseGuards). Testes. Aplicar em Movies.
- [ ] T4.2 Aplicar nos demais controllers (e2e de 401).
- [ ] T4.3 `MediaRuntime` e `MediaService<T>` (composição, config tipada) só com `list` e `findOne`. Migrar esses dois métodos do `MoviesService`. Testes.
- [ ] T4.4 `updateSynopsis` e `remove` no `MediaService`.
- [ ] T4.5 `watch` e `favorite` (fluxo único; `countTimeOnFavorite` como dado). Testes cobrindo as duas semânticas.
- [ ] T4.6 Migrar `SeriesService` para o `MediaService` (flag `false`). Specs verdes.
- [ ] T4.7 Helper `createRepositoryMock<T>()` para os specs; remover mocks duplicados.
- [ ] T4.8 Avaliar controllers genéricos e registrar a decisão (default: manter finos, delegando).

### Fase 5: Mini-ORM
- [ ] T5.1 `@Entity(tabela)`, `@Column({type?, name?, nullable?, unique?})`, `@PrimaryKey({autoIncrement?})` gravando `EntityMeta` (snake_case por padrão, tipo via `inferType`). Testes.
- [ ] T5.2 Hidratação e desidratação linha↔instância (snake↔camel, boolean 0/1, Date, null). Testes.
- [ ] T5.3 `Database` (wrapper do `better-sqlite3` com `run/all/get/transaction`, `:memory:` nos testes) e provider Nest. Coexiste com o TypeORM no mesmo arquivo SQLite (WAL e `busy_timeout`; registrar o risco).
- [ ] T5.4 `BaseRepository<T>` com `findById`, `findAll({where, order})`, `count`, `insert`, `update`, `delete`, `increment`. SQL gerado dos metadados, com whitelist de colunas. Testes em `:memory:`.
- [ ] T5.5 `createTableSql(Class)` dos metadados. Teste de conformidade comparando com o schema real das migrations via `PRAGMA table_info`.
- [ ] T5.6 Query builder tipado: `repo.query().where(col, op, valor).orderBy().limit()` com `keyof T` e operadores em whitelist (`=, <>, <, >, <=, >=, LIKE, IN, IS NULL`). Testes, incluindo tentativa de injeção.
- [ ] T5.7 Relações `@ManyToOne(() => X)` e `@OneToMany(() => X, x => x.campo)` com JOIN/`include`. Testes.
- [ ] T5.8 Planejar a migração: com base no INVENTARIO, ordenar as entidades (folhas primeiro) e **expandir no PLANO** as sub-tarefas T5.9.x (uma por entidade, mais os serviços que a usam).
- [ ] T5.9.x (geradas pela T5.8) Dupla decoração da entidade durante a transição. Trocar `Repository<X>` por `BaseRepository<X>`. Atualizar specs. E2e verdes.
- [ ] T5.10 `watch` e `favorite` dentro de `db.transaction()`, com teste que força falha no meio e prova o rollback.
- [ ] T5.11 Runner mínimo para as migrations SQL existentes. `legacy-migration` e `run-import` usando o mini-ORM.
- [ ] T5.12 Remover o TypeORM (deps, `data-source*`, decorators duplicados). Um `grep` deve provar zero usos. Suíte completa.

### Fase 6: Extras (opcionais, independentes entre si)
- [ ] T6.1 Factories de teste geradas das colunas.
- [ ] T6.2 Schemas do Swagger gerados dos metadados (`@ApiProperty` automático).
- [ ] T6.3 `@Public()` e `@Roles()` com `SetMetadata` + `Reflector` no guard.
- [ ] T6.4 `@CrudResource(Entidade)` gerando as rotas do CRUD (avançado; atenção à ordem dos decorators e ao Swagger).
- [ ] T6.5 Front: `ResourceApi<T>`, dialog de detalhes genérico e helper único de `dialog.open`.

### Fase 7: Fechamento
- [ ] T7.1 `docs/reflexao/RELATORIO.md`: cada uso de reflexão (arquivo:linha, o que grava, onde lê), decisões, limitações, o que ficou de fora e por quê.

## Decisões

### 2026-10-18 — T0.1: auditoria gerada nesta tarefa
- **Contexto:** a auditoria prévia citada no prompt (`docs/auditoria-reflexao.md`) não existia no repositório; a T0.1 manda pedir ao usuário em vez de inventar.
- **Opção escolhida:** o usuário autorizou gerar a auditoria na própria T0.1. Foi produzida por varredura do código na branch `feat/reflexao` (base `f0583cc`), com amostra de referências conferida por leitura direta (registrada em `docs/auditoria-reflexao.md` §6).
- **Motivo:** atender a T0.1 ("conferir 5 referências da auditoria por amostragem") e dar insumo verificável às fases seguintes, sem inventar conteúdo.

### 2026-10-18 — T0.1: `docs/` está ignorado pelo `.gitignore` (regra `DOCS`)
- **Contexto:** `git add docs/...` foi recusado; `git check-ignore -v` aponta `.gitignore:11` (`DOCS` maiúsculo, que casa com `docs/` por case-insensitivity no Windows). `git ls-files docs` confirma que nenhum documento está versionado, e o próprio `.gitignore` é ignorado (linha 42).
- **Opção escolhida:** não alterar o `.gitignore`; commitar com `git add -f` apenas os arquivos exigidos pela T0.1 (`docs/auditoria-reflexao.md`, `docs/reflexao/PLANO.md`, `docs/reflexao/HANDOFF.md`). Depois de rastreados, edições futuras neles aparecem normalmente no `git status`; cada documento NOVO em `docs/reflexao/` exigirá `git add -f` na primeira vez.
- **Motivo:** menor mudança que cumpre o critério "estiverem commitados" da T0.1 sem mexer no setup de ignores do usuário.

### 2026-10-18 — T1.1: semântica do registro de metadados por classe
- **Contexto:** helpers novos; o prompt não fixa onde ancorar o metadado nem como mesclar herança, e as fases 2/3/5 dependem disso.
- **Opção escolhida:** gravação sempre *own* no **construtor** via `Reflect.defineMetadata`, normalizando o alvo (construtor, protótipo ou instância) para o construtor; leitura mesclada percorre a cadeia de construtores raiz→alvo (`Object.getPrototypeOf`, parando em `Function.prototype`); merge padrão: registros planos por spread (descendente vence chave a chave), arrays por concatenação ancestral→descendente, demais tipos o descendente substitui; valor own `undefined` é ignorado na leitura; `getMergedMetadata` devolve contêiner clonado (não vaza a referência gravada); chaves internas prefixadas com `ceviu:`.
- **Motivo:** ancorar no construtor dá isolamento entre classes (irmãs, protótipo compartilhado intocado); o merge raiz→alvo serve tanto a decorators acumulativos (relações da F5) quanto à sobrescrita de regra (F2/F3); prefixo evita colisão com os metadados de TypeORM/Nest/Swagger; clone evita mutação acidental do registro por consumidores.

### 2026-10-18 — T1.2: contrato do `inferType` (override é fallback, não precedência)
- **Contexto:** `design:type` tem limitações caracterizadas empiricamente (no toolchain do repo, TS 5.7 + tsconfig base): uniões e `| null`/`| undefined` explícitos → `Object`; `string[]` → `Array`; classe via `import type` → `Function`; propriedade sem decorator → metadado ausente. Era preciso fixar o que o `inferType` faz nesses casos.
- **Opção escolhida:** só String/Number/Boolean/Date são "inferidos"; qualquer outro resultado do metadado (Object, Array, Function, classe, ausente) devolve o `override`; quando o metadado é um dos quatro, o `override` é ignorado (o override é fallback de quem conhece o tipo real, não precedência); alvo normalizado para o protótipo (construtor/protótipo/instância aceitos); sem override e sem tipo suportado → `undefined`.
- **Motivo:** consumidores (F2/F5) só precisam dos quatro primitivos para conversão/tipagem de coluna; tratar `Function` (import type) como tipo seria bug silencioso — o fallback explícito é obrigatório; os testes de caracterização bruta guardam o comportamento do emissor (falham primeiro se o TS mudar).
