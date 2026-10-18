import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { SearchResultDto } from '@ceviu/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchService } from './search.service';

@ApiTags('search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Pesquisa por titulo (contains) ou por id exato' })
  search(@Query() query: SearchQueryDto): Promise<SearchResultDto> {
    return this.searchService.search(query);
  }
}
