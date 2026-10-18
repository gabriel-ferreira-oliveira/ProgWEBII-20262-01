import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'series' })
export class Series {
  /** Id preservado do legado (1..35). */
  @PrimaryColumn({ type: 'integer' })
  id!: number;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text', nullable: true })
  genre!: string | null;

  @Column({ type: 'text', nullable: true })
  synopsis!: string | null;

  @Column({ type: 'integer', nullable: true })
  year!: number | null;

  /** Ex-duracaoMedia (minutos). */
  @Column({ name: 'duration_min', type: 'integer', nullable: true })
  durationMin!: number | null;

  /** Ex-episodio (total de episodios). */
  @Column({ type: 'integer', nullable: true })
  episodes!: number | null;

  /** Legado sempre 0 (P-03). */
  @Column({ type: 'integer', default: 0 })
  season!: number;

  @CreateDateColumn({ name: 'created_at', type: 'text' })
  createdAt!: string;

  @Index('idx_series_deleted_at')
  @DeleteDateColumn({ name: 'deleted_at', type: 'text', nullable: true })
  deletedAt!: string | null;
}
