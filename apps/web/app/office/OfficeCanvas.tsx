'use client';

import { useEffect, useRef, useState } from 'react';
import {
  DEMO_SPACE_ID,
  MAP_COLS,
  MAP_ROWS,
  STATUS_EMOJI,
  TILE_SIZE,
  buildOfficeTilemap,
  buildOfficeZones,
  isValidAvatarConfig,
  randomAvatarConfig,
  resolveZone,
  type AvatarConfig,
  type Direction,
  type MediaToken,
  type MoveUpdate,
  type Participant,
  type PresenceStatus,
  type SpaceState,
  type Zone,
} from '@uniteon/shared';
import { CollisionGrid, facingFrom, tryMove } from '@uniteon/game';
import { io, type Socket } from 'socket.io-client';
import type { Container, Graphics } from 'pixi.js';
import { authConfigured, getSupabase } from '../../lib/supabaseClient';

const SCALE = 2;
const SPEED = 2.4;
const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL ?? 'http://localhost:3002';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const ZONE_COLOR: Record<string, number> = {
  RECEPTION: 0x2f5d8a,
  HALLWAY: 0x3a3f4d,
  OFFICE: 0x2f7d5b,
  MEETING: 0x7d4f9c,
  LOUNGE: 0xb5793a,
};

const ZONES: Zone[] = buildOfficeZones();

const FACE_OFFSET: Record<Direction, [number, number]> = {
  down: [0, 6],
  up: [0, -6],
  left: [-6, 2],
  right: [6, 2],
};

const STATUS_COLOR: Record<PresenceStatus, number> = {
  WORKING: 0x35c46a,
  AWAY: 0xf2c14e,
  MEETING: 0xe5534b,
  OFFLINE: 0x8a90a6,
};

const STATUS_ORDER: PresenceStatus[] = ['WORKING', 'AWAY', 'MEETING', 'OFFLINE'];

interface OfficeApi {
  setStatus: (s: PresenceStatus) => void;
  toggleMic: () => void;
}

export function OfficeCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<OfficeApi | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);
  const [peers, setPeers] = useState(0);
  const [me, setMe] = useState('');
  const [ownStatus, setOwnStatus] = useState<PresenceStatus>('WORKING');
  const [muted, setMuted] = useState(true);
  const [audioRoom, setAudioRoom] = useState('');

  useEffect(() => {
    let destroyed = false;
    let cleanup = () => {};

    (async () => {
      const PIXI = await import('pixi.js');
      if (destroyed || !hostRef.current) return;

      // Identidade: Supabase Auth quando configurado; senão mock por ?name= (dev).
      let userId: string;
      let name: string;
      let token: string | null = null;
      let avatarConfig: AvatarConfig | undefined;
      if (authConfigured) {
        const supabase = getSupabase();
        const { data } = await supabase!.auth.getSession();
        if (destroyed) return;
        if (!data.session) {
          window.location.href = '/login';
          return;
        }
        userId = data.session.user.id;
        const meta = data.session.user.user_metadata as { name?: string } | undefined;
        name = meta?.name || data.session.user.email?.split('@')[0] || 'Colega';
        token = data.session.access_token;
        // Provisiona (upsert) usuário + membership no banco e busca o avatar salvo.
        try {
          const res = await fetch(`${API_URL}/me`, { headers: { Authorization: `Bearer ${token}` } });
          const profile = await res.json();
          if (isValidAvatarConfig(profile?.avatarConfig)) avatarConfig = profile.avatarConfig;
        } catch (e) {
          console.warn('[uniteon] /me falhou', e);
        }
      } else {
        const params = new URLSearchParams(window.location.search);
        name = params.get('name') ?? `Convidado-${Math.floor(1000 + Math.random() * 9000)}`;
        userId = params.get('name') ?? `u-${Math.random().toString(36).slice(2, 8)}`;
      }
      if (!avatarConfig) avatarConfig = randomAvatarConfig();
      setMe(name);

      const map = buildOfficeTilemap();
      const grid = CollisionGrid.fromTilemap(map);
      const mapW = MAP_COLS * TILE_SIZE;
      const mapH = MAP_ROWS * TILE_SIZE;

      const app = new PIXI.Application();
      await app.init({ background: 0x14161f, resizeTo: hostRef.current, antialias: true });
      if (destroyed) {
        app.destroy(true);
        return;
      }
      hostRef.current.appendChild(app.canvas);

      const world = new PIXI.Container();
      world.scale.set(SCALE);
      app.stage.addChild(world);

      // Piso + grade.
      const floor = new PIXI.Graphics();
      floor.rect(0, 0, mapW, mapH).fill(0x1b1e2b);
      for (let x = 0; x <= MAP_COLS; x++) floor.moveTo(x * TILE_SIZE, 0).lineTo(x * TILE_SIZE, mapH);
      for (let y = 0; y <= MAP_ROWS; y++) floor.moveTo(0, y * TILE_SIZE).lineTo(mapW, y * TILE_SIZE);
      floor.stroke({ width: 1, color: 0x262a3a });
      world.addChild(floor);

      // Zonas.
      for (const z of ZONES) {
        const g = new PIXI.Graphics();
        g.rect(z.bounds.x, z.bounds.y, z.bounds.w, z.bounds.h).fill({ color: ZONE_COLOR[z.type] ?? 0x445, alpha: 0.35 });
        g.rect(z.bounds.x, z.bounds.y, z.bounds.w, z.bounds.h).stroke({ width: 2, color: ZONE_COLOR[z.type] ?? 0x445, alpha: 0.9 });
        world.addChild(g);
        const label = new PIXI.Text({
          text: z.audioMode === 'NONE' ? `${z.name}  ·  sem áudio` : z.name,
          style: { fill: 0xdfe3ef, fontSize: 11, fontFamily: 'system-ui' },
        });
        label.x = z.bounds.x + 6;
        label.y = z.bounds.y + 4;
        world.addChild(label);
      }

      // Paredes.
      const walls = new PIXI.Graphics();
      for (let ty = 0; ty < MAP_ROWS; ty++) {
        for (let tx = 0; tx < MAP_COLS; tx++) {
          if (grid.isBlockedTile(tx, ty)) walls.rect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
      walls.fill(0x0c0e15);
      world.addChild(walls);

      // Fábrica de avatar (local e remoto).
      const makeAvatar = (label: string, bodyColor: number) => {
        const c = new PIXI.Container();
        const body = new PIXI.Graphics().circle(0, 0, 10).fill(bodyColor).stroke({ width: 2, color: 0x1a1a1a });
        const face = new PIXI.Graphics().circle(0, 0, 3).fill(0x1a1a1a);
        const tag = new PIXI.Text({ text: label, style: { fill: 0xffffff, fontSize: 10, fontFamily: 'system-ui' } });
        tag.anchor.set(0.5, 1);
        tag.y = -16;
        c.addChild(body, face, tag);
        world.addChild(c);
        return { c, face, tag };
      };

      const setFacing = (face: Graphics, dir: Direction) => {
        const [fx, fy] = FACE_OFFSET[dir];
        face.x = fx;
        face.y = fy;
      };

      // Avatar local.
      const meAv = makeAvatar(name, 0xffd27f);
      meAv.c.x = map.spawn.x;
      meAv.c.y = map.spawn.y;
      meAv.tag.style.fill = STATUS_COLOR.WORKING;
      let dir: Direction = 'down';

      // Avatares remotos.
      interface Remote {
        c: Container;
        face: Graphics;
        tag: import('pixi.js').Text;
        tx: number;
        ty: number;
        dir: Direction;
      }
      const remotes = new Map<string, Remote>();
      const upsertRemote = (p: Participant) => {
        if (p.userId === userId) return;
        let r = remotes.get(p.userId);
        if (!r) {
          const av = makeAvatar(p.name, 0x7fb0ff);
          r = { c: av.c, face: av.face, tag: av.tag, tx: p.position.x, ty: p.position.y, dir: p.direction };
          r.c.x = p.position.x;
          r.c.y = p.position.y;
          remotes.set(p.userId, r);
        } else {
          r.tx = p.position.x;
          r.ty = p.position.y;
          r.dir = p.direction;
        }
        r.tag.style.fill = STATUS_COLOR[p.status];
        setFacing(r.face, r.dir);
        setPeers(remotes.size);
      };
      const removeRemote = (id: string) => {
        const r = remotes.get(id);
        if (r) {
          world.removeChild(r.c);
          r.c.destroy({ children: true });
          remotes.delete(id);
          setPeers(remotes.size);
        }
      };

      // Socket realtime. Sem forçar transporte: deixa cair para polling se o
      // upgrade para WebSocket puro for bloqueado (proxy/antivírus locais).
      const socket: Socket = io(REALTIME_URL, {
        auth: token ? { token } : { devName: name, devUserId: userId },
      });
      socket.on('connect', () => socket.emit('join_space', { spaceId: DEMO_SPACE_ID, avatarConfig }));
      socket.on('connect_error', (err) => console.warn('[uniteon] socket connect_error:', err.message));
      socket.on('error_event', (e) => console.warn('[uniteon] server error_event:', e));
      socket.on('space_state', (s: SpaceState) => s.participants.forEach(upsertRemote));
      socket.on('presence_join', (p: Participant) => upsertRemote(p));
      socket.on('presence_leave', ({ userId: id }: { userId: string }) => removeRemote(id));
      socket.on('avatar_moved', ({ updates }: { updates: MoveUpdate[] }) => {
        for (const u of updates) {
          if (u.userId === userId) continue;
          const r = remotes.get(u.userId);
          if (r) {
            r.tx = u.x;
            r.ty = u.y;
            if (r.dir !== u.dir) {
              r.dir = u.dir;
              setFacing(r.face, r.dir);
            }
          }
        }
      });
      socket.on('status_changed', ({ userId: id, status }: { userId: string; status: PresenceStatus }) => {
        const r = remotes.get(id);
        if (r) r.tag.style.fill = STATUS_COLOR[status];
      });

      // Ponte de áudio por zona (LiveKit): conecta/desconecta a room conforme a zona.
      let muted = true;
      let currentRoom: import('livekit-client').Room | null = null;
      let currentRoomName = '';
      const audioEls = new Set<HTMLMediaElement>();

      const leaveRoom = async () => {
        if (currentRoom) {
          await currentRoom.disconnect();
          currentRoom = null;
        }
        currentRoomName = '';
        for (const el of audioEls) el.remove();
        audioEls.clear();
        setAudioRoom('');
      };

      const connectRoom = async (url: string, token: string, roomName: string) => {
        const LK = await import('livekit-client');
        const room = new LK.Room({ adaptiveStream: true, dynacast: true });
        room.on(LK.RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === 'audio') {
            const el = track.attach();
            el.autoplay = true;
            document.body.appendChild(el);
            audioEls.add(el);
          }
        });
        room.on(LK.RoomEvent.TrackUnsubscribed, (track) => {
          track.detach().forEach((el) => {
            el.remove();
            audioEls.delete(el as HTMLMediaElement);
          });
        });
        await room.connect(url, token);
        await room.localParticipant.setMicrophoneEnabled(!muted);
        currentRoom = room;
        currentRoomName = roomName;
        setAudioRoom(roomName);
      };

      socket.on('media_token', async ({ roomName, token, url }: MediaToken) => {
        // Zona sem áudio / sem credencial → desconecta.
        if (!roomName || !token || !url) {
          await leaveRoom();
          return;
        }
        if (roomName === currentRoomName) return;
        await leaveRoom();
        try {
          await connectRoom(url, token, roomName);
        } catch (e) {
          console.warn('[uniteon] LiveKit connect falhou', e);
        }
      });

      apiRef.current = {
        setStatus: (st) => {
          socket.emit('set_status', { status: st });
          setOwnStatus(st);
          meAv.tag.style.fill = STATUS_COLOR[st];
        },
        toggleMic: () => {
          muted = !muted;
          setMuted(muted);
          if (currentRoom) void currentRoom.localParticipant.setMicrophoneEnabled(!muted);
        },
      };

      // Input.
      const pressed = new Set<string>();
      const onKey = (e: KeyboardEvent, down: boolean) => {
        const k = e.key.toLowerCase();
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
          e.preventDefault();
          if (down) pressed.add(k);
          else pressed.delete(k);
        }
      };
      const kd = (e: KeyboardEvent) => onKey(e, true);
      const ku = (e: KeyboardEvent) => onKey(e, false);
      window.addEventListener('keydown', kd);
      window.addEventListener('keyup', ku);

      const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
      let currentZoneId: string | null = null;
      let lastEmit = 0;
      let lastSentX = -1;
      let lastSentY = -1;

      app.ticker.add(() => {
        let dx = 0;
        let dy = 0;
        if (pressed.has('arrowleft') || pressed.has('a')) dx -= 1;
        if (pressed.has('arrowright') || pressed.has('d')) dx += 1;
        if (pressed.has('arrowup') || pressed.has('w')) dy -= 1;
        if (pressed.has('arrowdown') || pressed.has('s')) dy += 1;

        if (dx !== 0 || dy !== 0) {
          const len = Math.hypot(dx, dy) || 1;
          const moved = tryMove({ x: meAv.c.x, y: meAv.c.y }, (dx / len) * SPEED, (dy / len) * SPEED, grid);
          meAv.c.x = moved.x;
          meAv.c.y = moved.y;
          dir = facingFrom(dx, dy, dir);
          setFacing(meAv.face, dir);
        }

        // Emite movimento (throttled ~tick) quando a posição muda.
        const now = performance.now();
        if ((meAv.c.x !== lastSentX || meAv.c.y !== lastSentY) && now - lastEmit >= 80) {
          socket.emit('move', { x: meAv.c.x, y: meAv.c.y, dir });
          lastEmit = now;
          lastSentX = meAv.c.x;
          lastSentY = meAv.c.y;
        }

        // Interpolação dos remotos.
        for (const r of remotes.values()) {
          r.c.x += (r.tx - r.c.x) * 0.25;
          r.c.y += (r.ty - r.c.y) * 0.25;
        }

        // Câmera.
        const sw = app.screen.width;
        const sh = app.screen.height;
        world.x = clamp(sw / 2 - meAv.c.x * SCALE, sw - mapW * SCALE, 0);
        world.y = clamp(sh / 2 - meAv.c.y * SCALE, sh - mapH * SCALE, 0);

        // Zona.
        const z = resolveZone({ x: meAv.c.x, y: meAv.c.y }, ZONES);
        if ((z?.id ?? null) !== currentZoneId) {
          currentZoneId = z?.id ?? null;
          setZone(z);
        }
      });

      if (process.env.NODE_ENV !== 'production') {
        (window as unknown as { __office?: unknown }).__office = {
          press: (k: string) => pressed.add(k),
          release: (k: string) => pressed.delete(k),
          clear: () => pressed.clear(),
          tick: (n = 1) => {
            for (let i = 0; i < n; i++) app.ticker.update(performance.now() + i * 16);
          },
          state: () => ({ x: meAv.c.x, y: meAv.c.y, dir, zone: currentZoneId }),
          connected: () => socket.connected,
          remotes: () =>
            [...remotes.entries()].map(([id, r]) => ({ id, x: Math.round(r.c.x), y: Math.round(r.c.y), tx: r.tx, ty: r.ty })),
          socketDebug: () => ({
            connected: socket.connected,
            disconnected: socket.disconnected,
            active: socket.active,
            id: socket.id,
            transport: (socket.io as unknown as { engine?: { transport?: { name?: string } } }).engine?.transport?.name,
            authConfigured,
            hasToken: Boolean(token),
            apiUrl: API_URL,
            realtimeUrl: REALTIME_URL,
          }),
        };
      }

      cleanup = () => {
        window.removeEventListener('keydown', kd);
        window.removeEventListener('keyup', ku);
        void leaveRoom();
        socket.disconnect();
        apiRef.current = null;
        app.destroy(true, { children: true });
      };
    })();

    return () => {
      destroyed = true;
      cleanup();
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={hostRef} style={{ width: '100%', height: '100%' }} />
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          padding: '8px 12px',
          borderRadius: 8,
          background: 'rgba(12,14,21,0.75)',
          color: '#e8eaf2',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 13,
          pointerEvents: 'none',
        }}
      >
        <div>
          <strong>{zone ? zone.name : 'Fora de zona'}</strong>
          {zone && (
            <span style={{ opacity: 0.7 }}> · {zone.audioMode === 'NONE' ? 'sem áudio' : 'áudio: nesta sala'}</span>
          )}
        </div>
        <div style={{ opacity: 0.65, marginTop: 4 }}>
          {me} · {peers} {peers === 1 ? 'colega' : 'colegas'} online
        </div>
        <div style={{ opacity: 0.5, marginTop: 2 }}>Mover: WASD ou setas</div>
      </div>

      {/* Barra de controles (status + mic) */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderRadius: 12,
          background: 'rgba(12,14,21,0.82)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            onClick={() => apiRef.current?.setStatus(s)}
            title={s}
            style={{
              fontSize: 18,
              lineHeight: 1,
              padding: '6px 8px',
              borderRadius: 8,
              cursor: 'pointer',
              border: ownStatus === s ? '2px solid #fff' : '2px solid transparent',
              background: ownStatus === s ? 'rgba(255,255,255,0.12)' : 'transparent',
            }}
          >
            {STATUS_EMOJI[s]}
          </button>
        ))}
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />
        <button
          onClick={() => apiRef.current?.toggleMic()}
          style={{
            fontSize: 14,
            padding: '8px 12px',
            borderRadius: 8,
            cursor: 'pointer',
            border: 'none',
            color: '#fff',
            background: muted ? '#e5534b' : '#2f7d5b',
          }}
        >
          {muted ? '🔇 Mic off' : '🎤 Mic on'}
        </button>
        <span style={{ color: '#aeb4c6', fontSize: 12, minWidth: 90 }}>
          {audioRoom ? 'áudio conectado' : 'sem áudio'}
        </span>
      </div>
    </div>
  );
}
