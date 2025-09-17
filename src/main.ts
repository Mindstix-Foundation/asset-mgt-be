import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend connection
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:5174'], // Vite dev server ports
    credentials: true,
  });
  
  // Enable validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  
  // Set global prefix
  app.setGlobalPrefix('api');
  
  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Asset Management System API')
    .setDescription('Comprehensive API documentation for TrackStix Asset Management System')
    .setVersion('1.0')
    .addTag('auth', 'Authentication operations')
    .addTag('vendors', 'Vendor management operations')
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
  console.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);
}
void bootstrap();
