import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Gabriel Silva' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'gabriel@exemplo.com', description: 'Paridade com o legado: sem validacao de formato.' })
  @IsString()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: '12345' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiPropertyOptional({ example: 21, minimum: 0, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;

  @ApiPropertyOptional({ example: 'Gosto de filmes de acao.', nullable: true })
  @IsOptional()
  @IsString()
  bio?: string;
}
