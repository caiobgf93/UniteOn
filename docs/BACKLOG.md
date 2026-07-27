# Backlog — UniteOn

Épicos → features → tarefas, priorizados. **MVP-0 = Épicos 0–3.** Cada épico entrega
algo testável.

## Épico 0 — Fundações
- **F0.1 Monorepo & tooling**: pnpm + Turborepo, tsconfig base, ESLint/Prettier, CI.
- **F0.2 Docker local**: `infra/docker-compose.yml` (Postgres + Redis).
- **F0.3 Skeletons**: `apps/web` (Next), `apps/api` (Nest), `apps/realtime` (Nest+Socket.IO),
  `packages/shared`, `packages/game` compilando vazios.
- **F0.4 Auth**: OAuth Google + Microsoft, emissão JWT, `Membership`/tenant no token.
- **F0.5 Tenant por subdomínio**: resolução de slug, `GET /tenants/by-slug`, CORS `*.uniteon`.
- **F0.6 Prisma**: schema inicial + migration + seed (org LocusLog, users Caio/Vinicius,
  1 Space, 1 Layout, zonas).

## Épico 1 — Renderização do mundo
- **F1.1 Engine base** (`packages/game`): loop Pixi, câmera que segue o avatar, escala.
- **F1.2 Tilemap loader**: carregar mapa Tiled (JSON) + tileset; camadas piso/parede/objetos.
- **F1.3 Mapa do escritório**: recepção→corredor→escritório Caio→escritório Vinicius→
  sala de reunião→lounge (com espaço de expansão).
- **F1.4 Colisão**: camada de colisão do Tiled; avatar não atravessa parede/móvel.
- **F1.5 Avatar & animação**: atlas walk 4 direções + idle; movimento suave.

## Épico 2 — Movimento & presença
- **F2.1 Gateway Socket.IO** + handshake JWT + Redis adapter.
- **F2.2 PresenceStore (Redis)**: join/leave, heartbeat/TTL, `space_state`.
- **F2.3 Loop de movimento**: `move` validado, tick fixo, `avatar_moved` batched.
- **F2.4 Interpolação no cliente**: render suave entre ticks.
- **F2.5 Status** 🟢🟡🔴🌙: `set_status` + broadcast + UI.
- **F2.6 Cálculo de zona**: `currentZoneId` a partir da posição sobre `bounds`.

## Épico 3 — Áudio por zona (fecha MVP-0)
- **F3.1 LiveKit setup**: projeto/keys; `MediaTokenIssuer` na API.
- **F3.2 Room por zona**: `roomName = space:{id}:zone:{id}`; token escopado.
- **F3.3 Ponte**: `zone_changed` → cliente troca de room (fade in/out, debounce).
- **F3.4 UI de mídia**: mic on/off, indicador de quem está falando, zona atual.
- **F3.5 Zonas sem áudio** (`audioMode NONE`): corredor não conecta room.

---

## Pós-MVP (arquitetura já pronta)

- **Épico 4 — Chat**: canais global/zone/DM, histórico paginado, notificações, emoji.
- **Épico 5 — Sala de reunião**: vídeo, screenshare, câmera, auto-join ao entrar.
- **Épico 6 — Objetos interativos**: café, TV, quadros; música/playlist/volume no lounge.
- **Épico 7 — Admin & editor de mapa**: CRUD de salas, mover móveis, salvar/publicar
  layout, permissões por sala.
- **Épico 8 — Escala & ops**: observabilidade, métricas de presença, AOI/viewport,
  hardening multi-tenant.
- **Futuro (só costuras)**: integrações (Slack/Teams/Calendar/Meet/Discord/GitHub/Jira/
  ClickUp/Trello/Spotify/ElevenLabs), NPC recepcionista, IA assistente, bots,
  gamificação/conquistas/ranking/eventos, apresentações/treinamentos.

## Ordem de execução

`F0.1 → F0.2 → F0.3` (esqueleto que compila) → `F0.6` (dados) → Épico 1 (ver o mundo) →
Épico 2 (mover-se junto) → Épico 3 (ouvir-se). Auth (F0.4/F0.5) pode entrar em paralelo,
com um login mock enquanto OAuth não está pronto.
