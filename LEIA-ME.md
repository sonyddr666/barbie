# Hyper-Sleep / Palace Engine — jogo e editor unificados

Abra **`INICIAR_SERVIDOR.bat`** com dois cliques. Ele inicia o servidor na porta **8087** e abre o navegador. Se o servidor do Palace já estiver ligado, ele reutiliza o mesmo endereço.

- **Jogar:** http://127.0.0.1:8087/
- **Editor:** http://127.0.0.1:8087/editor.html

Deixe a janela do servidor aberta enquanto joga. **Ctrl+C** encerra o servidor. É necessário Node.js; o launcher instala Three.js se as dependências estiverem ausentes.

## Um jogo, duas interfaces

O editor cria e modifica o projeto. A página Jogar executa **o projeto salvo pelo editor**, usando os mesmos modelos, materiais, iluminação, física, personagens, janelas e controles.

No editor, clique em **Salvar e jogar**. Isso salva as alterações e abre a página principal. A tela inicial mostra o nome do projeto, quantidade de objetos/imagens e, quando houver, tamanho, andares e semente do mapa gerado.

Se o editor salvar uma nova versão enquanto o jogo estiver aberto, o jogo avisa. Pause e clique em **Recarregar projeto do editor** para jogar essa versão. Também é possível abrir diretamente um `.palace.json` na página principal.

## Controles

| Tecla | Ação |
|---|---|
| WASD | Mover |
| Mouse | Câmera |
| Espaço | Pular |
| Ctrl / C | Segurar para agachar / alternar agachamento |
| Shift | Correr |
| E | Interagir, pegar itens e abrir janelas |
| I / Tab | Inventário |
| V | Pausar e escolher outro protagonista |
| M | Mapa do projeto |
| Esc | Fechar interação ou pausar/retomar |

Se o navegador não capturar o mouse, arraste sobre o cenário para girar a câmera.

## Projeto e checkpoint são coisas diferentes

- **Salvar no editor:** guarda mapa, atlas, materiais, objetos, NPCs e configurações no navegador.
- **Checkpoint no jogo:** guarda a exploração, inventário, itens recuperados, NPCs e estados de janelas para aquela versão do mapa.

Ao editar o mapa, a versão muda e o jogo começa uma exploração compatível com ela. O checkpoint anterior não substitui o projeto novo.

Os dados locais pertencem ao endereço do navegador. Use sempre **127.0.0.1:8087** ou o botão **Salvar e jogar** para manter jogo e editor no mesmo local de armazenamento. Exporte JSON para guardar uma cópia portátil com as imagens incorporadas.

## Arquivos principais

- `index.html`, `play.js`, `play.css`: interface Jogar e carregamento do projeto salvo.
- `editor.html`, `editor.js`, `editor.css`: edição do mesmo projeto.
- `palace-scene.js`: renderizador e ambiente compartilhados.
- `palace-engine.js`: projeto, modelos, materiais, geometria e armazenamento.
- `palace-runtime.js`: execução compartilhada por Jogar e Testar mapa.
- `game.js`: código arquivado do protótipo inicial; não é mais carregado pela página Jogar.

Guias detalhados: **`ENGINE.md`**, **`AVATARES.md`** e **`PERSONAGENS-MATERIAIS.md`**.
