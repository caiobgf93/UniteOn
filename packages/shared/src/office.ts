/**
 * Mapa canônico do escritório inicial (MVP-0). Fonte única consumida tanto pelo
 * seed do banco (apps/api) quanto pelo cliente (apps/web) — assim o mundo
 * renderizado é exatamente o mundo persistido.
 *
 * Unidades: TILES no grid; `bounds` das zonas em PIXELS. Grid 40×30, tile 32px.
 *
 * Planta (visão de cima):
 *   ┌──────────────── Recepção ─────────────────┐
 *   ├───────────── Corredor (sem áudio) ─────────┤
 *   │ Esc. Caio │ Esc. Vinicius │ Sala de Reunião │
 *   └───────────────── Lounge / Café ────────────┘
 */
import type { AudioMode, Rect, Zone, ZoneType } from './domain';

export const TILE_SIZE = 32;
export const MAP_COLS = 40;
export const MAP_ROWS = 30;

/** Space lógico do MVP-0 (antes de persistir spaces reais no Épico 0). */
export const DEMO_SPACE_ID = 'locuslog-hq';

const t = (n: number): number => n * TILE_SIZE;

export interface OfficeZone {
  name: string;
  type: ZoneType;
  audioMode: AudioMode;
  bounds: Rect; // pixels
}

export const OFFICE_ZONES: OfficeZone[] = [
  { name: 'Recepção', type: 'RECEPTION', audioMode: 'ZONE', bounds: { x: t(0), y: t(0), w: t(40), h: t(6) } },
  { name: 'Corredor principal', type: 'HALLWAY', audioMode: 'NONE', bounds: { x: t(0), y: t(6), w: t(40), h: t(4) } },
  { name: 'Escritório do Caio', type: 'OFFICE', audioMode: 'ZONE', bounds: { x: t(0), y: t(10), w: t(13), h: t(12) } },
  { name: 'Escritório do Vinicius', type: 'OFFICE', audioMode: 'ZONE', bounds: { x: t(13), y: t(10), w: t(13), h: t(12) } },
  { name: 'Sala de Reunião', type: 'MEETING', audioMode: 'ZONE', bounds: { x: t(26), y: t(10), w: t(14), h: t(12) } },
  { name: 'Lounge / Café', type: 'LOUNGE', audioMode: 'ZONE', bounds: { x: t(0), y: t(22), w: t(40), h: t(8) } },
];

/**
 * Zonas com ids determinísticos (`z0`..`zN`), na ordem de OFFICE_ZONES. Cliente e
 * servidor chamam esta função → os ids batem sem precisar sincronizar via rede.
 */
export function buildOfficeZones(): Zone[] {
  return OFFICE_ZONES.map((z, i) => ({
    id: `z${i}`,
    name: z.name,
    type: z.type,
    bounds: z.bounds,
    audioMode: z.audioMode,
  }));
}

export interface Tilemap {
  version: number;
  tileSize: number;
  cols: number;
  rows: number;
  layers: {
    floor: number[];
    collision: number[]; // 1 = bloqueado
  };
  spawn: { x: number; y: number };
}

/**
 * Constrói o tilemap: piso preenchido, paredes externas, e paredes internas
 * separando recepção/corredor/escritórios/lounge com **vãos de porta** para
 * a navegação entre zonas fazer sentido.
 */
export function buildOfficeTilemap(): Tilemap {
  const floor = new Array(MAP_ROWS * MAP_COLS).fill(1);
  const collision = new Array(MAP_ROWS * MAP_COLS).fill(0);

  const set = (x: number, y: number): void => {
    if (x >= 0 && y >= 0 && x < MAP_COLS && y < MAP_ROWS) collision[y * MAP_COLS + x] = 1;
  };
  const hWall = (y: number, doors: number[]): void => {
    for (let x = 1; x < MAP_COLS - 1; x++) if (!doors.includes(x)) set(x, y);
  };
  const vWall = (x: number, y0: number, y1: number, doors: number[] = []): void => {
    for (let y = y0; y <= y1; y++) if (!doors.includes(y)) set(x, y);
  };

  // Bordas externas.
  for (let x = 0; x < MAP_COLS; x++) {
    set(x, 0);
    set(x, MAP_ROWS - 1);
  }
  for (let y = 0; y < MAP_ROWS; y++) {
    set(0, y);
    set(MAP_COLS - 1, y);
  }

  // Recepção → corredor (porta central).
  hWall(6, [19, 20]);
  // Corredor → escritórios (uma porta por escritório).
  hWall(10, [6, 7, 19, 20, 31, 32]);
  // Escritórios → lounge (uma porta por escritório).
  hWall(22, [6, 7, 19, 20, 31, 32]);
  // Divisórias verticais entre os três escritórios (sem porta: troca pelo corredor).
  vWall(13, 11, 21);
  vWall(26, 11, 21);

  return {
    version: 1,
    tileSize: TILE_SIZE,
    cols: MAP_COLS,
    rows: MAP_ROWS,
    layers: { floor, collision },
    spawn: { x: t(20), y: t(3) }, // recepção
  };
}
