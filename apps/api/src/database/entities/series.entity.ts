import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import {
  Column as OrmColumn,
  Entity as OrmEntity,
  PrimaryKey as OrmPrimaryKey,
} from '../../framework/orm/entity';

/** Dupla decoração (T5.9.3): o TypeORM ainda é dono do schema até a T5.12; o mini-ORM lê os `ceviu:orm:*`. */
@Entity({ name: 'series' })
@OrmEntity('series')
export class Series {
  /** Id preservado do legado (1..35). */
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

  /** Ex-duracaoMedia (minutos). */
  @Column({ name: 'duration_min', type: 'integer', nullable: true })
  @OrmColumn({ type: Number, nullable: true })
  durationMin!: number | null;

  /** Ex-episodio (total de episodios). */
  @Column({ type: 'integer', nullable: true })
  @OrmColumn({ type: Number, nullable: true })
  episodes!: number | null;

  /** Legado sempre 0 (P-03). */
  @Column({ type: 'integer', default: 0 })
  @OrmColumn({ default: 0 })
  season!: number;

  @CreateDateColumn({ name: 'created_at', type: 'text' })
  @OrmColumn()
  createdAt!: string;

  @Index('idx_series_deleted_at')
  @DeleteDateColumn({ name: 'deleted_at', type: 'text', nullable: true })
  @OrmColumn({ type: String, nullable: true })
  deletedAt!: string | null;
}
