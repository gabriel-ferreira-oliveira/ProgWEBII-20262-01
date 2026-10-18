/**
 * Mini-ORM — contexto de tabela por entidade (T5.6).
 *
 * Resolve o `EntityMeta` (T5.1) da classe, exige `@PrimaryKey` e concentra a **whitelist
 * de colunas** (propriedade → coluna do banco) usada pelo `BaseRepository` (T5.4) e
 * pelo `QueryBuilder` (T5.6): nome de tabela/coluna em SQL **só** vem daqui.
 */
import { primaryKeyOf, requireEntityMeta } from './entity';
import type { EntityColumnMeta, EntityMeta, EntityRelationMeta } from './entity';
import type { EntityClass } from './hydrate';

/** Metadados resolvidos de uma entidade: tabela, chave primária e whitelists. */
export class TableContext<T extends object> {
  readonly meta: EntityMeta;
  readonly primaryKey: EntityColumnMeta;
  readonly deletedColumn: EntityColumnMeta | undefined;
  private readonly columnsByProperty: Map<string, EntityColumnMeta>;
  private readonly relationsByProperty: Map<string, EntityRelationMeta>;

  constructor(readonly entityClass: EntityClass<T>) {
    this.meta = requireEntityMeta(entityClass);
    this.columnsByProperty = new Map(this.meta.columns.map((column) => [column.property, column]));
    this.relationsByProperty = new Map(
      this.meta.relations.map((relation) => [relation.property, relation]),
    );
    const primaryKey = primaryKeyOf(this.meta);
    if (primaryKey === undefined) {
      throw new Error(`A entidade "${entityClass.name}" não tem @PrimaryKey.`);
    }
    this.primaryKey = primaryKey;
    this.deletedColumn = this.meta.columns.find((column) => column.name === 'deleted_at');
  }

  /** Whitelist: só propriedade do metadado vira SQL; fora dela, falha citando a entidade. */
  columnOf(property: string): EntityColumnMeta {
    const column = this.columnsByProperty.get(property);
    if (column === undefined) {
      throw new Error(
        `A propriedade "${property}" não é coluna da entidade "${this.entityClass.name}".`,
      );
    }
    return column;
  }

  /** Whitelist de relações: só o que está no metadado pode ser incluído via JOIN. */
  relationOf(property: string): EntityRelationMeta {
    const relation = this.relationsByProperty.get(property);
    if (relation === undefined) {
      throw new Error(
        `A propriedade "${property}" não é relação da entidade "${this.entityClass.name}".`,
      );
    }
    return relation;
  }
}
