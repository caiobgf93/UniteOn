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
import { AvatarSprite, CollisionGrid, facingFrom, loadOfficeMap, tryMove } from '@uniteon/game';
import { io, type Socket } from 'socket.io-client';
import type { Container, Text } from 'pixi.js';
import { authConfigured, getSupabase } from '../../lib/supabaseClient';

const ASSETS_BASE = '/assets/';

const SCALE = 2;
const SPEED = 2.4;
const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL ?? 'http://localhost:3002';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const ZONES: Zone[] = buildOfficeZones();

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
      // Não usamos clique/hover em objetos do mundo — desativa o hit-testing
      // de ponteiro do Pixi (evita um bug de compatibilidade do EventBoundary
      // nesta versão: "currentTarget.isInteractive is not a function").
      app.stage.eventMode = 'none';
      app.stage.interactiveChildren = false;

      const world = new PIXI.Container();
      world.scale.set(SCALE);
      app.stage.addChild(world);

      // Mapa real (piso/paredes/móveis) — gerado no Passo 2 a partir da mesma
      // fonte de zonas/colisão do @uniteon/shared. A área em pixels do mapa
      // (tiles de 16px) já é idêntica à do grid lógico (32px) — sem escala extra.
      try {
        const officeMap = await loadOfficeMap(`${ASSETS_BASE}maps/office-01.json`);
        if (destroyed) {
          app.destroy(true);
          return;
        }
        world.addChild(officeMap);
      } catch (err) {
        // Sem isso, uma falha aqui trava o carregamento em silêncio (a
        // promise rejeitada nunca é observada) e a cena nunca aparece.
        console.error('[uniteon] loadOfficeMap falhou:', err);
      }

      // Cria um "outer" container (posição/nametag) + o compositor de camadas
      // do avatar dentro dele. Usado tanto pro avatar local quanto remotos.
      const makeAvatarShell = (label: string) => {
        const outer = new PIXI.Container();
        // Sombra elíptica sob os pés — dá noção de profundidade (o avatar
        // "pisa" no chão em vez de flutuar sobre o tile).
        const shadow = new PIXI.Graphics().ellipse(0, 2, 11, 4).fill({ color: 0x000000, alpha: 0.35 });
        outer.addChild(shadow);
        const tag = new PIXI.Text({ text: label, style: { fill: 0xffffff, fontSize: 10, fontFamily: 'system-ui' } });
        tag.anchor.set(0.5, 1);
        tag.y = -58; // acima da cabeça (frame de 64px, ancorado em 0.85 vertical)
        outer.addChild(tag);
        world.addChild(outer);
        return { outer, tag };
      };

      // Avatar local.
      const meShell = makeAvatarShell(name);
      meShell.outer.x = map.spawn.x;
      meShell.outer.y = map.spawn.y;
      meShell.tag.style.fill = STATUS_COLOR.WORKING;
      let dir: Direction = 'down';
      const meAvatar = await AvatarSprite.create(avatarConfig, ASSETS_BASE);
      if (destroyed) {
        meAvatar.destroy();
        return;
      }
      meShell.outer.addChildAt(meAvatar.view, 1); // acima da sombra, atrás do nametag

      // Avatares remotos.
      interface Remote {
        outer: Container;
        tag: Text;
        avatar: AvatarSprite | null;
        tx: number;
        ty: number;
        dir: Direction;
      }
      const remotes = new Map<string, Remote>();
      const upsertRemote = (p: Participant) => {
        if (p.userId === userId) return;
        let r = remotes.get(p.userId);
        if (!r) {
          const shell = makeAvatarShell(p.name);
          shell.outer.x = p.position.x;
          shell.outer.y = p.position.y;
          r = { outer: shell.outer, tag: shell.tag, avatar: null, tx: p.position.x, ty: p.position.y, dir: p.direction };
          remotes.set(p.userId, r);
          setPeers(remotes.size);
          const rec = r;
          AvatarSprite.create(p.avatarConfig, ASSETS_BASE).then((av) => {
            // Se o participante saiu enquanto a textura carregava, descarta.
            if (remotes.get(p.userId) !== rec) {
              av.destroy();
              return;
            }
            av.setDirection(rec.dir);
            rec.avatar = av;
            rec.outer.addChildAt(av.view, 1);
          });
        } else {
          r.tx = p.position.x;
          r.ty = p.position.y;
          r.dir = p.direction;
          r.avatar?.setDirection(r.dir);
        }
        r.tag.style.fill = STATUS_COLOR[p.status];
        setPeers(remotes.size);
      };
      const removeRemote = (id: string) => {
        const r = remotes.get(id);
        if (r) {
          world.removeChild(r.outer);
          r.avatar?.destroy();
          r.outer.destroy({ children: true });
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
              r.avatar?.setDirection(r.dir);
            }
          }
        }
      });
      socket.on('status_changed', ({ userId: id, status }: { userId: string; status: PresenceStatus }) => {
        const r = remotes.get(id);
        if (r) r.tag.style.fill = STATUS_COLOR[status];
      });
      socket.on('avatar_changed', ({ userId: id, avatarConfig: cfg }: { userId: string; avatarConfig: AvatarConfig }) => {
        const r = remotes.get(id);
        if (!r) return;
        const oldAvatar = r.avatar;
        AvatarSprite.create(cfg, ASSETS_BASE).then((av) => {
          if (remotes.get(id) !== r) {
            av.destroy();
            return;
          }
          av.setDirection(r.dir);
          r.avatar = av;
          r.outer.addChildAt(av.view, 1);
          oldAvatar?.destroy();
        });
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
          meShell.tag.style.fill = STATUS_COLOR[st];
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
        const isMoving = dx !== 0 || dy !== 0;

        if (isMoving) {
          const len = Math.hypot(dx, dy) || 1;
          const moved = tryMove(
            { x: meShell.outer.x, y: meShell.outer.y },
            (dx / len) * SPEED,
            (dy / len) * SPEED,
            grid,
          );
          meShell.outer.x = moved.x;
          meShell.outer.y = moved.y;
          dir = facingFrom(dx, dy, dir);
        }
        meAvatar.setDirection(dir);
        meAvatar.setMoving(isMoving);
        meAvatar.update(app.ticker.deltaMS);

        // Emite movimento (throttled ~tick) quando a posição muda.
        const now = performance.now();
        if ((meShell.outer.x !== lastSentX || meShell.outer.y !== lastSentY) && now - lastEmit >= 80) {
          socket.emit('move', { x: meShell.outer.x, y: meShell.outer.y, dir });
          lastEmit = now;
          lastSentX = meShell.outer.x;
          lastSentY = meShell.outer.y;
        }

        // Interpolação + animação dos remotos.
        for (const r of remotes.values()) {
          const rdx = r.tx - r.outer.x;
          const rdy = r.ty - r.outer.y;
          r.outer.x += rdx * 0.25;
          r.outer.y += rdy * 0.25;
          if (r.avatar) {
            r.avatar.setMoving(Math.hypot(rdx, rdy) > 0.5);
            r.avatar.update(app.ticker.deltaMS);
          }
        }

        // Câmera (segue o avatar local com suavização, em vez de grudar
        // instantaneamente — mais parecido com o "follow" do Gather).
        const sw = app.screen.width;
        const sh = app.screen.height;
        const targetX = clamp(sw / 2 - meShell.outer.x * SCALE, sw - mapW * SCALE, 0);
        const targetY = clamp(sh / 2 - meShell.outer.y * SCALE, sh - mapH * SCALE, 0);
        world.x += (targetX - world.x) * 0.12;
        world.y += (targetY - world.y) * 0.12;

        // Zona.
        const z = resolveZone({ x: meShell.outer.x, y: meShell.outer.y }, ZONES);
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
          state: () => ({ x: meShell.outer.x, y: meShell.outer.y, dir, zone: currentZoneId }),
          worldDebug: () => ({
            worldChildren: world.children.length,
            worldChildLabels: world.children.map((c) => c.label),
            worldX: world.x,
            worldY: world.y,
            worldScale: world.scale.x,
            stageChildren: app.stage.children.length,
            firstChildInfo: world.children[0]
              ? {
                  visible: world.children[0].visible,
                  alpha: world.children[0].alpha,
                  childCount: world.children[0].children.length,
                  layerLabels: world.children[0].children.map((c) => c.label),
                  layerCounts: world.children[0].children.map((c) => c.children.length),
                  bounds: world.children[0].getBounds(),
                }
              : null,
          }),
          connected: () => socket.connected,
          remotes: () =>
            [...remotes.entries()].map(([id, r]) => ({ id, x: Math.round(r.outer.x), y: Math.round(r.outer.y), tx: r.tx, ty: r.ty })),
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
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />
        <button
          onClick={() => (window.location.href = '/avatar?returnTo=/office')}
          title="Editar avatar"
          style={{
            fontSize: 13,
            padding: '8px 12px',
            borderRadius: 8,
            cursor: 'pointer',
            border: '1px solid #3a4056',
            color: '#e8eaf2',
            background: 'transparent',
          }}
        >
          🧍 Avatar
        </button>
      </div>
    </div>
  );
}
