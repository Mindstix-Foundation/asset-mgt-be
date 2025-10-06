import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

(async () => {
  const app = await NestFactory.create(AppModule);

  // Cookie parser middleware (MUST be before other middleware)
  app.use(cookieParser());

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Enable CORS for frontend connection with credentials
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:5174'], // Vite dev server ports
    credentials: true, // Allow cookies to be sent
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Id'],
  });

  // Enable validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Set global prefix
  app.setGlobalPrefix('api');

  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Asset Management System API')
    .setDescription(
      'Comprehensive API documentation for TrackStix Asset Management System',
    )
    .setVersion('1.0')
    .addTag('auth', 'Authentication operations')
    .addTag('employees', 'Employee management operations')
    .addTag('vendors', 'Vendor management operations')
    .addTag('asset-categories', 'Asset category management operations')
    .addTag('asset-types', 'Asset type management operations')
    .addTag('brands', 'Brand management operations')
    .addTag('models', 'Model management operations')
    .addTag('assets', 'Asset management operations')
    .addTag('assignments', 'Asset assignment and return operations')
    .addTag('reports', 'Report generation and export operations')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}/api`);
  console.log(
    `Swagger documentation available at: http://localhost:${port}/api/docs`,
  );
})().catch((err) => {
  console.error('Failed to start NestJS application:', err);
  process.exit(1);
});
