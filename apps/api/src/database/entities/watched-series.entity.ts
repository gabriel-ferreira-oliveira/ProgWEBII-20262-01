import { Column, Entity, ManyToOne, PrimaryKey } from '../../framework/orm/entity';
import { User } from './user.entity';
import { Series } from './series.entity';

/** Entidade do mini-ORM (T5.12): só decoradores do framework; o schema (e os índices) vem das migrations SQL. */
@Entity('watched_series')
export class WatchedSeries {
  @PrimaryKey()
  id!: number;

  @Column()
  userId!: number;

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

  @ManyToOne(() => Series, { column: 'series_id' })
  series!: Series | null;
}
