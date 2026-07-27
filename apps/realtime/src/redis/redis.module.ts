import { Global, Logger, Module } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS = Symbol('REDIS');

/**
 * Cliente Redis para presença/pub-sub. Se o Redis não estiver disponível
 * (ex.: dev sem Docker), provê `null` e o PresenceStore cai para memória.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      useFactory: async (): Promise<Redis | null> => {
        const logger = new Logger('RedisModule');
        const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
        const client = new Redis(url, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          retryStrategy: () => null,
          connectTimeout: 800,
        });
        try {
          await client.connect();
          await client.ping();
          logger.log('Redis conectado');
          return client;
        } catch (err) {
          client.disconnect();
          logger.warn(`Redis indisponível — presença em memória (single-instance). ${String(err)}`);
          return null;
        }
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
