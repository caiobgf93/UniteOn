# PRD — UniteOn

## 1. Visão

UniteOn é um **escritório virtual colaborativo** onde equipes remotas trabalham juntas
como se estivessem num escritório físico. A pessoa entra, anda até a mesa, conversa com
quem está por perto, entra numa sala, toma um café, sai. **Presença > reunião.**

## 2. Problema

Trabalho remoto perde a colaboração espontânea e a sensação de "estar junto".
Ferramentas de vídeo transformam toda interação num evento agendado e formal. Falta o
"esbarrar no corredor", o ambiente vivo, a proximidade.

## 3. Proposta de valor

Um lugar (não um sistema) — sempre com movimento, som ambiente e presença — onde falar
com alguém é tão simples quanto **chegar perto**. Áudio e vídeo acontecem por
**proximidade/zona**, sem clicar em "iniciar reunião".

## 4. Personas

- **Colaborador** (ex.: Caio/Produto, Vinicius/Dev): trabalha no seu espaço, conversa,
  entra em salas, compartilha tela.
- **Gestor**: acompanha presença da equipe, organiza salas/eventos.
- **Administrador**: cria/edita ambientes, move móveis, define permissões, salva layouts.
- **Visitante**: acesso restrito a áreas específicas.

## 5. Princípios de experiência

- Nunca parecer "entrar numa reunião" — só "entrar no escritório".
- Sempre vivo: sons, movimento, animações, transições sutis.
- Acolhedor e produtivo — pixel art moderna, nada infantil, nada cyberpunk.
- Natural: chegar perto = conversar; entrar na sala = participar.

## 6. Escopo do MVP-0 (aprovado)

Um escritório navegável (recepção → corredor → escritório Caio → escritório Vinicius →
sala de reunião → lounge) com:
- Avatar que **anda/para** com animação suave (4 direções).
- **Presença em tempo real** de todos: posição + status (🟢 Trabalhando / 🟡 Ausente /
  🔴 Em reunião / 🌙 Offline).
- **Áudio por zona**: só se escuta quem está na mesma sala/ambiente.

### Fora do MVP-0 (próximos)
Chat, sala de reunião com vídeo/screenshare, objetos interativos (café/TV/música),
admin & editor de mapa, integrações, gamificação. Arquitetura já preparada para todos.

## 7. Métricas de sucesso

- **DAU / tempo de sessão** por tenant.
- **Interações espontâneas**: nº de conversas iniciadas por proximidade (sem agenda).
- **Latência de movimento** percebida < 150 ms; **falha de áudio ao trocar de zona**
  próxima de zero.
- Setup de novo tenant sem trabalho manual (subdomínio automático).

## 8. Requisitos não-funcionais

- **Escala**: milhares de usuários simultâneos por região; gateway realtime horizontal.
- **Multi-tenant**: isolamento por `organizationId` em toda tabela e canal.
- **Segurança**: JWT + OAuth; permissões enforced no backend.
- **Disponibilidade**: sem estado crítico em memória de instância (Redis + Postgres).
- **Portabilidade**: Docker, Kubernetes-ready.

## 9. Critério de aceite do MVP-0

Dois usuários (Caio e Vinicius) em navegadores diferentes, mesmo Space:
1. Veem um ao outro se mover em tempo real, com status.
2. Ao ficarem na mesma zona **passam a se ouvir**; ao se separarem o **áudio cai**.
