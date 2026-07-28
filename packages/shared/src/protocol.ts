/**
 * Contrato do protocolo realtime (Socket.IO). Client↔Server tipados.
 * Ver docs/REALTIME-PROTOCOL.md.
 */
import type {
  Direction,
  InteractiveObjectDTO,
  Participant,
  PresenceStatus,
  Vec2,
  Zone,
} from './domain';
import type { AvatarConfig } from './avatar';

export const TICK_HZ = 12;
export const TICK_MS = Math.round(1000 / TICK_HZ);

/** Eventos emitidos pelo cliente. */
export interface ClientToServerEvents {
  join_space: (p: { spaceId: string; avatarConfig?: AvatarConfig }) => void;
  move: (p: { x: number; y: number; dir: Direction }) => void;
  set_status: (p: { status: PresenceStatus }) => void;
  set_avatar: (p: { avatarConfig: AvatarConfig }) => void;
  chat_send: (p: { channelId: string; body: string }) => void;
  interact_object: (p: { objectId: string }) => void;
  request_media_token: (p: { zoneId: string }) => void;
  heartbeat: () => void;
}

/** Snapshot inicial ao entrar num espaço. */
export interface SpaceState {
  spaceId: string;
  layoutRef: string;
  zones: Zone[];
  objects: InteractiveObjectDTO[];
  participants: Participant[];
}

export interface MoveUpdate {
  userId: string;
  x: number;
  y: number;
  dir: Direction;
}

export interface MediaToken {
  zoneId: string;
  roomName: string;
  token: string;
  url: string;
}

/** Eventos emitidos pelo servidor. */
export interface ServerToClientEvents {
  space_state: (s: SpaceState) => void;
  presence_join: (p: Participant) => void;
  presence_leave: (p: { userId: string }) => void;
  avatar_moved: (p: { updates: MoveUpdate[] }) => void;
  status_changed: (p: { userId: string; status: PresenceStatus }) => void;
  avatar_changed: (p: { userId: string; avatarConfig: AvatarConfig }) => void;
  zone_changed: (p: {
    userId: string;
    fromZoneId: string | null;
    toZoneId: string | null;
  }) => void;
  media_token: (t: MediaToken) => void;
  chat_message: (m: {
    channelId: string;
    senderId: string;
    body: string;
    createdAt: string;
  }) => void;
  object_state: (p: { objectId: string; state: Record<string, unknown> }) => void;
  error_event: (p: { code: string; message: string }) => void;
}

/** Nome canônico da media room de uma zona (usado por LiveKit). */
export function zoneRoomName(spaceId: string, zoneId: string): string {
  return `space:${spaceId}:zone:${zoneId}`;
}

/** Resolve qual zona contém uma posição (primeira que a contém). */
export function resolveZone(position: Vec2, zones: Zone[]): Zone | null {
  for (const z of zones) {
    const { x, y, w, h } = z.bounds;
    if (
      position.x >= x &&
      position.x < x + w &&
      position.y >= y &&
      position.y < y + h
    ) {
      return z;
    }
  }
  return null;
}
