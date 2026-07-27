/**
 * Tipos de domínio compartilhados entre web, api e realtime.
 * Fonte única da verdade para enums e formas de dados que cruzam a fronteira
 * cliente/servidor.
 */

export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'GESTOR'
  | 'COLABORADOR'
  | 'VISITANTE';

/** Status de presença exibido no avatar. */
export type PresenceStatus = 'WORKING' | 'AWAY' | 'MEETING' | 'OFFLINE';

export const STATUS_EMOJI: Record<PresenceStatus, string> = {
  WORKING: '🟢',
  AWAY: '🟡',
  MEETING: '🔴',
  OFFLINE: '🌙',
};

export type ZoneType =
  | 'RECEPTION'
  | 'HALLWAY'
  | 'OFFICE'
  | 'MEETING'
  | 'LOUNGE'
  | 'OPEN';

/** Como o áudio se comporta numa zona. ZONE = uma media room por zona. */
export type AudioMode = 'ZONE' | 'NONE';

export type Direction = 'down' | 'up' | 'left' | 'right';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Zone {
  id: string;
  name: string;
  type: ZoneType;
  bounds: Rect;
  audioMode: AudioMode;
}

export interface InteractiveObjectDTO {
  id: string;
  type: string;
  x: number;
  y: number;
  config: Record<string, unknown>;
}

/** Estado público de um participante no espaço (o que os outros veem). */
export interface Participant {
  userId: string;
  name: string;
  role: Role;
  position: Vec2;
  direction: Direction;
  status: PresenceStatus;
  zoneId: string | null;
}

/** Identidade autenticada carregada no JWT. */
export interface AuthContext {
  userId: string;
  organizationId: string;
  membershipId: string;
  role: Role;
}
