# Arquitetura — UniteOn

## Princípios

Clean Architecture + DDD + SOLID, orientada a eventos. Camadas separadas por
responsabilidade; realtime desacoplado da API REST; engine de jogo isolada do React.
Tudo pensado para **escala horizontal** e **multi-tenant** (isolamento por
`organizationId`).

## Topologia de serviços

```
                         ┌──────────────────────────┐
        Browser ─────────►  apps/web (Next.js+Pixi)  │
        (Caio/Vini)       └─────┬─────────┬──────────┘
                                │ REST     │ WebSocket        │ WebRTC
                          ┌─────▼────┐ ┌───▼────────────┐ ┌───▼──────────┐
                          │ apps/api │ │ apps/realtime  │ │ LiveKit SFU  │
                          │ (Nest)   │ │ (Nest+SocketIO)│ │ (managed)    │
                          └────┬─────┘ └───┬────────┬───┘ └──────────────┘
                               │           │        │
                        ┌──────▼───────────▼─┐  ┌───▼────┐
                        │   PostgreSQL        │  │ Redis  │  (presença + pub/sub +
                        │   (Prisma)          │  │        │   Socket.IO adapter)
                        └─────────────────────┘  └────────┘
                                   │
                               ┌───▼───┐
                               │  S3   │  (assets, logos, gravações)
                               └───────┘
```

## Responsabilidades

- **apps/web** — renderiza o mundo (PixiJS), UI (React), conecta ao realtime (Socket.IO)
  e ao LiveKit. Nenhuma regra de negócio crítica; é cliente.
- **apps/api** — REST stateless: auth (JWT + OAuth), tenants, spaces, layouts, zonas,
  objetos, permissões, emissão de **token LiveKit**. Fonte da verdade persistida.
- **apps/realtime** — gateway Socket.IO stateless (estado em Redis): presença, movimento,
  troca de zona, chat, broadcast do estado do mundo. Escala horizontal via **Redis
  adapter** (`@socket.io/redis-adapter`).
- **LiveKit** — SFU de mídia; **1 room por zona**; recebe/valida tokens emitidos pela API.

## Divisão de camadas (dentro de api/realtime)

```
domain/          # entidades, agregados, value objects, eventos — sem framework
application/     # casos de uso, ports (interfaces), DTOs
infrastructure/  # Prisma repos, Redis, LiveKit client, S3 — implementa as ports
interface/       # controllers REST / gateways Socket.IO
```

Regra de dependência: `interface → application → domain`; `infrastructure` implementa as
ports de `application`. Domínio não conhece Prisma, Socket.IO nem LiveKit.

## Escala e estado

- **Sem estado em memória de instância.** Presença e posições vivem no Redis
  (`presence:space:{id}`), com TTL/heartbeat. Qualquer instância do realtime atende
  qualquer socket.
- **Fan-out de movimento**: cada instância publica no Redis; o adapter replica para as
  demais. *Interest management*: um socket só recebe atualizações do seu Space e das
  zonas/viewport relevantes.
- **Tick fixo** (~10–15 Hz) agrega movimentos e reduz mensagens.

## Multi-tenant

- Um único banco compartilhado; **toda** query filtra por `organizationId` (guard +
  Prisma middleware).
- Roteamento por **subdomínio** `<slug>.uniteon.app`; CORS libera `*.uniteon.app`.
- JWT carrega `organizationId` + `membershipId`; o realtime valida o tenant no handshake.

## Segurança

- Permissões em duas camadas: **Role** (trava telas inteiras) + **AccessProfile**
  (matriz módulo×ação, enforced no backend via guard). Fonte canônica em
  `packages/shared/permissions.json`.
- Token LiveKit é **escopado à room da zona** e só é emitido se o servidor confirmar que
  o avatar está naquela zona e tem permissão de falar.

## Deploy

- Cada app tem seu `Dockerfile`. `infra/docker-compose.yml` sobe Postgres+Redis local.
- Kubernetes-ready: serviços stateless escaláveis; Redis e Postgres gerenciados;
  LiveKit Cloud externo (self-host futuro).

## Extensibilidade (futuro, já com costuras)

- **Integrations** como bounded context próprio (Slack/Teams/Calendar/Meet/Discord/
  GitHub/Jira/…): adaptadores plugáveis, sem tocar no core.
- **Bots/NPC/IA** entram como "participantes" no mesmo protocolo de presença.
- **Objetos interativos** com `config` JSON e handlers registráveis.
