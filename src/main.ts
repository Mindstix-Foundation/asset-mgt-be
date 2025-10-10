import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import * as crypto from 'node:crypto';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cookie parser middleware (MUST be before other middleware)
  app.use(cookieParser());

  // Enhanced Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'http://localhost:5173', 'http://localhost:5174'],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // Enable CORS for frontend connection with credentials
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOrigins = isProduction
    ? [process.env.FRONTEND_URL || 'https://your-production-domain.com']
    : ['http://localhost:5173', 'http://localhost:5174'];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Allow cookies to be sent
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Device-Id',
      'X-Request-ID',
      'X-Fingerprint',
    ],
    exposedHeaders: ['X-Request-ID'],
    maxAge: 86400, // 24 hours
  });

  // Add request ID middleware for tracking
  app.use((req: any, res: any, next: any) => {
    req.id = crypto.randomUUID();
    res.setHeader('X-Request-ID', req.id);
    next();
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
}

try {
  await bootstrap();
} catch (err) {
  console.error('Failed to start NestJS application:', err);
  process.exit(1);
}
