import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: process.env.APP_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('TRO API')
    .setDescription('API documentation for Tro FullStack application')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('houses', 'Boarding house management')
    .addTag('rooms', 'Room management')
    .addTag('expenses', 'Expense management')
    .addTag('settlements', 'Settlement management')
    .addTag('payments', 'Payment management')
    .addTag('uploads', 'File uploads')
    .addTag('evn', 'EVN electricity meter integration')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = Number(process.env.APP_PORT ?? 3001);
  await app.listen(port);
}

void bootstrap();
