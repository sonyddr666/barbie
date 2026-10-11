# HYPER-SLEEP / The Palace — primeira versão jogável

**Abra `JOGAR.cmd` com dois cliques.** Ele inicia o servidor local e abre o jogo no navegador. Deixe a janela do servidor aberta enquanto joga.

Também é possível executar `npm start` nesta pasta e acessar o endereço exibido no terminal. As dependências estão instaladas; para reinstalar, execute `npm install`. É necessário Node.js.

## Controles

| Tecla | Ação |
|---|---|
| WASD / setas | Mover em relação à câmera |
| Mouse | Girar a câmera |
| Shift | Correr — faz barulho e atrai Eros |
| Espaço | Pular |
| Ctrl / C | Agachar (segurar Ctrl ou alternar com C) |
| E | Interagir, coletar e salvar |
| I / Tab | Abrir inventário e lista de itens |
| M | Abrir / fechar mapa |
| Esc | Pausar / retomar |

Se o navegador não capturar o mouse, arraste sobre o cenário para girar a câmera.

## Objetivo

Recupere os **três disquetes** e restaure `COB_01.EXE` no terminal do corredor norte.

- Converse com **K-One** para descobrir a costura da sala amarela.
- A escadaria no lado esquerdo do átrio leva à **passarela superior**.
- **Box-Jaw**, no Arquivo Morto, explica os backups e as ameaças.
- A cápsula **Hyper-Sleep**, próxima do início, recupera os corações e salva posição e arquivos no navegador.
- **Eros** investiga ruídos. Sua sombra avisa antes do mergulho: saia dela e busque cobertura.
- **Watchers** podem ser desligados. Evite encarar o **SysAdmin** por muito tempo.
- Janelas de erro têm escolhas: “OK” faz barulho; “Cancelar” oferece um intervalo de silêncio.

O backup persiste após fechar o navegador. Ao perder os três corações, o jogo restaura o último checkpoint e os arquivos que estavam salvos nele. Depois de concluir, é possível continuar explorando.

O Palace também tem cápsulas portáteis de cura, uma chave e um registro para coletar. O inventário mostra nomes, quantidades e descrições. Use a cápsula pela lista para recuperar integridade. O checkpoint guarda os itens carregados e os coletáveis já retirados do cenário.

## Conteúdo desta versão

Átrio alagado, corredores, salas amarelas, Arquivo Morto, passagem secreta, passarela navegável, NPCs, três memórias, integridade, perseguição, checkpoint e final curto. A geometria, texturas e personagens são construídos em 3D; a tela inicial usa uma imagem das referências.

O HTML antigo permanece disponível como referência do laboratório de texturas. O jogo novo começa em `index.html`.

## Editor de mapas / Palace Engine

Abra **`EDITAR.cmd`** ou acesse **`/editor.html`** no mesmo servidor do jogo. O editor inclui construção de cenários, materiais e imagens recortadas, personagens configuráveis, desfazer/refazer, salvamento automático, projetos JSON e teste jogável. Veja os controles e o formato do projeto em **`ENGINE.md`**.
