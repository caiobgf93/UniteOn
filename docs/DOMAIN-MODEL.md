# Modelo de Domínio (DDD) — UniteOn

## Bounded contexts

### 1. Identity & Access
- **Organization** (tenant) — *aggregate root*. `id`, `slug`, `name`, `logoUrl`, `plan`.
- **User** — `id`, `email`, `name`, `avatarConfig`.
- **Membership** — liga User↔Organization; `role`, `accessProfileId`.
- **Role** (VO) — `SUPER_ADMIN | ADMIN | GESTOR | COLABORADOR | VISITANTE`.
- **AccessProfile** — matriz `module × {view,create,edit,delete}`.

### 2. World / Spatial
- **Space** (um escritório) — *aggregate root*. Contém Layout, Zones, Objects.
  `id`, `organizationId`, `name`, `slug`.
- **Layout** — versão do mapa. `tilemap` (JSON compatível com Tiled), `published`,
  `version`.
- **Zone** — sala/ambiente = **fronteira de áudio** + permissões. `type`
  (`RECEPTION | HALLWAY | OFFICE | MEETING | LOUNGE | OPEN`), `bounds`, `audioMode`
  (`ZONE | NONE`), `permissions`.
- **InteractiveObject** — `type` (computer, tv, board, coffee, sofa, plant…), `x`, `y`,
  `config` (JSON).
- **Portal** — teleporte/entrada entre zonas (futuro).

### 3. Presence (efêmero — Redis, não relacional)
- **PresenceSession** — `userId`, `spaceId`, `position{x,y}`, `direction`, `status`
  (🟢🟡🔴🌙), `currentZoneId`, `socketId`, `lastSeen`.

### 4. Communication
- **MediaRoom** — 1:1 com Zone; nome derivado (`space:{id}:zone:{id}`).
- **ChatChannel** — `scope` (`GLOBAL | ZONE | DM`), `spaceId?`, `zoneId?`, `members?`.
- **Message** — `channelId`, `senderId`, `body`, `createdAt`.

## Agregados e invariantes

- **Organization**: slug único global; membros pertencem a exatamente uma org por
  membership.
- **Space**: pertence a uma org; um Layout `published` por vez; Zones não se sobrepõem
  de forma ambígua (uma posição resolve para no máximo uma zona de áudio).
- **PresenceSession**: `currentZoneId` é sempre derivado da `position` sobre as `bounds`
  das Zones do Space — o servidor é a autoridade.

## Eventos de domínio

| Evento | Disparado quando | Efeito |
|---|---|---|
| `UserJoinedSpace` | usuário entra no Space | cria PresenceSession, broadcast `presence_join` |
| `AvatarMoved` *(transiente)* | movimento no tick | broadcast `avatar_moved` (não persiste) |
| `UserChangedZone` | `currentZoneId` muda | leave/join da MediaRoom → novo token LiveKit |
| `StatusChanged` | usuário muda status | broadcast `status_changed` |
| `MessageSent` | envia chat | persiste Message, broadcast `chat_message` |
| `ObjectInteracted` | clica em objeto | executa handler do objeto, broadcast `object_state` |
| `LayoutSaved` | admin salva mapa | nova versão de Layout |
| `ZoneCreated/Updated/Deleted` | admin edita salas | invalida caches, re-broadcast |

`AvatarMoved` é alta-frequência e **não** vira evento persistido — é estado transiente.
`UserChangedZone` é o gatilho central da ponte de mídia (áudio por zona).

## Ports (interfaces de aplicação)

- `OrganizationRepository`, `UserRepository`, `SpaceRepository`, `LayoutRepository`,
  `ZoneRepository`, `MessageRepository`
- `PresenceStore` (Redis), `EventBus` (Redis pub/sub), `MediaTokenIssuer` (LiveKit),
  `AssetStorage` (S3)

Infra implementa cada port; o domínio depende só das interfaces.
