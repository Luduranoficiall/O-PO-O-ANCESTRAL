# O Poço Ancestral: Memórias e Reconstrução

Um jogo idle aconchegante e narrativo em que você reconstrói uma vila de mineração ao redor de um poço ancestral, gerencia trabalhadores e forjas, e apoia as expedições automáticas de um herói pelas profundezas para recuperar o medalhão de pedra azul perdido pelo seu avô.

### Decisões Confirmadas & Respostas do Usuário

> [!IMPORTANT]
> As preferências do jogador foram confirmadas e integradas diretamente na arquitetura do jogo:

- **Estilo Visual Confirmado**: Vista isométrica aconchegante com iluminação suave de lanternas, fumaça de chaminés, partículas de brasas e cristais brilhantes.
- **Ambientação Sonora Confirmada**: Sintetizador procedural com Web Audio API reproduzindo melodias quentes e relaxantes, além de efeitos táteis para colheitas, martelos de forja e passos no poço (com controle de mudo e volume).
- **Acompanhamento do Poço Confirmado**: Visor lateral animado em tempo real com barra de vida, monstros temáticos, feedback visual de combate e registro narrativo dos andares.
- **Persistência de Dados**: Salvamento automático em `localStorage` com cálculo de tempo offline (rendimento de expedições de 10 min a 12 horas).

---

### 1. Visão Geral e Conceito Central

- **O Que É**: Uma experiência idle/gerencial relaxante com forte carga emocional. O jogador divide o tempo entre cuidar da superfície (posicionando serrarias, forjas, oficinas e cabanas, atribuindo trabalhadores e forjando ferramentas) e monitorar a descida no poço onde o aventureiro enfrenta 7 masmorras (10 andares cada).
- **Público-Alvo**: Fãs de jogos idle relaxantes que valorizam progressão tangível, estética reconfortante e uma história íntima sobre tempo, velhice e memória familiar.
- **Valor Principal**: A sensação de ver a vila desolada se transformar em um vilarejo vivo, com lanternas acesas na noite e operários diligentes, enquanto o poço revela segredos ancestrais e as 6 partes do Selo do Fundador.

---

### 2. Experiência do Usuário & Design Visual

- **Fluxos Principais do Usuário**:
  1. *A Chegada & O Diálogo com o Avô*: O jogador é apresentado ao poço no centro da vila e ao avô, que conta sobre o medalhão de pedra azul e presenteia as primeiras ferramentas.
  2. *Reconstrução da Vila (Grade Isométrica)*: Coleta manual de recursos iniciais (madeira, pedra, ferro e cristais) e posicionamento livre de construções (Serraria, Pedreira, Forja, Armazém, Oficina Arcana).
  3. *Gestão de Trabalhadores & Refino*: Contratação de lenhadores, pedreiros, mineiros e lapidários. Transformação de matéria bruta em tábuas de carvalho, blocos talhados, lingotes fundidos e catalisadores puros.
  4. *Expedições & Ganhos Offline*: Envio de operários em expedições programadas (10m, 1h, 4h, 8h, 12h) com relatório caloroso ao retornar.
  5. *Forja & Equipamentos do Herói*: Fabricação e melhoria de 10 níveis para Arma, Armadura, Escudo e Amuleto, além de 3 tiers de ferramentas da vila.
  6. *Descida ao Poço*: Visor lateral ativo com o aventureiro avançando andar por andar, encontrando 42 relíquias com fragmentos da história e enfrentando chefes de masmorra.
  7. *Árvores de Habilidades*: Ramos de Mineração/Vila (rendimento, velocidade, capacidade, eficiência) e Combate (vida, ataque, armadura, roubo de vida, bênção ancestral).

- **Identidade Visual & Paleta**:
  - *Ambiente*: Noturno acolhedor com tons terrosos profundos, ardósia, madeira envelhecida e âmbar dourado das lanternas (`#181512` fundo, `#2B221B` superfícies, `#D97706` calor de lanterna, `#38BDF8` brilho místico do poço/medalhão, `#10B981` vitalidade vegetal).
  - *Tipografia*: Display refinado e acolhedor, textos claros com espaçamento confortável e numerais tabulares (`tabular-nums`) para estoques e contadores.
  - *Zero-Pill & Anti-Slop*: Sem caixas flutuantes genéricas ou tags mecânicas; status exibidos com tipografia limpa, separadores pontuais (`·`) e barras táteis de progresso com texturas sutis.

- **Micro-Interações & Áudio Procedural**:
  - Efeitos táteis de estalo de madeira, martelar suave de ferro e sinos harmônicos de cristal gerados por Web Audio API (sem dependências de áudio externas).
  - Partículas de folhas ao cortar madeira, poeira de pedra ao picaretar e brasas flutuantes sobre a forja.
  - Modo Zen / Foco com transição suave entre a Vila e o Poço.

---

### 3. Decisões de Produto & Compromissos de Engenharia

- **Decisão 1: Canvas Isométrico Interativo vs Grade DOM**:
  - *Abordagem Escolhida*: Renderizador Canvas 2D isométrico fluido com suporte a arraste de câmera, clique em lotes para posicionar edifícios, partículas e animações a 60fps, acoplado ao estado reativo do React.
  - *Por quê*: Permite liberdade estética autêntica ("onde você quiser no mapa"), animações sem gargalo de DOM e atmosfera aconchegante com iluminação dinâmica por pixel/gradiente.
- **Decisão 2: Motor de Simulação Idle & Progressão Offline**:
  - *Abordagem Escolhida*: Tique de simulação com delta de tempo no `requestAnimationFrame` + cálculo determinístico de tempo decorrido ao reabrir a aba (`Date.now() - lastSavedTimestamp`).
  - *Por quê*: Garante que o jogador nunca perca recursos, respeitando o limite de 10m a 12h de expedições definido no briefing.
- **Decisão 3: Combate Automático sem Bloqueio**:
  - *Abordagem Escolhida*: O loop de combate roda no background do jogo independentemente da tela ativa (seja inspecionando a forja, a vila ou a árvore de talentos). O jogador pode abrir o visor lateral do poço a qualquer momento para torcer pelo aventureiro e ler o log.

---

### 4. Arquitetura Técnica & Estrutura de Componentes

```
┌────────────────────────────────────────────────────────────────────────┐
│                        App State & Game Engine                         │
│  - Village State (Grid, Buildings, Placements, Upgrades)              │
│  - Resource Inventory (Raw & Refined: Wood, Stone, Iron, Crystal)      │
│  - Workforce Manager (Workers, Assignments, Timed Expeditions)         │
│  - Adventurer & Equipment (Weapon, Armor, Shield, Charm, Levels 1-10)  │
│  - Dungeon Crawler (7 Dungeons, 10 Floors each, Real-time Combat)      │
│  - Skill Trees (Mining/Village Branch, Combat Branch)                  │
│  - Relics & Lore Journal (42 Relics, Founder's Seal, Memory Stones)    │
│  - Audio Engine (Web Audio Synth: Ambiance, Chimes, Tool Impacts)      │
│  - Storage & Offline Delta Engine (localStorage Persistence)           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
           ┌────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌───────────────────────────────────┐               ┌───────────────────────────────────┐
│       Top Village Header          │               │        Village / Well View        │
│  - Resource Strip (Wood/Stone...) │               │  - Isometric Canvas Playfield     │
│  - Offline Reward Modal           │               │  - Building Placement Raycaster   │
│  - Audio & Sound Level Controls   │               │  - Lanterns & Cozy Particle Loop  │
└───────────────────────────────────┘               └───────────────────────────────────┘
           │                                                   │
           ├────────────────────────┬──────────────────────────┤
           ▼                        ▼                          ▼
┌─────────────────────┐  ┌─────────────────────┐   ┌───────────────────────────┐
│ Building & Crafting │  │ Workforce & Expeds  │   │   The Descent (Well HUD)  │
│ - Sawmill (Planks)  │  │ - 4 Worker Classes  │   │ - 7 Thematic Dungeons     │
│ - Quarry (Blocks)   │  │ - Dispatch Window   │   │ - Side-view Combat Canvas │
│ - Forge (Ingots/Eq) │  │ - Offline Collector │   │ - Monster Telegraphs/Log  │
│ - Arcane Workshop   │  │ - Efficiency Perks  │   │ - 42 Relics & Boss Vault  │
└─────────────────────┘  └─────────────────────┘   └───────────────────────────┘
           │                                                   │
           └────────────────────────┬──────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Story, Skill Tree & Lore Modals                      │
│  - Grandfather's Dialogue & Letter Fragments                          │
│  - 6 Founder's Seal Shards Inspection                                  │
│  - Mining Tree & Combat Tree Upgrades                                  │
└────────────────────────────────────────────────────────────────────────┘
```

- **Modelo de Dados Principal**:
  - `resources`: Madeira, Pedra, Ferro, Cristal (cada um em 3 qualidades: bruto, refinado e puro).
  - `buildings`: Posições `(x, y)` na grade isométrica, tipo, nível e bônus de produção.
  - `workers`: Quantidade de lenhadores, pedreiros, mineiros e lapidários, status de expedição e bônus.
  - `adventurer`: HP, Ataque, Defesa, Velocidade, Níveis de Equipamento (+1 a +10), Relíquias ativas.
  - `dungeon`: ID da masmorra (1 a 7), andar atual (1 a 10), monstro ativo, barra de progresso e fragmentos do Selo do Fundador coletados.
  - `skills`: Pontos de conhecimento obtidos pelo progresso, destravando nós permanentes na árvore da vila e de combate.
  - `story`: Diálogos desbloqueados com o avô, páginas de memórias recuperadas e o epílogo do Medalhão de Pedra Azul.
