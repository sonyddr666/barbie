# Palace Engine / editor de mundos

Abra **`EDITAR.cmd`** ou acesse **`http://127.0.0.1:8087/editor.html`** enquanto o servidor dessa porta estiver ligado. O menu do jogo também tem um link para o editor.

Esta é a primeira versão da engine específica para Hyper-Sleep: editor de cenas, materiais, personagens, persistência e execução de mapas no navegador.

## Geração automática de mapas completos

Clique em **Gerar mapa completo** na Biblioteca. O gerador combina **6 setores visuais** das referências com **10 estruturas**:

- Visuais: Buffer submerso, Salas Amarelas, Arquivo Morto, BSOD Shrine, Palace/hotel e Memória Fantasma.
- Estruturas: DFS/corredores longos, Prim/bifurcações curtas, Kruskal/rede equilibrada, árvore binária/direcional, divisão recursiva de salas, trançado com loops, salas e corredores, hotel, anéis e sandbox aberto.

Escolha um tamanho: **7 × 7**, **11 × 11**, **17 × 17**, **23 × 23** ou dimensões personalizadas entre **7 e 30 células** por lado. As células têm de **5 a 10 metros**, e o mapa pode ter **1 a 3 andares**. Também é possível configurar rotas extras/loops, decoração, quantidade de disquetes, dificuldade, NPCs, janelas, água, tetos e passagens secretas.

**Atualizar prévia** mostra a planta de cada andar, entrada, saída, memórias, checkpoints e ligações de escada. A rota até a saída pode ser exibida. As estatísticas mostram dimensões em metros, células conectadas, becos, loops e quantidade de objetos. A mesma **semente** e as mesmas opções reproduzem o mapa; o botão ↻ cria outra semente.

**Gerar no editor** substitui a cena por um setor completo com pisos, paredes, entrada, terminal de saída, objetivos alcançáveis, checkpoints, iluminação e itens. NPCs e ameaças dependem das opções. O atlas ativo é reutilizado quando marcado. A operação pode ser desfeita com **Ctrl+Z**.

As escadas entre andares ficam em corredores externos e alternam os lados do prédio, evitando que a rampa de cima bloqueie a de baixo. Memória Fantasma usa plataformas e pontes. Os tetos podem ser ocultados na edição; são exibidos e têm colisão durante o jogo.

O gerador mantém o limite de objetos da engine. Combinações muito grandes, especialmente plataformas com vários andares, mostram uma mensagem pedindo tamanho ou número de andares menor. A prévia calcula esse limite antes de alterar a cena.

Os parâmetros e a topologia inicial ficam no JSON junto dos objetos. Depois de gerar, tudo pode ser editado normalmente. A planta do gerador representa a estrutura inicial; alterações manuais nas paredes não recalculam essa planta.

## Ferramentas de construção manual

1. Escolha um objeto na **Biblioteca** e clique na viewport para inserir. É possível inserir várias vezes; **Q** ou **Esc** encerra a ferramenta.
2. Use **Snap** para alinhar à grade. O campo **Altura** controla o andar de construção.
3. Clique em um objeto ou escolha seu nome na aba **Cena**. Use o gizmo ou os valores do **Inspector**.
4. **W** move, **E** gira no eixo Y e **R** escala. **F** enquadra a seleção. Botão direito orbita a câmera, botão do meio desloca e scroll aproxima. Há uma vista superior.
5. **Ctrl+C** copia o objeto inteiro e **Ctrl+V** cola uma cópia independente, incluindo materiais, imagens, propriedades e comportamento. **Ctrl+X** recorta. Os botões Copiar/Colar na barra também funcionam. Ao editar um nome ou diálogo, esses atalhos continuam copiando o texto normalmente.
6. **Ctrl+D** duplica, **Delete** exclui, **Ctrl+Z** desfaz e **Ctrl+Shift+Z** refaz. Copiar não altera a cena; colar e recortar podem ser desfeitos.

Os pisos usam a posição Y como altura da superfície. Paredes, rampas, caixas e personagens usam a posição Y como base. A rampa sobe em direção ao seu eixo local -Z; gire-a para mudar a direção. Objetos marcados com **Colisão** bloqueiam o jogador. Desmarque-a para criar paredes falsas.

### Cantos e conexões

Selecione uma peça e use **Encaixe de peças → Conectar à peça próxima** ou **Alt+C**. O editor aproxima as faces de paredes, blocos e pisos alinhados aos eixos e conecta a base ou o topo de rampas ao piso correspondente. A operação atua em peças próximas (até 5 m), preserva as dimensões e pode ser desfeita.

Marque **Encaixar bordas ao construir** para fazer esse ajuste na colocação e ao terminar de mover com o gizmo. Desmarque para posicionar livremente. O encaixe usa as bordas reais, incluindo a espessura das paredes, em vez de alinhar apenas seus centros à grade.

Rampas agora têm volume sólido, laterais, face traseira e parte inferior. A câmera também considera esse volume. Arquivos antigos recebem a correção de colisão ao abrir. O colisor do jogador acompanha o tamanho do modelo; em caso de sobreposição com um bloco, o teste procura uma posição livre próxima ou recupera uma posição segura.

## Texturas

### Importar a prancha inteira (atlas 4 × 4)

Clique em **Importar atlas 4 × 4**, na Biblioteca, e selecione a imagem quadrada dos 16 materiais. A engine recorta automaticamente as quatro linhas, incorpora os PNGs no projeto e aplica as texturas ao mapa e aos personagens. Aceita também imagens cuja dimensão não é divisível por quatro, como 1254 × 1254.

Na aba **Texturas**, escolha recortes de 128, 256 ou 512 pixels. Clique em um material para aplicá-lo à parte selecionada no inspector. **Aplicar atlas no mapa** refaz a distribuição automática. Imagens personalizadas já usadas nos objetos são preservadas, a menos que você marque **Substituir imagens personalizadas**.

Ordem esperada, da esquerda para a direita:

1. Tijolo com musgo, azulejo, papel amarelo, concreto.
2. Metal oxidado, madeira, carpete, água.
3. Xadrez rosa, tecido azul-petróleo, tecido vermelho, pelúcia branca.
4. Olho, dentes, lábios, estática CRT.

Cob-01 recebe xadrez e pelúcia; K-One recebe tecido azul e olho; Box-Jaw recebe concreto, tecido vermelho, dentes e olho na lateral. Cenários recebem os materiais correspondentes. Os novos objetos também usam o atlas ativo. O pacote continua disponível ao criar um mapa vazio ou carregar o exemplo e é exportado junto do JSON. Importar e aplicar podem ser desfeitos.

- Escolha uma superfície procedural ou **Importar / recortar** para PNG, JPEG e WebP.
- Arraste a imagem dentro do quadro, ajuste zoom, rotação, espelhamento e resolução e pressione **Aplicar textura**.
- Use repetição U/V, rotação UV, cor, emissão, rugosidade, metal e opacidade no inspector.
- **Copiar material / Colar** reaplica o mesmo material em outro objeto ou parte.
- As imagens recortadas são incorporadas no projeto; não dependem da localização do arquivo original.

### Escala e alinhamento das texturas

Em **Escala / junções da textura**, use **Alinhado ao mundo / por metro** para arquitetura. O padrão conserva seu tamanho entre peças de dimensões diferentes; faces estreitas recebem um trecho proporcional da imagem. Pisos e cantos de 90° compartilham uma origem de textura. Use o mesmo material, escala, repetição, rotação e offset nas peças que precisam de continuidade.

**Largura / altura do padrão** são medidas em metros. Repetição U/V multiplica a densidade; offset desloca a imagem. **UV local** permite encaixar a imagem por peça, útil quando você quer uma composição específica. A superfície da rampa tem UVs contínuos entre seus dois triângulos.

Materiais de projetos antigos são migrados para escala por metro mantendo a densidade configurada. Você pode reajustar essa escala no inspector e copiar o material para as peças vizinhas.

## Janelas Windows no mundo 3D

Na Biblioteca, clique em **Criar janela Windows** ou escolha um objeto na categoria **Janelas / Windows**. Há **14 modelos**: erro, aviso, confirmação, escolha com três botões, informação, mensagem com retrato da Coelhinha, Watcher, Echo, imagem personalizada, progresso, propriedades com abas, explorador, terminal e BSOD.

O inspector **Janela Windows** permite editar:

- Tema **Clássico / 95–98** ou **XP / Luna**; título, mensagem, ícone e cores.
- Barra de título e controles **fechar, minimizar e maximizar/restaurar**.
- **Zero, um, dois ou três botões**, cada um com texto, ação e opção de fechar após a ação.
- Menus, barra de status, abas com textos próprios, lista de arquivos e campos `Rótulo=Valor`.
- Progresso inicial e velocidade, resposta de ações e recuperação de HP.
- Janela fixa na parede ou flutuante, orientação fixa ou voltada à câmera/jogador, e oscilação vertical.

Para colocar um Watcher ou Echo na parede, clique diretamente numa face da parede durante a construção. A orientação é ajustada à face. Janelas são posicionadas pelo **centro**; a espessura é a dimensão Z. Use **Colisão** se a janela deve ser um obstáculo físico.

Para imagens, selecione a parte **Imagem do conteúdo / cor** no Material e importe uma foto ou use uma textura da biblioteca. Há enquadramento por imagem inteira, preencher ou esticar. Os modelos de olho e boca usam o atlas quando disponível. O modelo de mensagem/retrato aceita uma imagem menor junto do texto.

**Prévia interativa** testa os controles no editor. No mapa, **E** abre a janela para ler, usar os botões ou editar campos; também é possível clicar nos controles do objeto 3D. **Esc** sai da interação. Minimizar mantém a barra de título no mundo; maximizar aumenta a janela, e fechar remove sua colisão.

As ações disponíveis são fechar, gerar alerta/ruído, silenciar inimigos, ignorar, recuperar integridade, salvar checkpoint, pausar/retomar progresso e mostrar resposta. Janelas de olho podem informar SysAdmin. O modo de teste guarda os estados de janela no checkpoint; voltar ao editor restaura a configuração original. Tudo é salvo no projeto JSON, incluindo as imagens e os botões.

## Personagens e entidades

Modelos disponíveis: Cob-01, K-One, Box-Jaw, Eros, SysAdmin e Cobaia-00. É possível editar roupa/asas, corpo, rosto/visor e detalhes separadamente, além de proporções da cabeça e orelhas/chifres.

O menu de materiais agora mostra as partes reais de cada modelo. Eros tem **cabeça, tronco, boca, asas, olhos, chifres e coração** independentes. Cobaia-00 tem telas separadas na cabeça e no peito, além do wireframe editável por cor. Clicar numa superfície seleciona sua parte. Consulte a tabela completa e a migração dos materiais antigos em **`PERSONAGENS-MATERIAIS.md`**.

Papéis: **NPC**, **Inimigo**, **Projeção/cache** e **Jogador inicial**. NPCs exibem o diálogo configurado. Inimigos usam velocidade e percepção configuráveis. Eros reage a ruído; SysAdmin causa dano por exposição visual enquanto houver Watchers ativos. Outros modelos com papel de inimigo perseguem por proximidade e linha de visão.

O tipo **Entrada / jogador** define o avatar e o ponto inicial do teste; sua aparência e velocidade são usadas no modo jogável. O primeiro ponto inicial visível é usado. Um personagem comum também pode assumir o papel de jogador quando não houver uma Entrada visível.

### Vida e movimento

- **Vida máxima (HP):** jogadores, NPCs e inimigos começam o teste com a vida configurada. Barras sobre os personagens mostram o valor atual.
- **Dano do ataque:** controla quanto os inimigos removem da vida do jogador.
- **Invulnerável:** impede a perda de vida. Projeções/cache são protegidas no teste.
- **Repouso:** o NPC tem animação sutil e olha para o jogador quando ele se aproxima.
- **Passear:** escolhe trajetos dentro do raio configurado, respeitando pisos e obstáculos.
- **Seguir:** acompanha o jogador quando o percebe, sem encostar nele.
- **Animação de repouso:** pode ser desligada por personagem.

No modo de teste, **P** aplica um pulso de diagnóstico de **1 HP** ao personagem mais próximo, dentro de seis metros e sem paredes entre ele e o jogador. Isso permite verificar dano e morte sem precisar configurar um combate. Com zero HP, o processo é encerrado e deixa de conversar, andar ou atacar. O checkpoint registra também a vida e a posição dos personagens; o rollback recupera esse estado. Voltar ao editor restaura a cena e as poses originais.

## Testar o mapa

Pressione **Testar mapa**. É necessário um piso sob a entrada e espaço livre para o jogador.

**WASD** move, mouse controla a câmera, **Espaço** pula, **Shift** corre, **Ctrl** agacha enquanto pressionado e **C** alterna o agachamento. **E** interage e pega objetos; **I** (ou Tab durante a exploração) abre o inventário. Se a captura do mouse estiver indisponível, arraste para girar a câmera. **Esc** fecha o inventário primeiro; fora dele, **Esc** ou **Voltar ao editor** encerra o teste.

O agachamento reduz a altura da colisão e o ruído. O jogador não se levanta se houver um obstáculo acima. Pulos respeitam tetos, gravidade e aterrissagem sobre caixas. A força do pulo é editável na entrada do jogador; valor 0 desativa o pulo.

## Itens e inventário

A Biblioteca tem **Chave**, **Cápsula de cura**, **Registro / nota** e **Objeto coletável**. Disquetes também aparecem no inventário.

No inspector **Item / Inventário**, configure nome, código, categoria, quantidade e descrição. Itens com o mesmo código e categoria são agrupados. É possível tornar uma caixa coletável marcando **Pode ser pego com E**. Para consumíveis, configure a recuperação de HP.

O inventário mostra a lista de itens e quantidades, com busca, filtro por categoria e detalhes. Registros exibem o texto configurado. Cápsulas podem ser usadas para curar; com integridade cheia, elas não são consumidas. Chaves e objetos são guardados como itens de exploração; os terminais desta versão continuam exigindo os disquetes do mapa.

Abrir o inventário pausa o teste e libera o mouse. Checkpoints guardam o inventário e os objetos já pegos; um rollback restaura ambos. Voltar ao editor restaura os objetos originais. As configurações dos itens são salvas, copiadas e exportadas junto do projeto.

- Disquetes definem o total de memórias exigidas pelo terminal.
- Cápsulas recuperam integridade e registram checkpoints durante o teste.
- Monitores podem ser desligados e têm mensagens editáveis.
- NPCs mostram diálogos.
- O terminal encerra o objetivo quando todos os disquetes foram recuperados.
- Queda no vazio ou perda de integridade restaura o último checkpoint do teste.

Coletas, movimentos de inimigos e checkpoints do teste não alteram o projeto editado. É possível testar novamente desde a entrada.

## Salvar e compartilhar

O editor salva automaticamente no **IndexedDB deste navegador**. **Salvar / Ctrl+S** força o backup. **Exportar** baixa um arquivo `.palace.json` com objetos, ambiente, comportamentos e imagens. **Abrir JSON** recupera o arquivo, inclusive em outro navegador com o editor.

**Novo** cria uma cena vazia. **Carregar setor de exemplo** recupera o laboratório incluído. Ambas as ações pedem confirmação para substituir a cena aberta.

## Estrutura

- `editor.html`, `editor.css`, `editor.js`: interface e ferramentas de edição.
- `palace-engine.js`: formato de projeto, validação, materiais, modelos, geometria, colisões e armazenamento.
- `palace-runtime.js`: modo jogável dos projetos.
- `game.js`: primeira versão do jogo original, acessível separadamente.

Esta versão não inclui edição de vértices, importação de modelos GLTF/FBX, animação por esqueleto ou um editor visual de scripts. Os personagens são modelos procedurais parametrizados e os comportamentos são os componentes prontos descritos acima.
