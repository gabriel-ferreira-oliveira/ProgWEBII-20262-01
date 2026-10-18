import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import type { LoginResponseDto, UserProfileDto } from '@ceviu/shared';
import { toUserProfileDto } from '../../common/mappers';
import { User } from '../../database/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<UserProfileDto> {
    const existing = await this.users
      .createQueryBuilder('user')
      .withDeleted()
      .where('user.email = :email', { email: dto.email })
      .getOne();
    if (existing !== null) {
      throw new ConflictException('Email ja cadastrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds());
    const user = this.users.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
      country: 'Brasil',
      age: dto.age ?? null,
      bio: dto.bio ?? null,
    });
    const saved = await this.users.save(user);
    return toUserProfileDto(saved);
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.users.findOne({ where: { email: dto.email } });
    if (user === null) {
      throw new UnauthorizedException('Email ou senha inválidos!');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Email ou senha inválidos!');
    }

    const payload: JwtPayload = { sub: user.id, email: user.email };
    return { token: this.jwtService.sign(payload), user: toUserProfileDto(user) };
  }

  private bcryptRounds(): number {
    return this.configService.get<number>('app.bcryptRounds') ?? 10;
  }
}
