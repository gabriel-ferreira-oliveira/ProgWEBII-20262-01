import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Favorite } from '../../database/entities/favorite.entity';
import { Series } from '../../database/entities/series.entity';
import { User } from '../../database/entities/user.entity';
import { WatchedSeries } from '../../database/entities/watched-series.entity';
import { SeriesController } from './series.controller';
import { SeriesService } from './series.service';

@Module({
  imports: [TypeOrmModule.forFeature([Series, User, WatchedSeries, Favorite])],
  controllers: [SeriesController],
  providers: [SeriesService],
})
export class SeriesModule {}
