import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ExactlyOneOf,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from '../../../framework/validation/decorators';

@ExactlyOneOf(['title', 'id'], {
  missing: 'Campos de pesquisa vazio',
  multiple: 'Apenas um campo pode ser prenchido para a pesquisa',
})
export class SearchQueryDto {
  @ApiPropertyOptional({ description: 'Trecho do titulo (contains, case-insensitive).' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Id exato de filme ou serie.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;
}
