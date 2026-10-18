import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import type {
  FavoriteEntryDto,
  UserDetailDto,
  UserSummaryDto,
  WatchedEntryDto,
} from '@ceviu/shared';
import { Authenticated } from '../../common/decorators/authenticated.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { UsersService } from './users.service';

@Authenticated('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Lista a comunidade (todos, exceto o usuario logado)' })
  list(@CurrentUser() currentUser: AuthenticatedUser): Promise<UserSummaryDto[]> {
    return this.usersService.listCommunity(currentUser.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Perfil + tempos de um usuario' })
  detail(@Param('id', ParseIntPipe) id: number): Promise<UserDetailDto> {
    return this.usersService.getDetail(id);
  }

  @Get(':id/watched-movies')
  @ApiOperation({ summary: 'Filmes assistidos (ordem e duplicatas preservadas)' })
  watchedMovies(@Param('id', ParseIntPipe) id: number): Promise<WatchedEntryDto[]> {
    return this.usersService.getWatchedMovies(id);
  }

  @Get(':id/watched-series')
  @ApiOperation({ summary: 'Series assistidas (ordem e duplicatas preservadas)' })
  watchedSeries(@Param('id', ParseIntPipe) id: number): Promise<WatchedEntryDto[]> {
    return this.usersService.getWatchedSeries(id);
  }

  @Get(':id/favorites')
  @ApiOperation({ summary: 'Favoritos (filmes e series, ordem e duplicatas preservadas)' })
  favorites(@Param('id', ParseIntPipe) id: number): Promise<FavoriteEntryDto[]> {
    return this.usersService.getFavorites(id);
  }
}
