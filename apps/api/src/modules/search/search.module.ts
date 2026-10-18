import { Module } from '@nestjs/common';
import { Movie } from '../../database/entities/movie.entity';
import { Series } from '../../database/entities/series.entity';
import { MiniOrmModule } from '../../framework/orm/mini-orm.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [MiniOrmModule.forFeature([Movie, Series])],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
