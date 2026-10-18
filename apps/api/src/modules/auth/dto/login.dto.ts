import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from '../../../framework/validation/decorators';

export class LoginDto {
  @ApiProperty({ example: 'gsb@gmail.com' })
  @IsString()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: '12345' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
