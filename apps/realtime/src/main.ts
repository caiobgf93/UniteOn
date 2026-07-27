import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './redis/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const redisAdapter = new RedisIoAdapter(app);
  await redisAdapter.connectToRedis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  app.useWebSocketAdapter(redisAdapter);

  const port = Number(process.env.REALTIME_PORT ?? 3002);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[uniteon-realtime] listening on :${port}`);
}

void bootstrap();
