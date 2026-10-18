import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateSeriesDto {
  @ApiPropertyOptional({ example: 'Nova sinopse da serie.', nullable: false })
  @IsString()
  synopsis!: string;
}
