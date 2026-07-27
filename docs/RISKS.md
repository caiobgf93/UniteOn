# Riscos e Mitigações — UniteOn

| # | Risco | Impacto | Mitigação |
|---|---|---|---|
| R1 | **Custo/escala de mídia** (áudio/vídeo) | Alto | SFU gerenciado (LiveKit) + 1 room por zona; monitorar minutos; caminho de self-host (LiveKit/mediasoup) documentado. |
| R2 | **Fan-out de movimento** em escala | Alto | Tick batching (~10–15 Hz), Redis adapter, *interest management* por Space/viewport (AOI). Posições só no Redis. |
| R3 | **Licença/consistência de pixel art** | Médio | Placeholders CC0 + `manifest.json`; `CREDITS.md` por asset; troca por arte custom sem tocar no código. |
| R4 | **NAT/firewall no WebRTC** | Médio | TURN do LiveKit resolve travessia; sem infra extra no MVP. |
| R5 | **Escopo enorme do brief** | Alto | MVP-0 estrito (Épicos 0–3); costuras arquiteturais para o resto sem implementar. |
| R6 | **UX de áudio** (eco, corte seco ao trocar de zona) | Médio | Fade in/out, debounce nas fronteiras, echo cancellation do LiveKit. |
| R7 | **Autoridade de estado** (posição/zona forjada) | Médio | Server é autoridade: valida colisão/bounds; token de mídia só se o server confirmar a zona. |
| R8 | **Vazamento entre tenants** | Alto | `organizationId` em toda tabela + guard/middleware Prisma; JWT carrega tenant; realtime valida no handshake. |
| R9 | **Estado preso em memória de instância** | Alto | Nada crítico em memória; presença/posições no Redis com TTL/heartbeat; instâncias stateless. |
| R10 | **Reconexão/instabilidade de rede** | Médio | Reconnect reidrata do Redis; tokens de mídia renováveis; heartbeat evita fantasmas. |
| R11 | **Dependência de fornecedor (LiveKit Cloud)** | Médio | `MediaTokenIssuer` como port isolada; trocar por self-host é mudança de infra, não de domínio. |
| R12 | **Performance do PixiJS** com muitos avatares | Médio | Culling por viewport, sprite batching, só renderizar avatares visíveis. |

## Gatilhos de reavaliação
- Passar de ~50 usuários simultâneos por Space → medir R2/R12 e ligar AOI/viewport.
- Custo de mídia relevante → avaliar self-host (R1/R11).
