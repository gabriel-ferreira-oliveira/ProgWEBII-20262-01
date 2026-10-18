import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { User } from '../../database/entities/user.entity';
import { MiniOrmModule } from '../../framework/orm/mini-orm.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

type SignOptions = NonNullable<JwtModuleOptions['signOptions']>;
type ExpiresIn = NonNullable<SignOptions['expiresIn']>;

@Module({
  imports: [
    MiniOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.get<string>('app.jwtSecret') ?? 'troque-este-segredo',
        signOptions: {
          expiresIn: (configService.get<string>('app.jwtExpiresIn') ?? '1d') as ExpiresIn,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
