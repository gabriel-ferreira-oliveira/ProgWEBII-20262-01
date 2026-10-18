import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { User } from '../../database/entities/user.entity';
import { makeUser } from '../../testing/factories';
import { createBaseRepositoryMock } from '../../testing/repository-mock';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const queryBuilder = {
    withDeleted: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    first: jest.fn(),
  };
  const usersRepository = createBaseRepositoryMock<User>('query', 'insert');
  const jwtService = {
    sign: jest.fn().mockReturnValue('token-de-teste'),
  };
  const configService = {
    get: jest.fn().mockReturnValue(4),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    queryBuilder.withDeleted.mockReturnThis();
    queryBuilder.where.mockReturnThis();
    usersRepository.query.mockReturnValue(queryBuilder);
    usersRepository.insert.mockImplementation((user: User) => {
      user.id = 5;
      return user;
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: User, useValue: usersRepository },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('registra com sucesso: pais fixo Brasil e senha com bcrypt', async () => {
    queryBuilder.first.mockReturnValue(undefined);

    const result = await service.register({
      name: 'Novo',
      email: 'novo@exemplo.com',
      password: '12345',
      age: 30,
      bio: 'Oi',
    });

    expect(result).toEqual({
      id: 5,
      name: 'Novo',
      email: 'novo@exemplo.com',
      country: 'Brasil',
      age: 30,
      bio: 'Oi',
    });

    const insertArg = usersRepository.insert.mock.calls[0][0] as User;
    expect(insertArg.passwordHash).not.toBe('12345');
    await expect(bcrypt.compare('12345', insertArg.passwordHash)).resolves.toBe(true);
  });

  it('rejeita email ja cadastrado (case-insensitive) com 409', async () => {
    queryBuilder.first.mockReturnValue(makeUser({ email: 'GSB@GMAIL.COM' }));

    await expect(
      service.register({ name: 'X', email: 'gsb@gmail.com', password: '1', age: 21 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejeita login de email inexistente com a mensagem do legado', async () => {
    queryBuilder.first.mockReturnValue(undefined);

    await expect(service.login({ email: 'ninguem@x.com', password: '1' })).rejects.toThrow(
      new UnauthorizedException('Email ou senha inválidos!'),
    );
  });

  it('rejeita senha incorreta com a mensagem do legado', async () => {
    const passwordHash = await bcrypt.hash('12345', 4);
    queryBuilder.first.mockReturnValue(makeUser({ passwordHash }));

    await expect(service.login({ email: 'gsb@gmail.com', password: 'errada' })).rejects.toThrow(
      new UnauthorizedException('Email ou senha inválidos!'),
    );
  });

  it('login com sucesso devolve token e perfil', async () => {
    const passwordHash = await bcrypt.hash('12345', 4);
    queryBuilder.first.mockReturnValue(makeUser({ id: 9, passwordHash }));

    const result = await service.login({ email: 'gsb@gmail.com', password: '12345' });

    expect(result.token).toBe('token-de-teste');
    expect(result.user.id).toBe(9);
    expect(jwtService.sign).toHaveBeenCalledWith({ sub: 9, email: 'gsb@gmail.com' });
  });
});
