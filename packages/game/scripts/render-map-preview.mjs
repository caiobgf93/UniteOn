/**
 * Ferramenta de dev: renderiza um mapa Tiled JSON (todas as camadas, em
 * ordem) num único PNG, pra conferir visualmente sem precisar abrir o Tiled
 * ou rodar o app. Roda a partir de packages/game/scripts.
 *
 * Uso: node render-map-preview.mjs [caminho/do/mapa.json]
 * Saída: preview.local.png (gitignored — é só uma ferramenta de inspeção).
 */
import { PNG } from 'pngjs';
import { readFileSync, writeFileSync } from 'node:fs';

const mapPath = process.argv[2] ?? '../../../apps/web/public/assets/maps/office-01.json';
const map = JSON.parse(readFileSync(mapPath, 'utf8'));
const src = PNG.sync.read(
  readFileSync('../../../apps/web/public/assets/tilesets/kenney-roguelike-rpg/Spritesheet/roguelikeSheet_transparent.png'),
);

const ts = map.tilesets[0];
const pitch = ts.tilewidth + ts.spacing;
const COLS = ts.columns;
const T = ts.tilewidth;

const out = new PNG({ width: map.width * T, height: map.height * T });
out.data.fill(30); // fundo escuro pra ver contorno

function blit(gid, dx, dy) {
  if (!gid) return;
  const idx = gid - ts.firstgid;
  const col = idx % COLS;
  const row = Math.floor(idx / COLS);
  const sx = col * pitch;
  const sy = row * pitch;
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const si = ((sy + y) * src.width + (sx + x)) * 4;
      const a = src.data[si + 3];
      if (a === 0) continue;
      const di = ((dy + y) * out.width + (dx + x)) * 4;
      out.data[di] = src.data[si];
      out.data[di + 1] = src.data[si + 1];
      out.data[di + 2] = src.data[si + 2];
      out.data[di + 3] = 255;
    }
  }
}

for (const layer of map.layers) {
  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < map.width; tx++) {
      const gid = layer.data[ty * map.width + tx];
      blit(gid, tx * T, ty * T);
    }
  }
}

writeFileSync('preview.local.png', PNG.sync.write(out));
console.log('preview gerado: preview.local.png', out.width + 'x' + out.height);
