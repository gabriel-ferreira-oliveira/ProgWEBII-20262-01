import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  Column as OrmColumn,
  Entity as OrmEntity,
  OneToMany as OrmOneToMany,
  PrimaryKey as OrmPrimaryKey,
} from '../../framework/orm/entity';
import { WatchedMovie } from './watched-movie.entity';
import { WatchedSeries } from './watched-series.entity';
import { Favorite } from './favorite.entity';

/** Dupla decoração (T5.9.4): o TypeORM ainda é dono do schema até a T5.12; o mini-ORM lê os `ceviu:orm:*`. */
@Entity({ name: 'users' })
@OrmEntity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'integer' })
  @OrmPrimaryKey()
  id!: number;

  @Index('idx_users_email', { unique: true })
  @Column({ type: 'text', collation: 'NOCASE' })
  @OrmColumn()
  email!: string;

  @Column({ name: 'password_hash', type: 'text' })
  @OrmColumn()
  passwordHash!: string;

  @Column({ type: 'text' })
  @OrmColumn()
  name!: string;

  @Column({ type: 'text', nullable: true })
  @OrmColumn({ type: String, nullable: true })
  country!: string | null;

  @Column({ type: 'integer', nullable: true })
  @OrmColumn({ type: Number, nullable: true })
  age!: number | null;

  @Column({ type: 'text', nullable: true })
  @OrmColumn({ type: String, nullable: true })
  bio!: string | null;

  @Column({ name: 'watched_movie_minutes', type: 'integer', default: 0 })
  @OrmColumn({ default: 0 })
  watchedMovieMinutes!: number;

  @Column({ name: 'watched_series_minutes', type: 'integer', default: 0 })
  @OrmColumn({ default: 0 })
  watchedSeriesMinutes!: number;

  @Column({ name: 'total_minutes', type: 'integer', default: 0 })
  @OrmColumn({ default: 0 })
  totalMinutes!: number;

  @CreateDateColumn({ name: 'created_at', type: 'text' })
  @OrmColumn()
  createdAt!: string;

  @DeleteDateColumn({ name: 'deleted_at', type: 'text', nullable: true })
  @OrmColumn({ type: String, nullable: true })
  deletedAt!: string | null;

  @OneToMany(() => WatchedMovie, (watched) => watched.user)
  @OrmOneToMany(() => WatchedMovie, (watched) => watched.user)
  watchedMovies!: WatchedMovie[];

  @OneToMany(() => WatchedSeries, (watched) => watched.user)
  @OrmOneToMany(() => WatchedSeries, (watched) => watched.user)
  watchedSeries!: WatchedSeries[];

  @OneToMany(() => Favorite, (favorite) => favorite.user)
  @OrmOneToMany(() => Favorite, (favorite) => favorite.user)
  favorites!: Favorite[];
}
