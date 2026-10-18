import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import {
  Column as OrmColumn,
  Entity as OrmEntity,
  PrimaryKey as OrmPrimaryKey,
} from '../../framework/orm/entity';

/** Dupla decoração (T5.9.2): o TypeORM ainda é dono do schema até a T5.12; o mini-ORM lê os `ceviu:orm:*`. */
@Entity({ name: 'movies' })
@OrmEntity('movies')
export class Movie {
  /** Id preservado do legado (1..30). */
  @PrimaryColumn({ type: 'integer' })
  @OrmPrimaryKey({ autoIncrement: false })
  id!: number;

  @Column({ type: 'text' })
  @OrmColumn()
  title!: string;

  @Column({ type: 'text', nullable: true })
  @OrmColumn({ type: String, nullable: true })
  genre!: string | null;

  @Column({ type: 'text', nullable: true })
  @OrmColumn({ type: String, nullable: true })
  synopsis!: string | null;

  @Column({ type: 'integer', nullable: true })
  @OrmColumn({ type: Number, nullable: true })
  year!: number | null;

  @Column({ name: 'duration_min', type: 'integer', nullable: true })
  @OrmColumn({ type: Number, nullable: true })
  durationMin!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'text' })
  @OrmColumn()
  createdAt!: string;

  @Index('idx_movies_deleted_at')
  @DeleteDateColumn({ name: 'deleted_at', type: 'text', nullable: true })
  @OrmColumn({ type: String, nullable: true })
  deletedAt!: string | null;
}
