import { Column, Entity, OneToMany, PrimaryKey } from '../../framework/orm/entity';
import { WatchedMovie } from './watched-movie.entity';
import { WatchedSeries } from './watched-series.entity';
import { Favorite } from './favorite.entity';

/**
 * Entidade do mini-ORM (T5.12): só decoradores do framework; o schema vem das migrations SQL
 * (a unicidade do e-mail é do índice `idx_users_email` com `COLLATE NOCASE`, fora do metadado).
 */
@Entity('users')
export class User {
  @PrimaryKey()
  id!: number;

  @Column()
  email!: string;

  @Column()
  passwordHash!: string;

  @Column()
  name!: string;

  @Column({ type: String, nullable: true })
  country!: string | null;

  @Column({ type: Number, nullable: true })
  age!: number | null;

  @Column({ type: String, nullable: true })
  bio!: string | null;

  @Column({ default: 0 })
  watchedMovieMinutes!: number;

  @Column({ default: 0 })
  watchedSeriesMinutes!: number;

  @Column({ default: 0 })
  totalMinutes!: number;

  @Column()
  createdAt!: string;

  @Column({ type: String, nullable: true })
  deletedAt!: string | null;

  @OneToMany(() => WatchedMovie, (watched) => watched.user)
  watchedMovies!: WatchedMovie[];

  @OneToMany(() => WatchedSeries, (watched) => watched.user)
  watchedSeries!: WatchedSeries[];

  @OneToMany(() => Favorite, (favorite) => favorite.user)
  favorites!: Favorite[];
}
