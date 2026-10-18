import { ApiProperty } from '@nestjs/swagger';
import { Field } from '../../../framework/forms/field';
import { IsNotEmpty, IsString } from '../../../framework/validation/decorators';

export class LoginDto {
  @ApiProperty({ example: 'gsb@gmail.com' })
  @Field({ label: 'Email', control: 'text', order: 1 })
  @IsString()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: '12345' })
  @Field({ label: 'Senha', control: 'password', order: 2 })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
