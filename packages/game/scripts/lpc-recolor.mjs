/**
 * Ferramenta de preparo de assets (roda uma vez, offline — não faz parte do
 * runtime da aplicação). Aplica o mesmo sistema de "recolor por paleta" do
 * projeto LPC (ver PALETTE_RECOLOR_GUIDE.md no repo oficial), mas de forma
 * pré-calculada: cada pixel do PNG-base é comparado (com tolerância) contra
 * o ramp de cor de referência e substituído pela cor correspondente no ramp
 * alvo, gerando um arquivo estático por combinação — sem precisar de
 * recolorização em tempo real no navegador.
 *
 * Uso: node --experimental-vm-modules lpc-recolor.mjs (chamado pelo runner
 * abaixo, que já define os jobs de body/hair/torso/legs).
 */
import { PNG } from 'pngjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const TOLERANCE = 6; // por canal RGB — cobre pequenas variações de anti-aliasing

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function closeEnough(r, g, b, target, tol) {
  return Math.abs(r - target[0]) <= tol && Math.abs(g - target[1]) <= tol && Math.abs(b - target[2]) <= tol;
}

/** Recolore um PNG remapeando cada cor do `fromRamp` pra mesma posição no `toRamp`. */
export function recolor(srcPath, destPath, fromRampHex, toRampHex) {
  const fromRamp = fromRampHex.map(hexToRgb);
  const toRamp = toRampHex.map(hexToRgb);

  const png = PNG.sync.read(readFileSync(srcPath));
  const { data, width, height } = png;

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];
    if (a === 0) continue; // pixel transparente, não mexe

    for (let rampIdx = 0; rampIdx < fromRamp.length; rampIdx++) {
      if (closeEnough(r, g, b, fromRamp[rampIdx], TOLERANCE)) {
        const [nr, ng, nb] = toRamp[rampIdx];
        data[idx] = nr;
        data[idx + 1] = ng;
        data[idx + 2] = nb;
        break;
      }
    }
  }

  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, PNG.sync.write(png));
}

/** Copia um PNG sem alterar cor (usado pro tom/cor "base", ex.: pele "light"). */
export function copyAsIs(srcPath, destPath) {
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, readFileSync(srcPath));
}
