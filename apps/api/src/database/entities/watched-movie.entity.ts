import { Column, Entity, ManyToOne, PrimaryKey } from '../../framework/orm/entity';
import { User } from './user.entity';
import { Movie } from './movie.entity';

/** Entidade do mini-ORM (T5.12): só decoradores do framework; o schema (e os índices) vem das migrations SQL. */
@Entity('watched_movies')
export class WatchedMovie {
  @PrimaryKey()
  id!: number;

  @Column()
  userId!: number;

  @Column({ type: Number, nullable: true })
  movieId!: number | null;

  /** Titulo exato como armazenado no legado (preserva historico/orfaos). */
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
}
