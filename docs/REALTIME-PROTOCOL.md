# Protocolo Realtime — UniteOn

Transporte: **Socket.IO** (WebSocket + fallback). Namespace por ambiente lógico;
**rooms** por `space` e por `zone`. Estado efêmero no Redis; escala horizontal via
`@socket.io/redis-adapter`. Mídia (áudio/vídeo) é WebRTC via **LiveKit**, ponte pelo
evento `zone_changed`.

## Handshake / auth

Cliente conecta com JWT (`auth.token`). O gateway valida assinatura, extrai
`userId` + `organizationId` + `membershipId`, rejeita se o tenant do subdomínio não
bater. Entra na room `space:{spaceId}` após `join_space`.

## Eventos Client → Server

| Evento | Payload | Descrição |
|---|---|---|
| `join_space` | `{ spaceId }` | entra no escritório; server responde `space_state` |
| `move` | `{ x, y, dir }` ou `{ dx, dy }` | intenção de movimento (validada no server) |
| `set_status` | `{ status }` | 🟢🟡🔴🌙 |
| `chat_send` | `{ channelId, body }` | envia mensagem |
| `interact_object` | `{ objectId }` | aciona objeto |
| `request_media_token` | `{ zoneId }` | pede token LiveKit da zona atual |
| `heartbeat` | `{}` | renova presença (TTL) |

## Eventos Server → Client

| Evento | Payload | Descrição |
|---|---|---|
| `space_state` | `{ zones, objects, layoutRef, participants[] }` | snapshot inicial |
| `presence_join` | `{ userId, name, position, status, zoneId }` | alguém entrou |
| `presence_leave` | `{ userId }` | alguém saiu |
| `avatar_moved` | `{ updates: [{userId,x,y,dir}] }` | **batched** no tick (~10–15 Hz) |
| `status_changed` | `{ userId, status }` | mudança de status |
| `zone_changed` | `{ userId, fromZoneId, toZoneId }` | trocou de zona |
| `media_token` | `{ zoneId, roomName, token, url }` | credencial LiveKit da zona |
| `chat_message` | `{ channelId, senderId, body, createdAt }` | nova mensagem |
| `object_state` | `{ objectId, state }` | estado de objeto mudou |

## Loop de movimento

1. Cliente emite `move` (rate-limited).
2. Server valida contra colisão/bounds, atualiza posição no Redis, recalcula
   `currentZoneId`.
3. A cada **tick fixo**, o server agrega e emite `avatar_moved` (batch) só para os
   sockets interessados (mesmo space/viewport).
4. Cliente **interpola** entre posições para movimento suave (sem travar no tick).

## Ponte de mídia — o "áudio por zona"

```
move → server recalcula zona
  ├─ se zona mudou:
  │    emite zone_changed
  │    api emite token LiveKit para room da NOVA zona (roomName = space:{id}:zone:{id})
  │    cliente: desconecta room antiga, conecta room nova (fade in/out)
  └─ resultado: você só publica/assina áudio de quem está na MESMA zona
```

- Zonas com `audioMode = NONE` (ex.: corredor) → sem room → sem áudio.
- Sala de reunião (`MEETING`) → auto-join da room ao entrar (vídeo/screenshare no futuro).
- Debounce ao cruzar fronteiras rápido, para não conectar/desconectar em looping.

## Escala / interest management

- Redis adapter replica broadcasts entre instâncias.
- Um socket só recebe `avatar_moved` do seu Space (e futuramente do viewport/AOI).
- Presença com TTL + heartbeat; instância que cai não deixa fantasmas (TTL expira).

## Erros e reconexão

- Reconnect: cliente refaz `join_space`; server reidrata presença do Redis.
- `media_token` expira → cliente pede novo via `request_media_token`.
