import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  Column as OrmColumn,
  Entity as OrmEntity,
  ManyToOne as OrmManyToOne,
  PrimaryKey as OrmPrimaryKey,
} from '../../framework/orm/entity';
import { User } from './user.entity';
import { Movie } from './movie.entity';
import { Series } from './series.entity';

/** Dupla decoração (T5.9.8): o TypeORM ainda é dono do schema até a T5.12; o mini-ORM lê os `ceviu:orm:*`. */
@Entity({ name: 'favorites' })
@Index('idx_favorites_user', ['userId', 'position'])
@OrmEntity('favorites')
export class Favorite {
  @PrimaryGeneratedColumn({ type: 'integer' })
  @OrmPrimaryKey()
  id!: number;

  @Column({ name: 'user_id', type: 'integer' })
  @OrmColumn()
  userId!: number;

  /** 'movie' | 'series' (ver CHECK na migration). */
  @Column({ name: 'media_type', type: 'text' })
  @OrmColumn()
  mediaType!: string;

  @Column({ name: 'movie_id', type: 'integer', nullable: true })
  @OrmColumn({ type: Number, nullable: true })
  movieId!: number | null;

  @Column({ name: 'series_id', type: 'integer', nullable: true })
  @OrmColumn({ type: Number, nullable: true })
  seriesId!: number | null;

  @Column({ name: 'title_snapshot', type: 'text' })
  @OrmColumn()
  titleSnapshot!: string;

  @Column({ type: 'integer' })
  @OrmColumn()
  position!: number;

  @CreateDateColumn({ name: 'created_at', type: 'text' })
  @OrmColumn()
  createdAt!: string;

  @ManyToOne(() => User, (user) => user.favorites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  @OrmManyToOne(() => User, { column: 'user_id' })
  user!: User;

  @ManyToOne(() => Movie, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'movie_id' })
  @OrmManyToOne(() => Movie, { column: 'movie_id' })
  movie!: Movie | null;

  @ManyToOne(() => Series, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'series_id' })
  @OrmManyToOne(() => Series, { column: 'series_id' })
  series!: Series | null;
}
