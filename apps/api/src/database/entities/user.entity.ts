import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WatchedMovie } from './watched-movie.entity';
import { WatchedSeries } from './watched-series.entity';
import { Favorite } from './favorite.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;

  @Index('idx_users_email', { unique: true })
  @Column({ type: 'text', collation: 'NOCASE' })
  email!: string;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  country!: string | null;

  @Column({ type: 'integer', nullable: true })
  age!: number | null;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({ name: 'watched_movie_minutes', type: 'integer', default: 0 })
  watchedMovieMinutes!: number;

  @Column({ name: 'watched_series_minutes', type: 'integer', default: 0 })
  watchedSeriesMinutes!: number;

  @Column({ name: 'total_minutes', type: 'integer', default: 0 })
  totalMinutes!: number;

  @CreateDateColumn({ name: 'created_at', type: 'text' })
  createdAt!: string;

  @DeleteDateColumn({ name: 'deleted_at', type: 'text', nullable: true })
  deletedAt!: string | null;

  @OneToMany(() => WatchedMovie, (watched) => watched.user)
  watchedMovies!: WatchedMovie[];

  @OneToMany(() => WatchedSeries, (watched) => watched.user)
  watchedSeries!: WatchedSeries[];

  @OneToMany(() => Favorite, (favorite) => favorite.user)
  favorites!: Favorite[];
}
