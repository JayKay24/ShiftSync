import './instrumentation';

import {
  Logger,
  StandardSchemaValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app/app.module';

/**
 * Initializes and bootstraps the ShiftSync NestJS application.
 *
 * Configures CORS, global API prefix ('api'), URI versioning (default '1'),
 * native NestJS 12 Standard Schema validation, and OpenAPI Swagger documentation.
 *
 * @returns {Promise<void>} Resolves when server has started listening.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));
  app.enableCors({
    exposedHeaders: ['x-trace-id'],
  });

  // Global validation using NestJS 12 native Standard Schema pipe
  app.useGlobalPipes(new StandardSchemaValidationPipe());

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Enable URI versioning: /api/v1/... (default version 1)
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const isSwaggerEnabled =
    process.env.NODE_ENV !== 'production' ||
    process.env.SWAGGER_ENABLED === 'true';

  if (isSwaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('ShiftSync API (Coastal Eats)')
      .setDescription(
        'Multi-location restaurant staff scheduling, compliance rules, shift swaps, and real-time operations API.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Provide a signed ShiftSync JWT access token',
        },
        'JWT',
      )
      .addTag('Health', 'System status and health check probes')
      .addTag('Auth', 'Authentication and credential verification')
      .addTag('Shifts', 'Shift creation, assignment, and labor compliance')
      .addTag('Swaps', 'Peer-to-peer shift swap and drop workflows')
      .addTag('Users', 'Staff profile management and preferences')
      .addTag('Analytics', 'Fairness score evaluation and workload metrics')
      .addTag('Audit', 'Immutable modification audit trail')
      .addTag('Notifications', 'User alerts and read status management')
      .build();

    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, documentFactory, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);

  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}/v1`,
  );
  if (isSwaggerEnabled) {
    Logger.log(
      `📚 Swagger documentation available at: http://localhost:${port}/${globalPrefix}/docs`,
    );
  }
}

bootstrap();
