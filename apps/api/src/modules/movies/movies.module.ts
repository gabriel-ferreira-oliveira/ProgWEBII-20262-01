import { Module } from '@nestjs/common';
import { Favorite } from '../../database/entities/favorite.entity';
import { Movie } from '../../database/entities/movie.entity';
import { User } from '../../database/entities/user.entity';
import { WatchedMovie } from '../../database/entities/watched-movie.entity';
import { MiniOrmModule } from '../../framework/orm/mini-orm.module';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';

@Module({
  imports: [MiniOrmModule.forFeature([Movie, User, WatchedMovie, Favorite])],
  controllers: [MoviesController],
  providers: [MoviesService],
})
export class MoviesModule {}
