import { Column, Entity, PrimaryKey } from '../../framework/orm/entity';

/** Entidade do mini-ORM (T5.12): só decoradores do framework; o schema (e os índices) vem das migrations SQL. */
@Entity('movies')
export class Movie {
  /** Id preservado do legado (1..30). */
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

  @Column({ type: Number, nullable: true })
  durationMin!: number | null;

  @Column()
  createdAt!: string;

  @Column({ type: String, nullable: true })
  deletedAt!: string | null;
}
