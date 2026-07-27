import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import type { PresenceStatus, Role } from '@uniteon/shared';
import { REDIS } from '../redis/redis.module';

/** Registro de presença persistido (fonte para novos entrantes). */
export interface PresenceRecord {
  userId: string;
  name: string;
  role: Role;
  x: number;
  y: number;
  dir: 'down' | 'up' | 'left' | 'right';
  status: PresenceStatus;
  zoneId: string | null;
}

/**
 * Presença por space. Usa Redis (hash `presence:space:{id}`) quando disponível —
 * durável e cross-instância — e cai para um Map em memória caso contrário
 * (single-instance / dev sem Docker). A interface é a mesma nos dois modos.
 */
@Injectable()
export class PresenceStore {
  private readonly mem = new Map<string, Map<string, PresenceRecord>>();

  constructor(@Inject(REDIS) private readonly redis: Redis | null) {}

  private key(spaceId: string): string {
    return `presence:space:${spaceId}`;
  }

  private memSpace(spaceId: string): Map<string, PresenceRecord> {
    let m = this.mem.get(spaceId);
    if (!m) {
      m = new Map();
      this.mem.set(spaceId, m);
    }
    return m;
  }

  async put(spaceId: string, rec: PresenceRecord): Promise<void> {
    if (this.redis) {
      await this.redis.hset(this.key(spaceId), rec.userId, JSON.stringify(rec));
    } else {
      this.memSpace(spaceId).set(rec.userId, rec);
    }
  }

  async putMany(spaceId: string, recs: PresenceRecord[]): Promise<void> {
    if (recs.length === 0) return;
    if (this.redis) {
      const pipeline = this.redis.pipeline();
      const key = this.key(spaceId);
      for (const rec of recs) pipeline.hset(key, rec.userId, JSON.stringify(rec));
      await pipeline.exec();
    } else {
      const m = this.memSpace(spaceId);
      for (const rec of recs) m.set(rec.userId, rec);
    }
  }

  async remove(spaceId: string, userId: string): Promise<void> {
    if (this.redis) await this.redis.hdel(this.key(spaceId), userId);
    else this.memSpace(spaceId).delete(userId);
  }

  async all(spaceId: string): Promise<PresenceRecord[]> {
    if (this.redis) {
      const hash = await this.redis.hgetall(this.key(spaceId));
      return Object.values(hash).map((v) => JSON.parse(v) as PresenceRecord);
    }
    return [...this.memSpace(spaceId).values()];
  }
}
