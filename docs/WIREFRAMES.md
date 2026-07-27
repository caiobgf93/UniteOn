# Wireframes — UniteOn

Descrição das telas principais. Mockups visuais serão gerados como HTML/SVG à parte.

## 1. Login
```
┌───────────────────────────────────────────┐
│              [logo do tenant]              │
│                UniteOn · <slug>            │
│                                            │
│      [ Entrar com Google ]                 │
│      [ Entrar com Microsoft ]              │
│                                            │
│   tenant detectado pelo subdomínio         │
└───────────────────────────────────────────┘
```
- Slug lido da URL (`<slug>.uniteon.app`); busca tenant público p/ exibir nome+logo.

## 2. Onboarding / seletor de avatar
```
┌───────────────────────────────────────────┐
│  Escolha seu avatar        [◄]  🧍  [►]    │
│  Nome: [__________]  Cargo: [__________]   │
│                         [ Entrar ▶ ]       │
└───────────────────────────────────────────┘
```

## 3. Escritório (view principal)
```
┌──────────────────────────────────────────────────────────┐
│ ● Trabalhando ▾   UniteOn        👥 Participantes (3) ▾   │  ← topbar
├──────────────────────────────────────────────┬───────────┤
│                                                │  Chat     │
│            [ CANVAS PixiJS — o mundo ]         │  #global  │
│      recepção · corredor · salas · lounge      │  ...      │
│            avatares andando + nomes            │  [_____]  │
│                                                │           │
├──────────────────────────────────────────────┴───────────┤
│   🎤 mic   📷 cam   🖥 tela   ⚙ config     zona: Lounge   │  ← barra inferior
└──────────────────────────────────────────────────────────┘
```
- Canvas ocupa a maior área. Barra inferior mostra a **zona atual** e controles de mídia.
- Painel de chat colapsável. Lista de participantes com status.

## 4. Overlay de reunião (ao entrar na zona MEETING)
```
┌──────────────────────────────────────────────┐
│  [vídeo A] [vídeo B] [vídeo C]     [tela ▢]   │
│  Sala de Reunião · 3 participantes            │
│  🎤  📷  🖥 compartilhar  ⏻ sair da sala       │
└──────────────────────────────────────────────┘
```
- Ao entrar na zona, entra automaticamente (sem "iniciar reunião").

## 5. Editor de mapa (admin)
```
┌──────────┬───────────────────────────────────┐
│ Paleta   │        [ grid do mapa ]            │
│ ▢ piso   │   arrastar tiles/móveis/objetos    │
│ ▢ parede │   desenhar zonas (bounds)          │
│ 🪑 móveis │                                    │
│ 🖥 objs   │   [ Salvar layout ]  [ Publicar ]  │
└──────────┴───────────────────────────────────┘
```
- Define zonas (fronteiras de áudio), coloca objetos, salva versões de Layout.

## Fluxo de navegação

```
Login → Onboarding → Escritório ──(entra na zona MEETING)──► Overlay de reunião
                          └──(admin)──► Editor de mapa
```
