/**
 * @uniteon/game — lógica de mundo pura (sem PixiJS, sem React), reutilizável no
 * cliente (render/predição) e no servidor (autoridade). O render Pixi vive em
 * apps/web. Ver docs/DOMAIN-MODEL.md.
 */
import type { Direction, Vec2 } from '@uniteon/shared';
import { TILE_SIZE } from '@uniteon/shared';

export { TILE_SIZE };

export function tileToPixel(tx: number, ty: number): Vec2 {
  return { x: tx * TILE_SIZE, y: ty * TILE_SIZE };
}

export function pixelToTile(x: number, y: number): Vec2 {
  return { x: Math.floor(x / TILE_SIZE), y: Math.floor(y / TILE_SIZE) };
}

/** Grade de colisão: 1 = bloqueado. */
export class CollisionGrid {
  constructor(
    readonly cols: number,
    readonly rows: number,
    private readonly blocked: ReadonlyArray<number>,
  ) {}

  static fromTilemap(map: {
    cols: number;
    rows: number;
    layers: { collision: number[] };
  }): CollisionGrid {
    return new CollisionGrid(map.cols, map.rows, map.layers.collision);
  }

  isBlockedTile(tx: number, ty: number): boolean {
    if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return true;
    return this.blocked[ty * this.cols + tx] === 1;
  }

  isBlockedPixel(x: number, y: number): boolean {
    const t = pixelToTile(x, y);
    return this.isBlockedTile(t.x, t.y);
  }
}

/** true se a caixa (centro ± half) colide com algum tile bloqueado. */
function boxBlocked(grid: CollisionGrid, cx: number, cy: number, half: number): boolean {
  return (
    grid.isBlockedPixel(cx - half, cy - half) ||
    grid.isBlockedPixel(cx + half, cy - half) ||
    grid.isBlockedPixel(cx - half, cy + half) ||
    grid.isBlockedPixel(cx + half, cy + half)
  );
}

/** true se a posição (centro do avatar) é livre de colisão. Usado pela autoridade do servidor. */
export function isFree(grid: CollisionGrid, x: number, y: number, half = 10): boolean {
  return !boxBlocked(grid, x, y, half);
}

/**
 * Move com colisão por eixo (permite "deslizar" na parede). Retorna a nova
 * posição válida. `half` é o meio-tamanho da caixa do avatar (pixels).
 */
export function tryMove(
  pos: Vec2,
  dx: number,
  dy: number,
  grid: CollisionGrid,
  half = 10,
): Vec2 {
  let { x, y } = pos;
  if (dx !== 0 && !boxBlocked(grid, x + dx, y, half)) x += dx;
  if (dy !== 0 && !boxBlocked(grid, x, y + dy, half)) y += dy;
  return { x, y };
}

/** Direção de facing a partir do vetor de movimento (prioriza o eixo dominante). */
export function facingFrom(dx: number, dy: number, current: Direction): Direction {
  if (dx === 0 && dy === 0) return current;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}
