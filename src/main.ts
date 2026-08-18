import 'dotenv/config';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '@/app.module';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '@/auth/auth.constants';
import {
  isAllowedFrontendOrigin,
  resolveFrontendOriginRules,
} from '@/common/config/frontend-origin.config';
import { applyCommonErrorResponsesToDocument } from '@/common/docs/common-error-swagger.docs';

// Ensure Prisma uses the binary engine at runtime when running locally
process.env.PRISMA_CLIENT_ENGINE_TYPE =
  process.env.PRISMA_CLIENT_ENGINE_TYPE ?? 'binary';
const port = process.env.PORT || 3000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const frontendOriginRules = resolveFrontendOriginRules(
    process.env.FRONTEND_ORIGIN,
    process.env.NODE_ENV,
  );

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || isAllowedFrontendOrigin(origin, frontendOriginRules)) {
        callback(null, true);
      } else {
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: '/', method: RequestMethod.GET }],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('OISO API')
    .setDescription('OISO backend API documentation')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addCookieAuth(ACCESS_TOKEN_COOKIE, undefined, ACCESS_TOKEN_COOKIE)
    .addCookieAuth(REFRESH_TOKEN_COOKIE, undefined, REFRESH_TOKEN_COOKIE)
    .build();
  const documentFactory = () =>
    applyCommonErrorResponsesToDocument(
      SwaggerModule.createDocument(app, swaggerConfig),
    );

  SwaggerModule.setup('api-docs', app, documentFactory, {
    jsonDocumentUrl: 'api-docs/json',
  });

  await app.listen(port, '0.0.0.0'); // 3000번 포트 및 '0.0.0.0' 바인딩
}
bootstrap().catch((err) => {
  console.error('NestJS 서버 실행 중 에러', err);
  process.exit(1);
});
