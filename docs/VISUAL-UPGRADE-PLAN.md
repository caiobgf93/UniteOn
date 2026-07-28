# Plano de Upgrade Visual — de "bolinhas" a estilo Gather/Pokémon

## Contexto

O MVP-0 usa formas primitivas do PixiJS (círculos, retângulos) pra avatar e mundo —
suficiente pra provar presença/movimento/áudio, mas visualmente muito distante do
Gather. Este plano descreve como chegar num visual pixel-art estilo RPG clássico, com
**avatares customizáveis** (tom de pele, cabelo, roupa, óculos), mantendo tudo grátis e
sem travar no cronograma. Nenhuma implementação nesta etapa — só o plano.

## Decisões de direção

- **Sprites de personagem**: padrão **LPC (Universal LPC Spritesheet)** — sistema de
  camadas open-source (corpo, cabelo, roupa, acessórios como óculos, cada um um arquivo
  separado no mesmo grid de pose/animação). É exatamente o que permite "escolher peça
  por peça" e é gratuito (CC-BY-SA/GPL, precisa creditar). Estética 16-bit RPG,
  próxima o suficiente do Gather sem copiar arte proprietária.
- **Composição em camadas em runtime** (não pré-renderizar um PNG por combinação):
  cada avatar vira um `PIXI.Container` com uma sprite por camada (corpo, cabelo, roupa,
  acessório), todas compartilhando o mesmo frame de animação/direção. Mais simples de
  implementar e de trocar peças depois; desempenho tranquilo pra dezenas de avatares.
- **Tilemap real via Tiled** (não mais `Graphics` desenhado à mão): tileset Kenney
  (piso, paredes, móveis) editado no Tiled, exportado em JSON, carregado pelo cliente.
  As zonas/colisão lógicas (`OFFICE_ZONES`, `buildOfficeTilemap`) continuam sendo a
  fonte de verdade de gameplay; só a **camada visual** passa a vir de tiles reais.

## Passo a passo de execução

1. **Assets e manifesto**
   - Baixar/organizar LPC (gerador oficial: *Universal LPC Spritesheet Character
     Generator*, open-source) — camadas de corpo (variação de tom de pele), cabelo
     (estilos + cores), roupas, óculos/acessórios.
   - Baixar tileset Kenney (piso, paredes, móveis de escritório) compatível com o
     grid de 32px já usado.
   - Organizar em `packages/game/assets/` conforme já descrito em `docs/ASSETS.md`
     (`sprites/avatars/`, `tilesets/`, `manifest.json`, `CREDITS.md` com atribuição
     das licenças CC-BY-SA/GPL).

2. **Mapa real no Tiled**
   - Recriar a planta atual (recepção → corredor → escritórios → sala de reunião →
     lounge) como mapa Tiled usando o tileset Kenney, respeitando os limites de zona
     já definidos em `OFFICE_ZONES`.
   - Exportar em JSON; escrever um loader que lê camadas `floor`/`walls`/`furniture`/
     `collision` do formato Tiled (substituindo o gerador procedural só na parte
     visual — a colisão lógica pode continuar vindo do mesmo lugar ou ser
     desenhada como camada própria no Tiled).

3. **Modelo de dados do avatar**
   - Definir `AvatarConfig` em `packages/shared` (tom de pele, estilo/cor de cabelo,
     roupa, acessório, tipo de corpo).
   - Já existe `avatarConfig Json` no `User` (Prisma) — sem migration nova, só passar
     a preencher/ler esse campo de verdade.
   - Estender o protocolo realtime (`Participant`, eventos de presença) pra carregar
     `avatarConfig`, assim os avatares remotos renderizam corretos pros outros.

4. **Compositor de avatar (engine)**
   - Nova classe/função em `packages/game` (ou `apps/web`) que recebe um
     `AvatarConfig` e produz o `Container` com as camadas empilhadas na ordem certa
     (corpo → roupa → cabelo → acessório), com máquina de estados simples de animação
     (idle / andando nas 4 direções).
   - Reaproveitar essa mesma função tanto pro avatar local quanto pros remotos no
     `OfficeCanvas`.

5. **Tela de criação/edição de avatar**
   - Nova tela (parte do fluxo de onboarding já desenhado em `docs/WIREFRAMES.md`):
     escolher cada peça com preview ao vivo usando o mesmo compositor do passo 4.
   - Salvar a escolha via `/me` (endpoint já existe, só adicionar o payload de
     atualização do `avatarConfig`).

6. **Integração no `OfficeCanvas`**
   - Trocar a criação de avatar por `Graphics` (círculo) pela nova sprite em camadas,
     tanto local quanto remoto.
   - Broadcast do `avatarConfig` ao entrar no espaço (`presence_join`/`space_state`) e
     quando o usuário mudar a aparência.

7. **Trocar o render do mundo**
   - Substituir o piso/paredes desenhados via `Graphics` pelo mapa Tiled carregado no
     passo 2, mantendo zonas coloridas (ou um contorno mais discreto) só como debug
     visual opcional.

8. **Verificação**
   - Rodar no navegador com 1 avatar (customização + animação de andar nas 4
     direções) e depois com 2 avatares diferentes (local + remoto) pra confirmar que
     a composição em camadas e o broadcast de `avatarConfig` funcionam.
   - Conferir que a colisão/zonas continuam batendo com o novo mapa visual (nenhuma
     parede "fantasma" ou porta bloqueada).

## Riscos

- **Licença**: LPC é CC-BY-SA/GPL — exige atribuição (`CREDITS.md`); não misturar com
  arte proprietária sem checar compatibilidade.
- **Esforço de asset > esforço de código** nesta fase — organizar/gerar as camadas
  LPC corretas é o gargalo, não a composição em si.
- **Consistência visual**: Kenney (mobiliário) e LPC (personagens) têm estilos
  ligeiramente diferentes; pode precisar de ajuste de paleta/escala pra combinar bem.
