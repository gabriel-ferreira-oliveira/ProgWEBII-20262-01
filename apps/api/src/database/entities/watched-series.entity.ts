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
import { Series } from './series.entity';

@Entity({ name: 'watched_series' })
@Index('idx_watched_series_user', ['userId', 'position'])
export class WatchedSeries {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;

  @Column({ name: 'user_id', type: 'integer' })
  userId!: number;

  @Column({ name: 'series_id', type: 'integer', nullable: true })
  seriesId!: number | null;

  @Column({ name: 'title_snapshot', type: 'text' })
  titleSnapshot!: string;

  @Column({ type: 'integer' })
  position!: number;

  @CreateDateColumn({ name: 'created_at', type: 'text' })
  createdAt!: string;

  @ManyToOne(() => User, (user) => user.watchedSeries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Series, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'series_id' })
  series!: Series | null;
}
