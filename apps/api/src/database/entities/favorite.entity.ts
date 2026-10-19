import { Column, Entity, ManyToOne, PrimaryKey } from '../../framework/orm/entity';
import { User } from './user.entity';
import { Movie } from './movie.entity';
import { Series } from './series.entity';

/** Entidade do mini-ORM (T5.12): só decoradores do framework; o schema (e os índices) vem das migrations SQL. */
@Entity('favorites')
export class Favorite {
  @PrimaryKey()
  id!: number;

  @Column()
  userId!: number;

  /** 'movie' | 'series' (ver CHECK na migration). */
  @Column()
  mediaType!: string;

  @Column({ type: Number, nullable: true })
  movieId!: number | null;

  @Column({ type: Number, nullable: true })
  seriesId!: number | null;

  @Column()
  titleSnapshot!: string;

  @Column()
  position!: number;

  @Column()
  createdAt!: string;

  @ManyToOne(() => User, { column: 'user_id' })
  user!: User;

  @ManyToOne(() => Movie, { column: 'movie_id' })
  movie!: Movie | null;

  @ManyToOne(() => Series, { column: 'series_id' })
  series!: Series | null;
}
