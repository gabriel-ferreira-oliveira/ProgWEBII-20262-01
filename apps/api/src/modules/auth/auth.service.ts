import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { LoginResponseDto, UserProfileDto } from '@ceviu/shared';
import { toUserProfileDto } from '../../common/mappers';
import { BaseRepository } from '../../framework/orm/base-repository';
import { User } from '../../database/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    @Inject(User)
    private readonly users: BaseRepository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<UserProfileDto> {
    const existing = this.users.query().withDeleted().where('email', '=', dto.email).first();
    if (existing !== undefined) {
      throw new ConflictException('Email ja cadastrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds());
    const saved = this.users.insert(
      Object.assign(new User(), {
        email: dto.email,
        passwordHash,
        name: dto.name,
        country: 'Brasil',
        age: dto.age ?? null,
        bio: dto.bio ?? null,
      }),
    );
    return toUserProfileDto(saved);
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = this.users.query().where('email', '=', dto.email).first();
    if (user === undefined) {
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
