import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe } from '@nestjs/common';

// Note: Enhanced OpenTelemetry with Prisma and PostgreSQL instrumentation is initialized via NODE_OPTIONS

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation globally
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  const config = new DocumentBuilder()
    .setTitle('Heroes 🦸‍ vs Enemies 🐲 API')
    .setDescription('Just playing a bit with Prisma pool 🏊')
    .setVersion('1.0')
    .addTag('Health', 'Application health check')
    .addTag('Combat', 'Combat-related operations')
    .addTag('Heroes', 'Hero management operations')
    .addTag('Enemies', 'Enemy management operations')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);
  
}
bootstrap();