/**
 * Mini-ORM — metadados de entidade (T5.1).
 *
 * - Grava (`declareEntity`): nome da tabela em `ceviu:orm:entity` (`{ table }`).
 * - Grava (`declareColumn`/`declarePrimaryKey`): colunas em `ceviu:orm:columns`
 *   (mapa propriedade → opções **resolvidas**, cópia defensiva a cada escrita).
 * - Lê (`getEntityMeta`): tabela + colunas mescladas pela cadeia de herança (T1.1),
 *   normalizadas em `EntityMeta` — nome snake_case por padrão, tipo pelo `type` explícito
 *   ou por `inferType` (F1); sem tipo inferível, a **decoração falha** (o metadado não mente).
 * - Lido por: `BaseRepository` (T5.4) e `createTableSql` (T5.5).
 */
import 'reflect-metadata';
import {
  defineOwnMetadata,
  getMergedMetadata,
  getOwnMetadata,
} from '../reflection/class-metadata';
import type { MetadataTarget } from '../reflection/class-metadata';
import { inferType } from '../reflection/infer-type';
import type { InferredType } from '../reflection/infer-type';
import type { EntityClass } from './hydrate';

/** **Opções do decorator** `@Column`. */
export interface ColumnOptions {
  /** Tipo da coluna; sem ele vale o `design:type` (quando um dos quatro tipos inferíveis). */
  type?: InferredType;
  /** Nome da coluna; por padrão o snake_case da propriedade. */
  name?: string;
  /** Aceita NULL; padrão `false`. */
  nullable?: boolean;
  /** Constraint UNIQUE; padrão `false`. */
  unique?: boolean;
  /** Valor default do DDL (`DEFAULT <valor>`), para colunas NOT NULL com default no schema real. */
  default?: string | number;
}

/** **Opções do decorator** `@PrimaryKey` — chave primária nunca é nula nem única por si. */
export interface PrimaryKeyOptions {
  /** Tipo da coluna; sem ele vale o `design:type`. */
  type?: InferredType;
  /** Nome da coluna; por padrão o snake_case da propriedade. */
  name?: string;
  /** SQLite `AUTOINCREMENT`; padrão `true`. */
  autoIncrement?: boolean;
}

/** Metadado resolvido de uma coluna (lido de `getEntityMeta`). */
export interface EntityColumnMeta {
  /** Propriedade da classe (camelCase). */
  property: string;
  /** Coluna no banco (snake_case por padrão). */
  name: string;
  type: InferredType;
  nullable: boolean;
  unique: boolean;
  primaryKey: boolean;
  autoIncrement: boolean;
  /** Valor default do DDL; ausente quando não há `DEFAULT`. */
  default?: string | number;
}

/** Metadado de uma entidade (lido de `getEntityMeta`). */
export interface EntityMeta {
  table: string;
  /** Colunas na ordem de declaração (base primeiro, depois as próprias). */
  columns: EntityColumnMeta[];
  /** Relações na ordem de declaração; vazio quando a entidade não tem nenhuma. */
  relations: EntityRelationMeta[];
}

const TABLE_KEY = 'orm:entity';
const COLUMNS_KEY = 'orm:columns';
const RELATIONS_KEY = 'orm:relations';

/** Mapa propriedade → coluna resolvida (sem `property`, que é a própria chave). */
type ColumnsByProperty = Record<PropertyKey, Omit<EntityColumnMeta, 'property'>>;

/** Relação gravada sem `property` (que é a própria chave do mapa). */
type StoredRelation =
  | { kind: 'many-to-one'; column: string; target: RelationTarget }
  | { kind: 'one-to-many'; inverse: string; target: RelationTarget };
type RelationsByProperty = Record<PropertyKey, StoredRelation>;

/** Nome de banco a partir da propriedade (`durationMin` → `duration_min`). */
function toSnakeCase(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

/** Tipo explícito vence; senão o `design:type`; sem nenhum, falha na decoração. */
function resolveType(
  target: MetadataTarget,
  property: PropertyKey,
  explicit?: InferredType,
): InferredType {
  const type = explicit ?? inferType(target, String(property));
  if (!type) {
    throw new Error(
      `A coluna "${String(property)}" precisa de type explícito: ` +
        'o design:type não é inferível (união com null, Array ou import type).',
    );
  }
  return type;
}

/** Alvo lazy de uma relação — o mesmo espírito do `() => X` do TypeORM. */
export type RelationTarget = () => EntityClass;

/** **Opções do decorator** `@ManyToOne`. */
export interface ManyToOneOptions {
  /** Coluna da chave estrangeira; por padrão o snake_case da propriedade + `_id`. */
  column?: string;
}

/** Metadado resolvido de uma relação: `@ManyToOne` (dono da FK) ou `@OneToMany` (inverso). */
export type EntityRelationMeta =
  | { kind: 'many-to-one'; property: string; column: string; target: RelationTarget }
  | { kind: 'one-to-many'; property: string; inverse: string; target: RelationTarget };

/** Cópia do registro own (top-level) para escrita copy-on-write. */
function ownSnapshot(target: MetadataTarget): ColumnsByProperty {
  return { ...(getOwnMetadata<ColumnsByProperty>(target, COLUMNS_KEY) ?? {}) };
}

/** Grava a coluna resolvida no registro *own* do construtor (cópia defensiva). */
function writeColumn(
  target: MetadataTarget,
  property: PropertyKey,
  column: Omit<EntityColumnMeta, 'property'>,
): void {
  const columns = ownSnapshot(target);
  columns[property] = column;
  defineOwnMetadata(target, COLUMNS_KEY, columns);
}

/** Grava a relação resolvida no registro *own* do construtor (cópia defensiva). */
function writeRelation(
  target: MetadataTarget,
  property: PropertyKey,
  relation: StoredRelation,
): void {
  const relations = { ...(getOwnMetadata<RelationsByProperty>(target, RELATIONS_KEY) ?? {}) };
  relations[property] = relation;
  defineOwnMetadata(target, RELATIONS_KEY, relations);
}

/** Resolve e grava o lado dono da FK. Gravado por `@ManyToOne`. */
export function declareManyToOne(
  target: MetadataTarget,
  property: PropertyKey,
  relationTarget: RelationTarget,
  options: ManyToOneOptions = {},
): void {
  writeRelation(target, property, {
    kind: 'many-to-one',
    column: options.column ?? `${toSnakeCase(String(property))}_id`,
    target: relationTarget,
  });
}

/** Resolve e grava o lado inverso (sem coluna própria). Gravado por `@OneToMany`. */
export function declareOneToMany(
  target: MetadataTarget,
  property: PropertyKey,
  relationTarget: RelationTarget,
  inverse: string,
): void {
  writeRelation(target, property, { kind: 'one-to-many', inverse, target: relationTarget });
}

/** Grava o nome da tabela no registro *own* do construtor. Gravado por `@Entity`. */
export function declareEntity(target: MetadataTarget, table: string): void {
  defineOwnMetadata<{ table: string }>(target, TABLE_KEY, { table });
}

/** Resolve e grava a coluna. Gravado por `@Column`. */
export function declareColumn(
  target: MetadataTarget,
  property: PropertyKey,
  options: ColumnOptions = {},
): void {
  const column: Omit<EntityColumnMeta, 'property'> = {
    name: options.name ?? toSnakeCase(String(property)),
    type: resolveType(target, property, options.type),
    nullable: options.nullable ?? false,
    unique: options.unique ?? false,
    primaryKey: false,
    autoIncrement: false,
  };
  if (options.default !== undefined) {
    column.default = options.default;
  }
  writeColumn(target, property, column);
}

/** Resolve e grava a chave primária. Gravado por `@PrimaryKey`. */
export function declarePrimaryKey(
  target: MetadataTarget,
  property: PropertyKey,
  options: PrimaryKeyOptions = {},
): void {
  writeColumn(target, property, {
    name: options.name ?? toSnakeCase(String(property)),
    type: resolveType(target, property, options.type),
    nullable: false,
    unique: false,
    primaryKey: true,
    autoIncrement: options.autoIncrement ?? true,
  });
}

/**
 * Marca a classe como entidade da tabela `table` — gravado em `ceviu:orm:entity`,
 * lido por `getEntityMeta`.
 */
export function Entity(table: string): ClassDecorator {
  return (target) => declareEntity(target, table);
}

/**
 * Marca a propriedade como coluna — grava nome (snake_case por padrão), tipo (explícito
 * ou `design:type`), `nullable` e `unique` em `ceviu:orm:columns`, lido por `getEntityMeta`.
 * Sem tipo resolvível, a decoração falha em vez de gravar um metadado incerto.
 */
export function Column(options: ColumnOptions = {}): PropertyDecorator {
  return (target, propertyKey) => declareColumn(target, propertyKey, options);
}

/**
 * Marca a propriedade como chave primária (`autoIncrement` padrão `true`) — gravado
 * em `ceviu:orm:columns` com `primaryKey: true`, nunca nula e nunca UNIQUE por si.
 */
export function PrimaryKey(options: PrimaryKeyOptions = {}): PropertyDecorator {
  return (target, propertyKey) => declarePrimaryKey(target, propertyKey, options);
}

/**
 * Marca o lado **dono** da relação: grava `{kind: 'many-to-one', column, target}` em
 * `ceviu:orm:relations`. `column` é a FK no banco (padrão `snake_case(propriedade)_id`);
 * `target` fica lazy (`() => X`) para permitir referência circular entre entidades.
 */
export function ManyToOne<T extends object>(
  target: () => EntityClass<T>,
  options: ManyToOneOptions = {},
): PropertyDecorator {
  return (decorated, propertyKey) => declareManyToOne(decorated, propertyKey, target, options);
}

/**
 * Descobre a propriedade acessada pelo acessador do inverso — o acessador roda com um
 * `Proxy` que grava o último `get` (como o TypeORM faz para o lado inverso).
 */
function inversePropertyOf<T extends object>(inverse: (target: T) => unknown): string {
  let accessed: string | undefined;
  const recorder = new Proxy({} as T, {
    get(_target, property) {
      accessed = String(property);
      return recorder;
    },
  });
  inverse(recorder);
  if (accessed === undefined) {
    throw new Error('@OneToMany precisa do acessador do lado inverso: (x) => x.campo.');
  }
  return accessed;
}

/**
 * Marca o lado **inverso**: grava `{kind: 'one-to-many', inverse, target}` — sem coluna
 * própria; o `inverse` aponta para a propriedade `@ManyToOne` do outro lado, dona da FK.
 */
export function OneToMany<T extends object>(
  target: () => EntityClass<T>,
  inverse: (target: T) => unknown,
): PropertyDecorator {
  return (decorated, propertyKey) =>
    declareOneToMany(decorated, propertyKey, target, inversePropertyOf(inverse));
}

/**
 * Metadado da entidade: tabela + colunas + relações, mescladas pela cadeia (a filha vence),
 * na ordem base → própria. Sem `@Entity` (ou sem colunas), devolve `undefined`.
 */
export function getEntityMeta(target: MetadataTarget): EntityMeta | undefined {
  const table = getMergedMetadata<{ table: string }>(target, TABLE_KEY)?.table;
  const columns = getMergedMetadata<ColumnsByProperty>(target, COLUMNS_KEY);
  if (table === undefined || columns === undefined) {
    return undefined;
  }
  const relations = getMergedMetadata<RelationsByProperty>(target, RELATIONS_KEY) ?? {};
  return {
    table,
    columns: Object.entries(columns).map(([property, column]) => ({ property, ...column })),
    relations: Object.entries(relations).map(([property, relation]) => ({ property, ...relation })),
  };
}

/**
 * Igual a `getEntityMeta`, mas falha apontando a classe quando não há metadados —
 * usado por `hydrate`/`dehydrate` (T5.2) e pelo `BaseRepository` (T5.4).
 */
export function requireEntityMeta(target: MetadataTarget): EntityMeta {
  const meta = getEntityMeta(target);
  if (meta === undefined) {
    const name = typeof target === 'function' ? target.name : target.constructor.name;
    throw new Error(`A classe "${name}" não tem metadados de entidade (@Entity e @Column).`);
  }
  return meta;
}

/** Chave primária do metadado (ou `undefined` quando a entidade não tem `@PrimaryKey`). */
export function primaryKeyOf(meta: EntityMeta): EntityColumnMeta | undefined {
  return meta.columns.find((column) => column.primaryKey);
}
