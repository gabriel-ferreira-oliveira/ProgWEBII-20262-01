import { ApiProperty } from '@nestjs/swagger';
import { IsString } from '../../../framework/validation/decorators';

export class UpdateMovieDto {
  @ApiProperty({ example: 'Nova sinopse do filme.', nullable: false })
  @IsString()
  synopsis!: string;
}
