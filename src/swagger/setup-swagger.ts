import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_PATH = 'docs';

export function setupSwagger(app: INestApplication): void {
  const apiBackendUrl =
    process.env.API_BACKEND_URL ??
    `http://localhost:${process.env.API_BACKEND_PORT ?? process.env.PORT ?? 3000}`;

  const config = new DocumentBuilder()
    .setTitle('Web3 Preparation API')
    .setDescription(
      'HTTP API for blockchain indexing and related services. Use the schemas below to explore request/response contracts.',
    )
    .setVersion('1.0')
    .addServer(apiBackendUrl, 'Current environment')
    .addTag('indexer', 'Ethereum log indexing endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (_controllerKey: string, methodKey: string) => methodKey,
    deepScanRoutes: true,
  });

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Web3 Preparation API Docs',
  });
}
