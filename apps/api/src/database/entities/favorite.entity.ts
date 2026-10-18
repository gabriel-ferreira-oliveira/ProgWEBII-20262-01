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
import { Series } from './series.entity';

@Entity({ name: 'favorites' })
@Index('idx_favorites_user', ['userId', 'position'])
export class Favorite {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;

  @Column({ name: 'user_id', type: 'integer' })
  userId!: number;

  /** 'movie' | 'series' (ver CHECK na migration). */
  @Column({ name: 'media_type', type: 'text' })
  mediaType!: string;

  @Column({ name: 'movie_id', type: 'integer', nullable: true })
  movieId!: number | null;

  @Column({ name: 'series_id', type: 'integer', nullable: true })
  seriesId!: number | null;

  @Column({ name: 'title_snapshot', type: 'text' })
  titleSnapshot!: string;

  @Column({ type: 'integer' })
  position!: number;

  @CreateDateColumn({ name: 'created_at', type: 'text' })
  createdAt!: string;

  @ManyToOne(() => User, (user) => user.favorites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Movie, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'movie_id' })
  movie!: Movie | null;

  @ManyToOne(() => Series, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'series_id' })
  series!: Series | null;
}
