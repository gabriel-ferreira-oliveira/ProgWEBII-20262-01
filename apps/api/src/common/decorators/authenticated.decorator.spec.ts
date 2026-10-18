import { Controller, Get } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { Authenticated } from './authenticated.decorator';

@Authenticated('prova')
@Controller('prova')
class ProvaController {
  @Get()
  oi(): string {
    return 'oi';
  }
}

describe('@Authenticated', () => {
  it('aplica exatamente o JwtAuthGuard como guard do controller', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, ProvaController)).toEqual([JwtAuthGuard]);
  });

  it('bloqueia a rota sem autenticacao (o guard esta ativo)', async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [ProvaController] })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => false })
      .compile();
    const app = moduleRef.createNestApplication();
    await app.init();

    await request(app.getHttpServer()).get('/prova').expect(403);

    await app.close();
  });

  it('publica a tag e o bearer auth no documento OpenAPI', async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [ProvaController] }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();

    const documento = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    expect(documento.paths['/prova']?.get?.tags).toEqual(['prova']);
    expect(documento.paths['/prova']?.get?.security).toEqual([{ bearer: [] }]);

    await app.close();
  });
});
