import { ApiProperty } from '@nestjs/swagger';
import { Field } from '../../../framework/forms/field';
import { IsString } from '../../../framework/validation/decorators';

export class UpdateSeriesDto {
  @ApiProperty({ example: 'Nova sinopse da serie.', nullable: false })
  @Field({ label: 'Sinopse', control: 'textarea', order: 1 })
  @IsString()
  synopsis!: string;
}
