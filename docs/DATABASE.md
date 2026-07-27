# Banco de Dados — UniteOn

PostgreSQL via Prisma. **Isolamento multi-tenant**: toda tabela de negócio carrega
`organizationId` e toda query passa por guard + middleware que injeta o filtro. Redis
guarda estado efêmero (presença/posições) e serve de pub/sub.

## Tabelas (PostgreSQL)

```
organizations
  id (uuid pk) · slug (unique) · name · logo_url · plan · created_at

users
  id (uuid pk) · email (unique) · name · avatar_config (jsonb) · created_at

memberships
  id (uuid pk) · user_id (fk) · organization_id (fk) · role (enum)
  · access_profile_id (fk null) · created_at
  unique(user_id, organization_id)

access_profiles
  id (uuid pk) · organization_id (fk) · name

profile_permissions
  id (uuid pk) · access_profile_id (fk) · module (text) · action (enum view/create/edit/delete)
  unique(access_profile_id, module, action)

spaces
  id (uuid pk) · organization_id (fk) · name · slug · created_at
  unique(organization_id, slug)

layouts
  id (uuid pk) · space_id (fk) · version (int) · tilemap (jsonb) · published (bool)
  · created_at
  -- tilemaps grandes: guardar ponteiro S3 em vez do jsonb inline

zones
  id (uuid pk) · space_id (fk) · name · type (enum) · bounds (jsonb: {x,y,w,h})
  · audio_mode (enum ZONE/NONE) · permissions (jsonb) · created_at

interactive_objects
  id (uuid pk) · space_id (fk) · zone_id (fk null) · type (text) · x (int) · y (int)
  · config (jsonb) · created_at

chat_channels
  id (uuid pk) · organization_id (fk) · scope (enum GLOBAL/ZONE/DM)
  · space_id (fk null) · zone_id (fk null) · created_at

chat_channel_members            -- só para DM/privados
  channel_id (fk) · user_id (fk) · unique(channel_id, user_id)

messages
  id (uuid pk) · channel_id (fk) · sender_id (fk) · body (text) · created_at
  index(channel_id, created_at)
```

### Enums
- `role`: SUPER_ADMIN, ADMIN, GESTOR, COLABORADOR, VISITANTE
- `permission_action`: view, create, edit, delete
- `zone_type`: RECEPTION, HALLWAY, OFFICE, MEETING, LOUNGE, OPEN
- `audio_mode`: ZONE, NONE
- `chat_scope`: GLOBAL, ZONE, DM

## Redis (efêmero)

```
presence:space:{spaceId}          → hash  userId → JSON{position,direction,status,zoneId,socketId,lastSeen}
presence:user:{userId}            → string socketId (para DM/roteamento), TTL c/ heartbeat
socket.io adapter                 → pub/sub interno do @socket.io/redis-adapter
events:space:{spaceId}            → canal pub/sub de eventos de mundo entre instâncias
```

Heartbeat renova TTL; ao desconectar, remove do hash e emite `presence_leave`.

## Índices e performance

- `messages(channel_id, created_at)` para histórico paginado.
- `memberships(organization_id)`, `spaces(organization_id)`, `zones(space_id)`.
- Posições **não** vão ao Postgres (só Redis) — evita write amplification.

## Migrations

Prisma Migrate versionado. **Proibido** `db push` em produção (mesma regra do LocusLog).
Toda mudança de schema = migration no mesmo commit.
