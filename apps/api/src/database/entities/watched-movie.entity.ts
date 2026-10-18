import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Movie } from './movie.entity';

@Entity({ name: 'watched_movies' })
@Index('idx_watched_movies_user', ['userId', 'position'])
export class WatchedMovie {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;

  @Column({ name: 'user_id', type: 'integer' })
  userId!: number;

  @Column({ name: 'movie_id', type: 'integer', nullable: true })
  movieId!: number | null;

  /** Titulo exato como armazenado no legado (preserva historico/orfaos). */
  @Column({ name: 'title_snapshot', type: 'text' })
  titleSnapshot!: string;

  @Column({ type: 'integer' })
  position!: number;

  @CreateDateColumn({ name: 'created_at', type: 'text' })
  createdAt!: string;

  @ManyToOne(() => User, (user) => user.watchedMovies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Movie, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'movie_id' })
  movie!: Movie | null;
}
