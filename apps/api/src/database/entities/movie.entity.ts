import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'movies' })
export class Movie {
  /** Id preservado do legado (1..30). */
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

  @Column({ name: 'duration_min', type: 'integer', nullable: true })
  durationMin!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'text' })
  createdAt!: string;

  @Index('idx_movies_deleted_at')
  @DeleteDateColumn({ name: 'deleted_at', type: 'text', nullable: true })
  deletedAt!: string | null;
}
