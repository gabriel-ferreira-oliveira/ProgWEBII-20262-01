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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { SeriesDto, SeriesWatchResultDto } from '@ceviu/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { UpdateSeriesDto } from './dto/update-series.dto';
import { SeriesService } from './series.service';

@ApiTags('series')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('series')
export class SeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista o catalogo de series' })
  list(): Promise<SeriesDto[]> {
    return this.seriesService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de uma serie' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<SeriesDto> {
    return this.seriesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Altera somente a sinopse' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSeriesDto,
  ): Promise<SeriesDto> {
    return this.seriesService.updateSynopsis(id, dto.synopsis);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a serie (soft delete)' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.seriesService.remove(id);
  }

  @Post(':id/watch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marca como assistida e soma a duracao (x1, paridade com o legado)' })
  watch(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SeriesWatchResultDto> {
    return this.seriesService.watch(id, user.id);
  }

  @Post(':id/favorite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Favorita (marca como assistida, sem somar tempo)' })
  favorite(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SeriesWatchResultDto> {
    return this.seriesService.favorite(id, user.id);
  }
}
