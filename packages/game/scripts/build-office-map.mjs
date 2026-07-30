/**
 * Gera o mapa visual do escritório em formato Tiled JSON (.tmj), usando o
 * tileset Kenney Roguelike/RPG Pack. Reaproveita a MESMA fonte de verdade do
 * mundo lógico (zonas + colisão) que já existe em @uniteon/shared — este
 * script só adiciona a camada visual por cima, sem duplicar regra de jogo.
 *
 * Resolução visual: tiles de 16px (grid 80×60) = exatamente 2× o grid lógico
 * de 32px (40×30) já usado por CollisionGrid/Zone — 1 tile lógico = bloco 2×2
 * de tiles visuais. Cobre a mesma área em pixels (1280×960) sem precisar
 * mudar TILE_SIZE em nenhum outro lugar do sistema.
 *
 * Saída: apps/web/public/assets/maps/office-01.json
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// office.ts é ESM/TS puro sem imports de framework — importamos direto do source
// compilado (packages/shared/dist) se existir; senão replicamos localmente,
// já que este script não passa pelo bundler do TS.
const here = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(here, '..', '..', '..', 'apps', 'web', 'public', 'assets');
const OUT = join(ASSETS, 'maps', 'office-01.json');

const TILE_VISUAL = 16;
const LOGICAL_TILE = 32;
const LOGICAL_COLS = 40;
const LOGICAL_ROWS = 30;
const COLS = LOGICAL_COLS * (LOGICAL_TILE / TILE_VISUAL); // 80
const ROWS = LOGICAL_ROWS * (LOGICAL_TILE / TILE_VISUAL); // 60

// --- Tiles escolhidos no tileset (verificados visualmente, ver docs/VISUAL-UPGRADE-PLAN.md) ---
const TILE = {
  floorOffice: 124, // piso bege/creme — recepção, corredor, escritórios
  floorMeeting: 123, // piso pedra cinza — sala de reunião
  floorLounge: 122, // piso tijolo marrom — lounge
  wall: 704, // bloco de pedra cinza sólido — todas as paredes/colisão
  window: 41, // janela (decorativa, substitui o bloco de parede em alguns pontos)
  desk: 253, // mesa individual (escritórios)
  chair: 251, // cadeira
  tableSeg: [362, 363, 364, 365], // mesa longa de 4 partes (sala de reunião)
  cabinet: 19, // armário 2 portas (armazenamento)
  counter: 29, // bancada com pia (copa do lounge)
  deskItem: 897, // livro/papelada — acento sobre a mesa
  bookshelf: 844, // estante com livros
  plant: 654, // planta/arbusto verde
  rugStone: 121, // piso pedra clara — acento de "tapete" (contraste no meeting)
  rugWood: 120, // piso madeira — acento de "tapete" (contraste no lounge)
};

// --- Replica a mesma lógica lógica de colisão/zonas de office.ts (fonte de
// verdade fica lá; aqui só precisamos das MESMAS regras pra desenhar por cima). ---
function buildCollision() {
  const collision = new Array(LOGICAL_ROWS * LOGICAL_COLS).fill(0);
  const set = (x, y) => {
    if (x >= 0 && y >= 0 && x < LOGICAL_COLS && y < LOGICAL_ROWS) collision[y * LOGICAL_COLS + x] = 1;
  };
  const hWall = (y, doors) => {
    for (let x = 1; x < LOGICAL_COLS - 1; x++) if (!doors.includes(x)) set(x, y);
  };
  const vWall = (x, y0, y1, doors = []) => {
    for (let y = y0; y <= y1; y++) if (!doors.includes(y)) set(x, y);
  };
  for (let x = 0; x < LOGICAL_COLS; x++) {
    set(x, 0);
    set(x, LOGICAL_ROWS - 1);
  }
  for (let y = 0; y < LOGICAL_ROWS; y++) {
    set(0, y);
    set(LOGICAL_COLS - 1, y);
  }
  hWall(6, [19, 20]);
  hWall(10, [6, 7, 19, 20, 31, 32]);
  hWall(22, [6, 7, 19, 20, 31, 32]);
  vWall(13, 11, 21);
  vWall(26, 11, 21);
  return collision;
}

const ZONES_LOGICAL = [
  { name: 'Recepção', x: 0, y: 0, w: 40, h: 6, floor: TILE.floorOffice },
  { name: 'Corredor', x: 0, y: 6, w: 40, h: 4, floor: TILE.floorOffice },
  { name: 'Escritório do Caio', x: 0, y: 10, w: 13, h: 12, floor: TILE.floorOffice },
  { name: 'Escritório do Vinicius', x: 13, y: 10, w: 13, h: 12, floor: TILE.floorOffice },
  { name: 'Sala de Reunião', x: 26, y: 10, w: 14, h: 12, floor: TILE.floorMeeting },
  { name: 'Lounge', x: 0, y: 22, w: 40, h: 8, floor: TILE.floorLounge },
];

function emptyLayer() {
  return new Array(COLS * ROWS).fill(0);
}
function setVisual(layer, vx, vy, gid) {
  if (vx >= 0 && vy >= 0 && vx < COLS && vy < ROWS) layer[vy * COLS + vx] = gid;
}
/** Marca o bloco 2×2 de tiles visuais correspondente a 1 tile lógico. */
function setLogicalBlock(layer, lx, ly, gid) {
  setVisual(layer, lx * 2, ly * 2, gid);
  setVisual(layer, lx * 2 + 1, ly * 2, gid);
  setVisual(layer, lx * 2, ly * 2 + 1, gid);
  setVisual(layer, lx * 2 + 1, ly * 2 + 1, gid);
}

const floor = emptyLayer();
const walls = emptyLayer();
const furniture = emptyLayer();

// Piso por zona (em tiles lógicos, convertido pro bloco 2×2 visual).
for (const z of ZONES_LOGICAL) {
  for (let ly = z.y; ly < z.y + z.h; ly++) {
    for (let lx = z.x; lx < z.x + z.w; lx++) {
      setLogicalBlock(floor, lx, ly, z.floor);
    }
  }
}

// Paredes: um bloco visual 2×2 por célula de colisão lógica.
const collision = buildCollision();
for (let ly = 0; ly < LOGICAL_ROWS; ly++) {
  for (let lx = 0; lx < LOGICAL_COLS; lx++) {
    if (collision[ly * LOGICAL_COLS + lx]) setLogicalBlock(walls, lx, ly, TILE.wall);
  }
}

// Móveis (posições escolhidas nas zonas, em tiles LÓGICOS — múltiplos de 1,
// convertidos pra visual só na hora de desenhar via setLogicalBlock/setVisual).
function placeAt(lx, ly, gid) {
  setVisual(furniture, lx * 2, ly * 2, gid);
}
/** Pra props feitos de vários tiles de 16px contíguos (ex.: mesa de 4 partes)
 * — usa coordenada visual direta em vez de espaçamento por tile lógico. */
function placeVisualRow(lx, ly, gids) {
  const vy = ly * 2;
  const vx0 = lx * 2;
  gids.forEach((gid, i) => setVisual(furniture, vx0 + i, vy, gid));
}

/** Marca um bloco retangular (em tiles lógicos) no piso com um tile de
 * acento (tapete) — desenhado por baixo dos móveis, que continuam na
 * camada Furniture por cima. */
function rugBlock(lx0, ly0, lx1, ly1, gid) {
  for (let ly = ly0; ly <= ly1; ly++) {
    for (let lx = lx0; lx <= lx1; lx++) setLogicalBlock(floor, lx, ly, gid);
  }
}

// Recepção (x:0-40,y:0-6): plantas flanqueando a entrada.
placeAt(3, 3, TILE.plant);
placeAt(36, 3, TILE.plant);

// Corredor (x:0-40,y:6-10): plantas de apoio.
placeAt(10, 8, TILE.plant);
placeAt(30, 8, TILE.plant);

// Escritório do Caio (zona x:0-13,y:10-22): mesa + papelada + cadeira +
// estante + armário + planta perto da porta.
placeAt(4, 14, TILE.desk);
placeAt(5, 14, TILE.deskItem);
placeAt(4, 15, TILE.chair);
placeAt(9, 18, TILE.cabinet);
placeAt(11, 11, TILE.bookshelf);
placeAt(2, 20, TILE.plant);

// Escritório do Vinicius (zona x:13-26,y:10-22): espelhado.
placeAt(17, 14, TILE.desk);
placeAt(18, 14, TILE.deskItem);
placeAt(17, 15, TILE.chair);
placeAt(22, 18, TILE.cabinet);
placeAt(24, 11, TILE.bookshelf);
placeAt(15, 20, TILE.plant);

// Sala de Reunião (zona x:26-40,y:10-22): tapete sob a mesa, mesa longa de
// 4 partes (contígua, em resolução visual de 16px) + cadeiras dos dois
// lados + planta no canto.
rugBlock(29, 13, 34, 17, TILE.rugStone);
placeVisualRow(30, 15, TILE.tableSeg);
placeAt(30, 14, TILE.chair);
placeAt(33, 14, TILE.chair);
placeAt(30, 16, TILE.chair);
placeAt(33, 16, TILE.chair);
placeAt(38, 20, TILE.plant);

// Lounge (zona x:0-40,y:22-30): balcão/copa, tapete de estar, cantinho de
// leitura (estante) e plantas.
rugBlock(15, 25, 24, 28, TILE.rugWood);
placeAt(4, 25, TILE.counter);
placeAt(20, 25, TILE.counter);
placeAt(2, 28, TILE.bookshelf);
placeAt(10, 26, TILE.plant);
placeAt(30, 26, TILE.plant);

// Janelas decorativas em trechos da parede externa (substituem o bloco de
// parede só visualmente — a colisão continua vindo do grid lógico).
for (const [lx, ly] of [
  [8, 0],
  [18, 0],
  [28, 0],
  [8, 29],
  [28, 29],
]) {
  setLogicalBlock(walls, lx, ly, TILE.window);
}

function tiledLayer(id, name, data) {
  return {
    id,
    name,
    type: 'tilelayer',
    width: COLS,
    height: ROWS,
    data,
    opacity: 1,
    visible: true,
    x: 0,
    y: 0,
  };
}

const map = {
  type: 'map',
  version: '1.10',
  tiledversion: '1.10.2',
  orientation: 'orthogonal',
  renderorder: 'right-down',
  width: COLS,
  height: ROWS,
  tilewidth: TILE_VISUAL,
  tileheight: TILE_VISUAL,
  infinite: false,
  nextlayerid: 4,
  nextobjectid: 1,
  tilesets: [
    {
      firstgid: 1,
      name: 'roguelikeSheet_transparent',
      image: '../tilesets/kenney-roguelike-rpg/Spritesheet/roguelikeSheet_transparent.png',
      imagewidth: 968,
      imageheight: 526,
      tilewidth: TILE_VISUAL,
      tileheight: TILE_VISUAL,
      spacing: 1,
      margin: 0,
      columns: 57,
      tilecount: 57 * 31,
    },
  ],
  layers: [
    tiledLayer(1, 'Floor', floor),
    tiledLayer(2, 'Walls', walls),
    tiledLayer(3, 'Furniture', furniture),
  ],
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(map));
console.log('Mapa gerado em', OUT, `(${COLS}x${ROWS} tiles visuais de ${TILE_VISUAL}px)`);
