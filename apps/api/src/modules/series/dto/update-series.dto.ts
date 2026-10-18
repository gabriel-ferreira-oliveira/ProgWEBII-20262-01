import { ApiProperty } from '@nestjs/swagger';
import { IsString } from '../../../framework/validation/decorators';

export class UpdateSeriesDto {
  @ApiProperty({ example: 'Nova sinopse da serie.', nullable: false })
  @IsString()
  synopsis!: string;
}
