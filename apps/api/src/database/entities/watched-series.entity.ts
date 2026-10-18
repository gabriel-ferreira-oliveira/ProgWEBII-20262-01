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
import { Series } from './series.entity';

/** Dupla decoração (T5.9.7): o TypeORM ainda é dono do schema até a T5.12; o mini-ORM lê os `ceviu:orm:*`. */
@Entity({ name: 'watched_series' })
@Index('idx_watched_series_user', ['userId', 'position'])
@OrmEntity('watched_series')
export class WatchedSeries {
  @PrimaryGeneratedColumn({ type: 'integer' })
  @OrmPrimaryKey()
  id!: number;

  @Column({ name: 'user_id', type: 'integer' })
  @OrmColumn()
  userId!: number;

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

  @ManyToOne(() => User, (user) => user.watchedSeries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  @OrmManyToOne(() => User, { column: 'user_id' })
  user!: User;

  @ManyToOne(() => Series, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'series_id' })
  @OrmManyToOne(() => Series, { column: 'series_id' })
  series!: Series | null;
}
