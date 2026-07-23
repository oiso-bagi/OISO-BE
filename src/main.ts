import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Ensure Prisma uses the binary engine at runtime when running locally
process.env.PRISMA_CLIENT_ENGINE_TYPE =
  process.env.PRISMA_CLIENT_ENGINE_TYPE ?? 'binary';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((err) => {
  console.error('NestJS 서버 실행 중 에러', err);
  process.exit(1);
});
