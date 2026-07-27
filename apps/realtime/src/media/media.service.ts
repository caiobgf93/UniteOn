import { Injectable, Logger } from '@nestjs/common';
import { AccessToken } from 'livekit-server-sdk';

export interface MediaGrant {
  roomName: string;
  token: string;
  url: string;
}

/**
 * Emite tokens LiveKit escopados à room de uma zona. Se as credenciais não
 * estiverem configuradas (dev sem conta LiveKit), retorna `configured = false`
 * e o gateway ainda anuncia a room-alvo (com token vazio) — assim a ponte de
 * áudio por zona é verificável mesmo sem keys.
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly apiKey = process.env.LIVEKIT_API_KEY ?? '';
  private readonly apiSecret = process.env.LIVEKIT_API_SECRET ?? '';
  private readonly url = process.env.LIVEKIT_URL ?? '';

  get configured(): boolean {
    return Boolean(this.apiKey && this.apiSecret && this.url);
  }

  constructor() {
    if (!this.configured) {
      this.logger.warn('LiveKit não configurado — áudio por zona anuncia rooms sem token.');
    }
  }

  async issue(roomName: string, identity: string, name: string): Promise<MediaGrant> {
    if (!this.configured) return { roomName, token: '', url: this.url };
    const at = new AccessToken(this.apiKey, this.apiSecret, { identity, name, ttl: '1h' });
    at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });
    return { roomName, token: await at.toJwt(), url: this.url };
  }
}
