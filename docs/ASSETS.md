# Pipeline de Assets — UniteOn

## Estratégia

Começar com **placeholders open-license** e um pipeline que permite trocar por arte
custom **sem tocar no código** (tudo referenciado por manifesto versionado).

## Fontes iniciais (placeholder)

- **Kenney** (CC0) — tilesets, móveis, ícones. https://kenney.nl
- **LPC / OpenGameArt** (CC-BY-SA / CC0) — sprites de personagem (walk 4 direções).
- **itch.io** packs CC0 de interior/office.

⚠️ Registrar licença de **cada** asset em `assets/CREDITS.md`. Evitar misturar
CC-BY-SA com arte proprietária futura sem checar compatibilidade.

## Formato e ferramentas

- **Mapas**: editados no **Tiled** (`.tmx` + `.tsx`) e exportados para **JSON**.
  Carregados pelo PixiJS. Tile size padrão: **32×32** (grid do escritório).
- **Sprites de avatar**: atlas (sprite sheet) com animações
  `idle`/`walk` nas 4 direções (down/up/left/right) + `sit`. Frames por animação: 4–6.
- **Objetos/móveis**: no tileset ou como sprites soltos com âncora na base.
- **Áudio ambiente**: loops (café, murmúrio, sala) + SFX curtos (passos, portas).

## Estrutura no repo

```
packages/game/assets/
  tilesets/office.tsx  office.png
  maps/office-01.tmx   office-01.json
  sprites/avatars/*.json *.png     (atlas + animações)
  objects/*.png
  audio/ambient/*.ogg  sfx/*.ogg
  manifest.json                    (id → caminho/url + metadados + licença)
  CREDITS.md
```

## Manifesto (troca sem código)

`manifest.json` mapeia **ids lógicos** para caminhos/URLs. O código referencia sempre o
id (`avatar.default`, `tileset.office`), nunca o arquivo. Trocar arte = editar o
manifesto e subir os arquivos (S3 em produção, versionado).

```json
{
  "tilesets": { "office": { "src": "tilesets/office.json", "license": "CC0/Kenney" } },
  "maps":     { "office-01": { "src": "maps/office-01.json" } },
  "avatars":  { "default": { "atlas": "sprites/avatars/default.json", "license": "CC0" } },
  "audio":    { "ambient.lounge": { "src": "audio/ambient/lounge.ogg", "loop": true } }
}
```

## Produção (S3)

Assets servidos de S3/CDN com cache-busting por versão. O cliente baixa via manifesto;
placeholders locais em dev, bucket em produção. Arte custom LocusLog substitui os ids
sem mudança de código.
