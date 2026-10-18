import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Favorite } from '../../database/entities/favorite.entity';
import { User } from '../../database/entities/user.entity';
import { WatchedMovie } from '../../database/entities/watched-movie.entity';
import { WatchedSeries } from '../../database/entities/watched-series.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, WatchedMovie, WatchedSeries, Favorite])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
