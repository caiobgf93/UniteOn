/**
 * Compositor de avatar (Passo 4 do upgrade visual). Empilha as camadas LPC
 * (corpo, pernas, pés, torso, cabelo, óculos — ver avatarLayerFiles em
 * @uniteon/shared) num único PIXI.Container, e anima idle/andar nas 4
 * direções recortando frames de 64×64 das planilhas já preparadas no
 * Passo 1. Não depende de React/Next — reusável por qualquer renderer Pixi.
 */
import { Assets, Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { avatarLayerFiles, type AvatarConfig, type Direction } from '@uniteon/shared';

const FRAME = 64;
/** Ordem de linhas da planilha LPC — padrão do projeto, não é arbitrário. */
const DIR_ROW: Record<Direction, number> = { up: 0, left: 1, down: 2, right: 3 };

const WALK_FPS = 8;
const IDLE_FPS = 2;

type FrameGrid = Texture[][]; // [row 0-3][coluna 0..N-1]

function sliceGrid(base: Texture): FrameGrid {
  const cols = Math.max(1, Math.round(base.width / FRAME));
  const grid: FrameGrid = [];
  for (let row = 0; row < 4; row++) {
    const rowFrames: Texture[] = [];
    for (let col = 0; col < cols; col++) {
      rowFrames.push(
        new Texture({ source: base.source, frame: new Rectangle(col * FRAME, row * FRAME, FRAME, FRAME) }),
      );
    }
    grid.push(rowFrames);
  }
  return grid;
}

interface LayerAnim {
  sprite: Sprite;
  walk: FrameGrid;
  idle: FrameGrid;
}

/**
 * Avatar animado composto por camadas. Uso:
 *   const av = await AvatarSprite.create(config, '/assets/');
 *   world.addChild(av.view);
 *   // no ticker: av.update(deltaMS)
 *   av.setDirection('left'); av.setMoving(true);
 */
export class AvatarSprite {
  readonly view: Container;
  private layers: LayerAnim[] = [];
  private dir: Direction = 'down';
  private moving = false;
  private frameTime = 0;
  private frameIndex = 0;

  private constructor() {
    this.view = new Container();
  }

  /** `baseUrl` é prefixado nos caminhos de `avatarLayerFiles` (ex.: '/assets/'). */
  static async create(config: AvatarConfig, baseUrl = '/assets/'): Promise<AvatarSprite> {
    const av = new AvatarSprite();
    const walkFiles = avatarLayerFiles(config, 'walk');
    const idleFiles = avatarLayerFiles(config, 'idle');

    for (let i = 0; i < walkFiles.length; i++) {
      try {
        const [walkTex, idleTex] = await Promise.all([
          Assets.load<Texture>(baseUrl + walkFiles[i]),
          Assets.load<Texture>(baseUrl + idleFiles[i]),
        ]);
        const walk = sliceGrid(walkTex);
        const idle = sliceGrid(idleTex);
        const sprite = new Sprite(idle[DIR_ROW.down]![0]);
        sprite.anchor.set(0.5, 0.85); // pés perto da base do frame, ancorados no chão
        av.view.addChild(sprite);
        av.layers.push({ sprite, walk, idle });
      } catch (err) {
        // Uma camada faltando não deve derrubar o avatar inteiro.
        // eslint-disable-next-line no-console
        console.warn('[uniteon] falha ao carregar camada de avatar:', walkFiles[i], err);
      }
    }
    av.applyFrame();
    return av;
  }

  setDirection(dir: Direction): void {
    if (this.dir === dir) return;
    this.dir = dir;
    this.applyFrame();
  }

  setMoving(moving: boolean): void {
    if (this.moving === moving) return;
    this.moving = moving;
    this.frameIndex = 0;
    this.frameTime = 0;
    this.applyFrame();
  }

  /** Chamar a cada tick do PIXI.Ticker com o deltaMS do frame. */
  update(deltaMS: number): void {
    const fps = this.moving ? WALK_FPS : IDLE_FPS;
    this.frameTime += deltaMS;
    const frameDuration = 1000 / fps;
    if (this.frameTime < frameDuration) return;
    this.frameTime -= frameDuration;
    const first = this.layers[0];
    const cols = first ? (this.moving ? first.walk : first.idle)[0]!.length : 1;
    this.frameIndex = (this.frameIndex + 1) % cols;
    this.applyFrame();
  }

  private applyFrame(): void {
    const row = DIR_ROW[this.dir];
    for (const layer of this.layers) {
      const grid = this.moving ? layer.walk : layer.idle;
      const frames = grid[row]!;
      layer.sprite.texture = frames[this.frameIndex % frames.length]!;
    }
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}
