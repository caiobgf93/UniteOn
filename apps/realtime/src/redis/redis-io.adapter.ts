import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import type { ServerOptions } from 'socket.io';

/**
 * Adapter do Socket.IO com Redis pub/sub → permite escalar o gateway
 * horizontalmente (broadcasts entre instâncias). Best-effort: se o Redis não
 * conectar, cai para o adapter em memória (instância única).
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(url: string): Promise<void> {
    try {
      const pub = new Redis(url, { maxRetriesPerRequest: 3 });
      const sub = pub.duplicate();
      await Promise.all([pub.ping(), sub.ping()]);
      this.adapterConstructor = createAdapter(pub, sub);
      this.logger.log('Redis adapter conectado');
    } catch (err) {
      this.logger.warn(`Redis adapter indisponível, usando in-memory: ${String(err)}`);
    }
  }

  createIOServer(port: number, options?: ServerOptions): unknown {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) server.adapter(this.adapterConstructor);
    return server;
  }
}
