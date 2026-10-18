import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './setup-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') ?? 3000;
  await app.listen(port);

  Logger.log(`CeViu API em http://localhost:${port}/api`, 'Bootstrap');
  Logger.log(`Swagger em http://localhost:${port}/api/docs`, 'Bootstrap');
}

void bootstrap();
