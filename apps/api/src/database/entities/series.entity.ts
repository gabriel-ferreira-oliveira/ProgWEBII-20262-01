import { Column, Entity, PrimaryKey } from '../../framework/orm/entity';

/** Entidade do mini-ORM (T5.12): só decoradores do framework; o schema (e os índices) vem das migrations SQL. */
@Entity('series')
export class Series {
  /** Id preservado do legado (1..35). */
  @PrimaryKey({ autoIncrement: false })
  id!: number;

  @Column()
  title!: string;

  @Column({ type: String, nullable: true })
  genre!: string | null;

  @Column({ type: String, nullable: true })
  synopsis!: string | null;

  @Column({ type: Number, nullable: true })
  year!: number | null;

  /** Ex-duracaoMedia (minutos). */
  @Column({ type: Number, nullable: true })
  durationMin!: number | null;

  /** Ex-episodio (total de episodios). */
  @Column({ type: Number, nullable: true })
  episodes!: number | null;

  /** Legado sempre 0 (P-03). */
  @Column({ default: 0 })
  season!: number;

  @Column()
  createdAt!: string;

  @Column({ type: String, nullable: true })
  deletedAt!: string | null;
}
