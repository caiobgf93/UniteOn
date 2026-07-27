/**
 * Mundo do servidor: autoridade de colisão e zona. Deriva tudo da mesma fonte
 * canônica (@uniteon/shared) que o cliente usa para renderizar.
 */
import { CollisionGrid, isFree } from '@uniteon/game';
import {
  buildOfficeTilemap,
  buildOfficeZones,
  resolveZone,
  type Zone,
} from '@uniteon/shared';

const map = buildOfficeTilemap();

export const grid = CollisionGrid.fromTilemap(map);
export const zones: Zone[] = buildOfficeZones();
export const spawn = map.spawn;
export const mapW = map.cols * map.tileSize;
export const mapH = map.rows * map.tileSize;

/** Posição válida = dentro do mapa e livre de colisão. */
export function isValidPosition(x: number, y: number): boolean {
  if (x < 0 || y < 0 || x > mapW || y > mapH) return false;
  return isFree(grid, x, y);
}

export function zoneIdAt(x: number, y: number): string | null {
  return resolveZone({ x, y }, zones)?.id ?? null;
}
