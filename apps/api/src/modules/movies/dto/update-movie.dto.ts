import { ApiProperty } from '@nestjs/swagger';
import { Field } from '../../../framework/forms/field';
import { IsString } from '../../../framework/validation/decorators';

export class UpdateMovieDto {
  @ApiProperty({ example: 'Nova sinopse do filme.', nullable: false })
  @Field({ label: 'Sinopse', control: 'textarea', order: 1 })
  @IsString()
  synopsis!: string;
}
