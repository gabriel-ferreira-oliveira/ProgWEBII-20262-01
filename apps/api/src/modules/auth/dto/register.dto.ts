import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Field } from '../../../framework/forms/field';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from '../../../framework/validation/decorators';

export class RegisterDto {
  @ApiProperty({ example: 'Gabriel Silva' })
  @Field({ label: 'Nome', control: 'text', order: 1 })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'gabriel@exemplo.com', description: 'Paridade com o legado: sem validacao de formato.' })
  @Field({ label: 'Email', control: 'text', order: 2 })
  @IsString()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: '12345' })
  @Field({ label: 'Senha', control: 'password', order: 4 })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiPropertyOptional({ example: 21, minimum: 0, nullable: true })
  @Field({ label: 'Idade', control: 'number', order: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;

  @ApiPropertyOptional({ example: 'Gosto de filmes de acao.', nullable: true })
  @Field({ label: 'Sobre', control: 'textarea', order: 5 })
  @IsOptional()
  @IsString()
  bio?: string;
}
