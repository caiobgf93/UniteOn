import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import {
  TICK_MS,
  zoneRoomName,
  type ClientToServerEvents,
  type Direction,
  type Participant,
  type PresenceStatus,
  type Role,
  type ServerToClientEvents,
} from '@uniteon/shared';
import { isValidPosition, spawn, zoneIdAt, zones } from '../world/world';
import { MediaService } from '../media/media.service';
import { resolveIdentity, type Identity } from '../auth/identity';
import { PresenceStore, type PresenceRecord } from './presence.store';

interface Session {
  socket: Socket;
  userId: string;
  name: string;
  role: Role;
  spaceId: string;
  x: number;
  y: number;
  dir: Direction;
  status: PresenceStatus;
  zoneId: string | null;
  dirty: boolean;
}

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class PresenceGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(PresenceGateway.name);

  @WebSocketServer()
  server!: TypedServer;

  /** Sessões conectadas a ESTA instância (fonte quente do tick). */
  private readonly sessions = new Map<string, Session>();

  constructor(
    private readonly presence: PresenceStore,
    private readonly media: MediaService,
  ) {}

  afterInit(): void {
    // Loop de tick: agrega movimentos e faz broadcast batched por space.
    setInterval(() => this.flushTick(), TICK_MS);
  }

  handleConnection(client: Socket): void {
    const identity = resolveIdentity(client.handshake.auth ?? {});
    if (!identity) {
      client.emit('error_event', { code: 'UNAUTHENTICATED', message: 'Autenticação inválida' });
      client.disconnect(true);
      return;
    }
    client.data.identity = identity;
    this.logger.log(`connected ${client.id} (${identity.name})`);
  }

  @SubscribeMessage('join_space')
  async onJoinSpace(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { spaceId: string },
  ): Promise<void> {
    const identity = client.data.identity as Identity | undefined;
    if (!identity) {
      client.disconnect(true);
      return;
    }
    const userId = identity.userId;
    const spaceId = body.spaceId;

    const session: Session = {
      socket: client,
      userId,
      name: identity.name,
      role: identity.role,
      spaceId,
      x: spawn.x,
      y: spawn.y,
      dir: 'down',
      status: 'WORKING',
      zoneId: zoneIdAt(spawn.x, spawn.y),
      dirty: false,
    };
    this.sessions.set(client.id, session);
    await client.join(this.room(spaceId));

    // Snapshot atual (inclui usuários de outras instâncias, via Redis).
    const participants: Participant[] = (await this.presence.all(spaceId))
      .filter((r) => r.userId !== userId)
      .map(toParticipant);

    client.emit('space_state', {
      spaceId,
      layoutRef: 'office-01',
      zones: [],
      objects: [],
      participants,
    });

    await this.presence.put(spaceId, toRecord(session));

    // Avisa os outros.
    const me = toParticipant(toRecord(session));
    client.to(this.room(spaceId)).emit('presence_join', me);
    // Confirma zona inicial ao próprio (base do áudio por zona — Épico 3).
    client.emit('zone_changed', { userId, fromZoneId: null, toZoneId: session.zoneId });
    await this.issueMedia(session);
  }

  @SubscribeMessage('move')
  onMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { x: number; y: number; dir: Direction },
  ): void {
    const s = this.sessions.get(client.id);
    if (!s) return;
    // Autoridade: só aceita posição válida (dentro do mapa, sem colisão).
    if (!isValidPosition(body.x, body.y)) return;
    s.x = body.x;
    s.y = body.y;
    s.dir = body.dir;
    s.dirty = true;

    const newZone = zoneIdAt(s.x, s.y);
    if (newZone !== s.zoneId) {
      const fromZoneId = s.zoneId;
      s.zoneId = newZone;
      client.emit('zone_changed', { userId: s.userId, fromZoneId, toZoneId: newZone });
      void this.presence.put(s.spaceId, toRecord(s)); // persiste troca de zona na hora
      void this.issueMedia(s); // ponte de áudio: entra na room da nova zona
    }
  }

  @SubscribeMessage('request_media_token')
  async onRequestMediaToken(@ConnectedSocket() client: Socket): Promise<void> {
    const s = this.sessions.get(client.id);
    if (s) await this.issueMedia(s);
  }

  /**
   * Ponte de áudio por zona: emite `media_token` para a room da zona atual.
   * Zona sem áudio (corredor) ou fora de zona → room vazia (cliente desconecta).
   */
  private async issueMedia(s: Session): Promise<void> {
    const zone = zones.find((z) => z.id === s.zoneId);
    if (!zone || zone.audioMode !== 'ZONE') {
      s.socket.emit('media_token', { zoneId: s.zoneId ?? '', roomName: '', token: '', url: '' });
      return;
    }
    const roomName = zoneRoomName(s.spaceId, zone.id);
    const grant = await this.media.issue(roomName, s.userId, s.name);
    s.socket.emit('media_token', {
      zoneId: zone.id,
      roomName: grant.roomName,
      token: grant.token,
      url: grant.url,
    });
  }

  @SubscribeMessage('set_status')
  onSetStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { status: PresenceStatus },
  ): void {
    const s = this.sessions.get(client.id);
    if (!s) return;
    s.status = body.status;
    void this.presence.put(s.spaceId, toRecord(s));
    this.server
      .to(this.room(s.spaceId))
      .emit('status_changed', { userId: s.userId, status: s.status });
  }

  @SubscribeMessage('heartbeat')
  onHeartbeat(): void {
    // Mantido para TTL futuro; disconnect já limpa a presença.
  }

  handleDisconnect(client: Socket): void {
    const s = this.sessions.get(client.id);
    if (!s) return;
    this.sessions.delete(client.id);
    void this.presence.remove(s.spaceId, s.userId);
    this.server.to(this.room(s.spaceId)).emit('presence_leave', { userId: s.userId });
    this.logger.log(`disconnected ${client.id} (${s.name})`);
  }

  /** Agrega movimentos sujos e emite avatar_moved por space. */
  private flushTick(): void {
    const bySpace = new Map<string, Session[]>();
    for (const s of this.sessions.values()) {
      if (!s.dirty) continue;
      const list = bySpace.get(s.spaceId) ?? [];
      list.push(s);
      bySpace.set(s.spaceId, list);
    }
    for (const [spaceId, list] of bySpace) {
      const updates = list.map((s) => ({ userId: s.userId, x: s.x, y: s.y, dir: s.dir }));
      this.server.to(this.room(spaceId)).emit('avatar_moved', { updates });
      void this.presence.putMany(spaceId, list.map(toRecord));
      for (const s of list) s.dirty = false;
    }
  }

  private room(spaceId: string): string {
    return `space:${spaceId}`;
  }
}

function toRecord(s: Session): PresenceRecord {
  return {
    userId: s.userId,
    name: s.name,
    role: s.role,
    x: s.x,
    y: s.y,
    dir: s.dir,
    status: s.status,
    zoneId: s.zoneId,
  };
}

function toParticipant(r: PresenceRecord): Participant {
  return {
    userId: r.userId,
    name: r.name,
    role: r.role,
    position: { x: r.x, y: r.y },
    direction: r.dir,
    status: r.status,
    zoneId: r.zoneId,
  };
}
