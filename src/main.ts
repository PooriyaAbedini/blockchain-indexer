// biome-ignore-all lint/suspicious/noConsole: this file needs console logs for debugging
import 'dotenv/config.js';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { Queue } from './lib/queue/queue.js';
import { setupSwagger, SWAGGER_PATH } from './swagger/setup-swagger.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  setupSwagger(app);

  const port = process.env.API_BACKEND_PORT ?? process.env.PORT ?? 3001;
  await app.listen(port);

  const baseUrl = process.env.API_BACKEND_URL ?? `http://localhost:${port}`;
  console.log(`Swagger docs available at ${baseUrl}/${SWAGGER_PATH}`);

  // GRACEFUL SHUTDOWN -------------------------------------------------
  // NOTE: PM2's kill_timeout must be greater than SHUTDOWN_TIMEOUT_MS
  // Set kill_timeout in your PM2 config (ecosystem.config.js or process file):
  //   kill_timeout: 5000  // 5 seconds (should be > SHUTDOWN_TIMEOUT_MS)
  // Or set SHUTDOWN_TIMEOUT_MS env var to match your PM2 kill_timeout
  const signals = ['SIGTERM', 'SIGINT'];
  let isShuttingDown = false;

  // Get shutdown timeout from env or use default (3 seconds to be safe with PM2)
  // This should be less than PM2's kill_timeout to allow graceful shutdown
  const shutdownTimeout = parseInt(process.env.SHUTDOWN_TIMEOUT_MS || '3000', 10);

  const shutdownWithTimeout = async (timeoutMs: number = shutdownTimeout) => {
    if (isShuttingDown) {
      console.warn('Shutdown already in progress, ignoring duplicate signal');
      return;
    }
    isShuttingDown = true;

    console.log(`Starting graceful shutdown (timeout: ${timeoutMs}ms)`);

    let shutdownCompleted = false;
    let shutdownError: Error | null = null;

    // Start app.close() immediately - this will trigger all lifecycle hooks
    // app.close() will handle closing the Fastify HTTP server
    const closePromise = app
      .close()
      .then(() => {
        shutdownCompleted = true;
        console.log('Application shutdown completed - all lifecycle hooks executed');
      })
      .catch((e) => {
        shutdownError = e instanceof Error ? e : new Error(String(e));
        console.error(`Error during app.close(): ${shutdownError.message}`);
        console.error(`Unhandled error during shutdown: ${shutdownError}`);
        shutdownCompleted = true; // Still mark as completed to proceed with cleanup
      });

    // Create a timeout promise
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        if (!shutdownCompleted) {
          console.warn(
            `Shutdown timeout (${timeoutMs}ms) reached - app.close() did not complete in time`,
          );
          console.warn(
            'Proceeding with forced exit - some lifecycle hooks may not have executed',
          );
        }
        resolve();
      }, timeoutMs);
    });

    // Wait for either completion or timeout
    await Promise.race([closePromise, timeoutPromise]);

    // Give a small grace period if close is still in progress (but don't wait too long)
    if (!shutdownCompleted) {
      const gracePeriod = Math.min(500, timeoutMs / 4); // Use 25% of timeout or 500ms, whichever is smaller
      console.warn(
        `Waiting additional ${gracePeriod}ms for app.close() to complete...`,
      );
      await Promise.race([
        closePromise,
        new Promise<void>((resolve) => setTimeout(resolve, gracePeriod)),
      ]);
    }

    console.log('Graceful shutdown sequence completed - exiting process');

    // Force exit immediately - don't wait, PM2 might kill us
    process.exit(shutdownError ? 1 : 0);
  };

  signals.forEach((signal) => {
    process.on(signal, async () => {
      console.log(`Received ${signal}, starting graceful shutdown`);
      await shutdownWithTimeout(shutdownTimeout);
    });
  });

  // REPATABLE JOBS HANDLING -------------------------------------------------
  // const queue = app.get(Queue);
  // const hourlyQueue = queue.checkQueueExistence("hourly");

  // if (hourlyQueue) {
  //   const jobs = await queue.getRepeatableJobs("hourly");
  //   for (const job of jobs) await queue.removeRepeatableJob("hourly", job.key!);
  // }

  // if (nodeEnv !== NodeEnvType.LOCAL) {
  //   queue.addRepeatableJob(
  //     "hourly",
  //     "hourly",
  //     {
  //       every: 1000 * 60 * 60,
  //       startDate: getNextFullHour(),
  //     },
  //     {},
  //   );
  // }
}
bootstrap();
