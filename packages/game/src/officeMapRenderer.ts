/**
 * Carrega e renderiza o mapa Tiled JSON gerado no Passo 2
 * (packages/game/scripts/build-office-map.mjs) — piso, paredes e móveis
 * reais no lugar dos retângulos do Passo 7. A área em pixels do mapa (tiles
 * de 16px) é EXATAMENTE a mesma do grid lógico de colisão (32px) usado por
 * CollisionGrid/tryMove — nenhuma escala extra é necessária ao encaixar o
 * container retornado no world existente.
 */
import { Assets, Container, Rectangle, Sprite, Texture } from 'pixi.js';

interface TiledTileset {
  firstgid: number;
  image: string;
  tilewidth: number;
  tileheight: number;
  spacing: number;
  columns: number;
}

interface TiledLayer {
  name: string;
  type: string;
  width: number;
  height: number;
  data: number[];
  visible: boolean;
}

interface TiledMapJson {
  width: number;
  height: number;
  tilesets: TiledTileset[];
  layers: TiledLayer[];
}

/**
 * Busca `mapUrl` (JSON do Tiled) e monta um Container com uma camada por
 * layer do mapa (Floor, Walls, Furniture), na ordem em que aparecem no
 * arquivo. O caminho da imagem do tileset é resolvido relativo à URL do
 * próprio mapa (mesma convenção do Tiled).
 */
export async function loadOfficeMap(mapUrl: string): Promise<Container> {
  const res = await fetch(mapUrl);
  const map = (await res.json()) as TiledMapJson;
  const ts = map.tilesets[0];
  if (!ts) throw new Error(`Mapa sem tileset: ${mapUrl}`);

  // `new URL(rel, base)` exige que `base` seja absoluta (com origem) — se
  // `mapUrl` vier como caminho relativo (ex.: "/assets/maps/x.json"), resolve
  // primeiro contra a origem da página atual.
  const absoluteMapUrl = new URL(mapUrl, window.location.origin).href;
  const tilesetUrl = new URL(ts.image, absoluteMapUrl).href;
  const baseTexture = await Assets.load<Texture>(tilesetUrl);

  const pitch = ts.tilewidth + ts.spacing;
  const frameCache = new Map<number, Texture>();
  const tileTexture = (gid: number): Texture => {
    let tex = frameCache.get(gid);
    if (!tex) {
      const idx = gid - ts.firstgid;
      const col = idx % ts.columns;
      const row = Math.floor(idx / ts.columns);
      tex = new Texture({
        source: baseTexture.source,
        frame: new Rectangle(col * pitch, row * pitch, ts.tilewidth, ts.tileheight),
      });
      frameCache.set(gid, tex);
    }
    return tex;
  };

  const root = new Container();
  for (const layer of map.layers) {
    if (layer.type !== 'tilelayer' || !layer.visible) continue;
    const layerContainer = new Container();
    layerContainer.label = layer.name;
    for (let ty = 0; ty < layer.height; ty++) {
      for (let tx = 0; tx < layer.width; tx++) {
        const gid = layer.data[ty * layer.width + tx];
        if (!gid) continue;
        const sprite = new Sprite(tileTexture(gid));
        sprite.x = tx * ts.tilewidth;
        sprite.y = ty * ts.tileheight;
        layerContainer.addChild(sprite);
      }
    }
    root.addChild(layerContainer);
  }
  return root;
}
