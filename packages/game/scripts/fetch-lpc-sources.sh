#!/usr/bin/env bash
# Baixa os PNGs-base e paletas do repositório oficial LPC (CC-BY-SA/GPL/OGA-BY —
# ver CREDITS em apps/web/public/assets/CREDITS.md) para a pasta de staging.
# Rodar antes de run-lpc-recolor.mjs. Reprodutível — não versionamos os PNGs
# baixados aqui, só este script (ver .stage/ no .gitignore).
set -euo pipefail

STAGE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../apps/web/public/assets/.stage" 2>/dev/null || mkdir -p "$(dirname "${BASH_SOURCE[0]}")/../../../apps/web/public/assets/.stage" && cd "$(dirname "${BASH_SOURCE[0]}")/../../../apps/web/public/assets/.stage" && pwd)"
BASE="https://raw.githubusercontent.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator/master"

fetch() { curl -s --ssl-no-revoke -f -o "$STAGE/$2" "$BASE/$1"; }

# Paletas (ramps de cor)
fetch "palette_definitions/body/body_ulpc.json" "body_ulpc.json"
fetch "palette_definitions/hair/hair_ulpc.json" "hair_ulpc.json"
fetch "palette_definitions/cloth/cloth_ulpc.json" "cloth_ulpc.json"

# Camadas base (cor de referência: body="light", hair="orange", cloth="white")
fetch "spritesheets/body/bodies/male/walk.png" "body_male_walk.png"
fetch "spritesheets/body/bodies/male/idle.png" "body_male_idle.png"

fetch "spritesheets/hair/long/adult/walk.png" "hair_long_walk.png"
fetch "spritesheets/hair/long/adult/idle.png" "hair_long_idle.png"
fetch "spritesheets/hair/bob/adult/walk.png" "hair_bob_walk.png"
fetch "spritesheets/hair/bob/adult/idle.png" "hair_bob_idle.png"
fetch "spritesheets/hair/pixie/adult/walk.png" "hair_pixie_walk.png"
fetch "spritesheets/hair/pixie/adult/idle.png" "hair_pixie_idle.png"

fetch "spritesheets/torso/clothes/shortsleeve/tshirt/male/walk.png" "torso_tshirt_walk.png"
fetch "spritesheets/torso/clothes/shortsleeve/tshirt/male/idle.png" "torso_tshirt_idle.png"
fetch "spritesheets/torso/clothes/longsleeve/longsleeve2_polo/male/walk.png" "torso_polo_walk.png"
fetch "spritesheets/torso/clothes/longsleeve/longsleeve2_polo/male/idle.png" "torso_polo_idle.png"

fetch "spritesheets/legs/pants/male/walk.png" "legs_pants_walk.png"
fetch "spritesheets/legs/pants/male/idle.png" "legs_pants_idle.png"

fetch "spritesheets/feet/shoes/basic/male/walk.png" "feet_shoes_walk.png"
fetch "spritesheets/feet/shoes/basic/male/idle.png" "feet_shoes_idle.png"

fetch "spritesheets/facial/glasses/glasses/adult/walk.png" "glasses_glasses_walk.png"
fetch "spritesheets/facial/glasses/glasses/adult/idle.png" "glasses_glasses_idle.png"
fetch "spritesheets/facial/glasses/round/adult/walk.png" "glasses_round_walk.png"
fetch "spritesheets/facial/glasses/round/adult/idle.png" "glasses_round_idle.png"

echo "Fontes baixadas em: $STAGE"
