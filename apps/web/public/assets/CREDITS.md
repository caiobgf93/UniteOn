# Créditos de Assets

Registro obrigatório de licença por asset (ver `docs/ASSETS.md`). Preencher a cada
arquivo adicionado — nada entra em `manifest.json` sem uma linha aqui.

| Asset | Fonte | Autor | Licença | Observação |
|---|---|---|---|---|
| `tilesets/kenney-roguelike-rpg/` | [kenney.nl/assets/roguelike-rpg-pack](https://kenney.nl/assets/roguelike-rpg-pack) | Kenney Vleugels (com ajuda de Lynn Evers) | CC0 (domínio público) | Tileset 16×16, piso/parede/móveis/interior. Crédito não obrigatório, mas mantido por boa prática. Inclui 2 mapas de exemplo em Tiled (`Map/*.tmx`). |

## Sprites de avatar (LPC — Liberated Pixel Cup)

Fonte: [Universal LPC Spritesheet Character Generator](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator)
(gerador: https://sanderfrenken.github.io/Universal-LPC-Spritesheet-Character-Generator/).
Licenciamento **múltiplo** (o mais restritivo entre os listados se aplica por
arquivo) — **CC-BY-SA 3.0 exige atribuição E compartilhamento pela mesma licença**
se este projeto redistribuir os arquivos (o que fazemos, em `sprites/avatars/`).
As cores em `sprites/avatars/**` foram **recoloridas por nós** a partir do arquivo
base (script `packages/game/scripts/run-lpc-recolor.mjs`), usando as mesmas paletas
oficiais do projeto (`palette_definitions/*_ulpc.json`) — o autor/licença do
recolorido é o mesmo do arquivo-base, a recolorização em si não é obra nova.

| Camada | Base (arquivo original) | Autores | Licenças |
|---|---|---|---|
| `body/male/*` (5 tons de pele) | `body/bodies/male/{walk,idle}.png` | bluecarrot16, JaidynReiman, Benjamin K. Smith (BenCreating), Evert, Eliza Wyatt (ElizaWy), TheraHedwig, MuffinElZangano, Durrani, Johannes Sjölund (wulax), Stephen Challener (Redshrike) | OGA-BY 3.0, CC-BY-SA 3.0, GPL 3.0 |
| `hair/long/*` (5 cores) | `hair/long/adult/{walk,idle}.png` | JaidynReiman, Manuel Riecke (MrBeast) | CC-BY-SA 3.0, GPL 3.0 |
| `hair/bob/*` (5 cores) | `hair/bob/adult/{walk,idle}.png` | ElizaWy, bluecarrot16 | CC0 |
| `hair/pixie/*` (5 cores) | `hair/pixie/adult/{walk,idle}.png` | JaidynReiman, Manuel Riecke (MrBeast) | CC-BY-SA 3.0, GPL 3.0 |
| `torso/tshirt/white` | `torso/clothes/shortsleeve/tshirt/male/{walk,idle}.png` | ElizaWy, JaidynReiman, Stephen Challener (Redshrike), Johannes Sjölund (wulax) | OGA-BY 3.0 |
| `torso/polo/white` | `torso/clothes/longsleeve/longsleeve2_polo/male/{walk,idle}.png` | ElizaWy, JaidynReiman, Stephen Challener (Redshrike), Johannes Sjölund (wulax) | OGA-BY 3.0 |
| `legs/pants/{white,black}` | `legs/pants/male/{walk,idle}.png` | bluecarrot16, JaidynReiman, ElizaWy, Matthew Krohn (makrohn), Johannes Sjölund (wulax), Stephen Challener (Redshrike) | OGA-BY 3.0, GPL 3.0, CC-BY-SA 3.0 |
| `feet/shoes/white` | `feet/shoes/basic/male/{walk,idle}.png` | JaidynReiman, bluecarrot16, Johannes Sjölund (wulax) | OGA-BY 3.0, CC-BY-SA 3.0, GPL 3.0 |
| `glasses/glasses/default` | `facial/glasses/glasses/adult/{walk,idle}.png` | ElizaWy | OGA-BY 3.0 |
| `glasses/round/default` | `facial/glasses/round/adult/{walk,idle}.png` | bluecarrot16, Thane Brimhall (pennomi), laetissima | CC-BY-SA 3.0, GPL 3.0 |

**Texto de atribuição sugerido** (exibir em tela de créditos/rodapé, exigido pela
CC-BY-SA 3.0): *"Sprites de personagem: Liberated Pixel Cup / Universal LPC
Spritesheet Character Generator, com contribuições de bluecarrot16, JaidynReiman,
Eliza Wyatt (ElizaWy), Benjamin K. Smith (BenCreating), Johannes Sjölund (wulax),
Stephen Challener (Redshrike), Manuel Riecke (MrBeast), Matthew Krohn (makrohn),
Thane Brimhall (pennomi), Evert, TheraHedwig, MuffinElZangano, Durrani, laetissima —
licenciado sob OGA-BY 3.0 / CC-BY-SA 3.0 / GPL 3.0."*
