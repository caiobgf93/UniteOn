/**
 * Runner do pipeline de assets do avatar (LPC). Lê os PNGs baixados em
 * apps/web/public/assets/.stage/ e gera as variantes finais em
 * apps/web/public/assets/sprites/avatars/<layer>/<estilo>/<cor>/{walk,idle}.png
 *
 * Rodar de novo sempre que adicionar um estilo/cor novo — idempotente
 * (sobrescreve a saída). Não roda no CI/build da aplicação.
 */
import { recolor, copyAsIs } from './lpc-recolor.mjs';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(here, '..', '..', '..', 'apps', 'web', 'public', 'assets');
const STAGE = join(ASSETS, '.stage');
const OUT = join(ASSETS, 'sprites', 'avatars');

const readJson = (name) => JSON.parse(readFileSync(join(STAGE, name), 'utf8'));
const bodyRamps = readJson('body_ulpc.json');
const hairRamps = readJson('hair_ulpc.json');
const clothRamps = readJson('cloth_ulpc.json');

const SHEETS = ['walk', 'idle'];

function generate(layer, style, baseFile, baseColorName, ramps, targetColors) {
  for (const sheet of SHEETS) {
    const src = join(STAGE, `${baseFile}_${sheet}.png`);
    for (const color of targetColors) {
      const dest = join(OUT, layer, style, color, `${sheet}.png`);
      if (color === baseColorName) {
        copyAsIs(src, dest);
      } else {
        recolor(src, dest, ramps[baseColorName], ramps[color]);
      }
    }
  }
  console.log(`[ok] ${layer}/${style}: ${targetColors.join(', ')}`);
}

// --- Corpo (skin tones) — base "light" ---
generate('body', 'male', 'body_male', 'light', bodyRamps, ['light', 'amber', 'olive', 'brown', 'black']);

// --- Cabelo — base "orange" ---
const HAIR_COLORS = ['blonde', 'light_brown', 'dark_brown', 'ginger', 'black'];
generate('hair', 'long', 'hair_long', 'orange', hairRamps, HAIR_COLORS);
generate('hair', 'bob', 'hair_bob', 'orange', hairRamps, HAIR_COLORS);
generate('hair', 'pixie', 'hair_pixie', 'orange', hairRamps, HAIR_COLORS);

// --- Torso (roupas) — base "white", só a cor base por enquanto ---
generate('torso', 'tshirt', 'torso_tshirt', 'white', clothRamps, ['white']);
generate('torso', 'polo', 'torso_polo', 'white', clothRamps, ['white']);

// --- Pernas (calça) — base "white" + 1 recolor pra preto ---
generate('legs', 'pants', 'legs_pants', 'white', clothRamps, ['white', 'black']);

// --- Pés (sapato) — só a cor base ---
generate('feet', 'shoes', 'feet_shoes', 'white', clothRamps, ['white']);

// --- Óculos — sem recolor, cor original ---
copyAsIs(join(STAGE, 'glasses_glasses_walk.png'), join(OUT, 'glasses', 'glasses', 'default', 'walk.png'));
copyAsIs(join(STAGE, 'glasses_glasses_idle.png'), join(OUT, 'glasses', 'glasses', 'default', 'idle.png'));
copyAsIs(join(STAGE, 'glasses_round_walk.png'), join(OUT, 'glasses', 'round', 'default', 'walk.png'));
copyAsIs(join(STAGE, 'glasses_round_idle.png'), join(OUT, 'glasses', 'round', 'default', 'idle.png'));
console.log('[ok] glasses/glasses, glasses/round: default');

console.log('\nPipeline concluído.');
