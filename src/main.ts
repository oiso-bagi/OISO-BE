import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '@/app.module';

// Ensure Prisma uses the binary engine at runtime when running locally
process.env.PRISMA_CLIENT_ENGINE_TYPE =
  process.env.PRISMA_CLIENT_ENGINE_TYPE ?? 'binary';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('OISO API')
    .setDescription('OISO backend API documentation')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addCookieAuth('oiso_access_token')
    .addCookieAuth('oiso_refresh_token')
    .build();
  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('api-docs', app, documentFactory, {
    jsonDocumentUrl: 'api-docs/json',
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((err) => {
  console.error('NestJS 서버 실행 중 에러', err);
  process.exit(1);
});
