/**
 * Endpoint **público** de metadados de formulário (T3.4).
 *
 * `GET /api/metadata/:form` devolve o `FormMetadata` do DTO registrado, montado por
 * reflexão no `describeForm` (T3.2): campos de UI (`@Field`) com as restrições reais
 * do motor de validação + regras de classe com as mensagens efetivas.
 *
 * O registry é **explícito** (nome da URL → DTO): só o que interessa ao front é publicado,
 * e o nome genérico nunca expõe DTOs arbitrários. Nome desconhecido → 404.
 * Sem guard de propósito: o front consulta os metadados antes de autenticar (login/cadastro).
 */
import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { FormMetadata } from '@ceviu/shared';
import { describeForm } from '../../framework/forms/describe-form';
import { LoginDto } from '../auth/dto/login.dto';
import { RegisterDto } from '../auth/dto/register.dto';
import { UpdateMovieDto } from '../movies/dto/update-movie.dto';
import { SearchQueryDto } from '../search/dto/search-query.dto';
import { UpdateSeriesDto } from '../series/dto/update-series.dto';

/** Registry explícito dos formulários publicados (nome da URL → DTO descrito por reflexão). */
const FORMS: Record<string, new () => object> = {
  register: RegisterDto,
  login: LoginDto,
  'movie-synopsis': UpdateMovieDto,
  'series-synopsis': UpdateSeriesDto,
  'search-catalog': SearchQueryDto,
};

@ApiTags('metadata')
@Controller('metadata')
export class MetadataController {
  @Get(':form')
  @ApiOperation({
    summary: 'Descreve um formulario (campos e regras) a partir dos metadados de reflexao do DTO',
  })
  @ApiParam({ name: 'form', enum: Object.keys(FORMS) })
  describe(@Param('form') form: string): FormMetadata {
    if (!Object.hasOwn(FORMS, form)) {
      throw new NotFoundException(`Formulario ${form} nao encontrado`);
    }
    const metadata = describeForm(FORMS[form]);
    if (metadata === undefined) {
      throw new NotFoundException(`Formulario ${form} nao encontrado`);
    }
    return metadata;
  }
}
