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
}

/** Metadado de uma entidade (lido de `getEntityMeta`). */
export interface EntityMeta {
  table: string;
  /** Colunas na ordem de declaração (base primeiro, depois as próprias). */
  columns: EntityColumnMeta[];
}

const TABLE_KEY = 'orm:entity';
const COLUMNS_KEY = 'orm:columns';

/** Mapa propriedade → coluna resolvida (sem `property`, que é a própria chave). */
type ColumnsByProperty = Record<PropertyKey, Omit<EntityColumnMeta, 'property'>>;

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
  writeColumn(target, property, {
    name: options.name ?? toSnakeCase(String(property)),
    type: resolveType(target, property, options.type),
    nullable: options.nullable ?? false,
    unique: options.unique ?? false,
    primaryKey: false,
    autoIncrement: false,
  });
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
 * Metadado da entidade: tabela (mesclada pela cadeia — a filha vence) + colunas mescladas,
 * na ordem base → própria. Sem `@Entity` (ou sem colunas), devolve `undefined`.
 */
export function getEntityMeta(target: MetadataTarget): EntityMeta | undefined {
  const table = getMergedMetadata<{ table: string }>(target, TABLE_KEY)?.table;
  const columns = getMergedMetadata<ColumnsByProperty>(target, COLUMNS_KEY);
  if (table === undefined || columns === undefined) {
    return undefined;
  }
  return {
    table,
    columns: Object.entries(columns).map(([property, column]) => ({ property, ...column })),
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
