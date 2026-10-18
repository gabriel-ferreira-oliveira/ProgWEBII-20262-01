import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import type { MovieDto, MovieWatchResultDto } from '@ceviu/shared';
import { Authenticated } from '../../common/decorators/authenticated.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { MoviesService } from './movies.service';

@Authenticated('movies')
@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista o catalogo de filmes' })
  list(): Promise<MovieDto[]> {
    return this.moviesService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de um filme' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<MovieDto> {
    return this.moviesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Altera somente a sinopse' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMovieDto,
  ): Promise<MovieDto> {
    return this.moviesService.updateSynopsis(id, dto.synopsis);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove o filme (soft delete)' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.moviesService.remove(id);
  }

  @Post(':id/watch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marca como assistido e soma a duracao' })
  watch(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MovieWatchResultDto> {
    return this.moviesService.watch(id, user.id);
  }

  @Post(':id/favorite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Favorita (marca como assistido e soma a duracao)' })
  favorite(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MovieWatchResultDto> {
    return this.moviesService.favorite(id, user.id);
  }
}
