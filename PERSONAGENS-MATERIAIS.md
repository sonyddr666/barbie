# Auditoria dos materiais / personagens

Cada parte abaixo tem um material independente, editável em **Material / textura → Parte do objeto**. Clicar numa superfície do personagem também seleciona sua parte no inspector.

| Modelo | Partes disponíveis |
|---|---|
| Cob-01 | Pelúcia dos braços/pernas/cauda; cabeça; exterior das orelhas; interior das orelhas; vestido; olhos; nariz/imagem facial; bochechas; coração/pingente |
| K-One | Capuz prismático; manto; olho/visor; mãos; pés |
| Box-Jaw | Cabeça de concreto; manto; boca/dentes; olho lateral; mãos; pés |
| Eros | Cabeça; tronco; boca/dentes; asas; olhos; chifres; coração da testa |
| SysAdmin | Corpo de sombra; cabeça; núcleo do peito; olhos luminosos |
| Cobaia-00 | Estrutura/braços/pernas; carcaça da cabeça; tela da cabeça; tela do peito; linhas de wireframe |
| Error 404 | Massa orgânica; interior da boca; dentes; pernas; monitores; janelas de erro; núcleo/glitch |
| CRT-07 | Corpo; carcaça CRT; tela/rosto; orelhas; patas; cauda; núcleo |
| Disk-03 | Corpo; cabeça/disquete; proteção metálica; olhos/visor; mãos; pés; núcleo/cassete |
| Patch-02 | Corpo; cabeça; vestido; botões/olhos; costuras; cabelo/laço; pingente |
| Noct-08 | Corpo; cabeça; asas; olhos; antenas; marcas de arquivo; núcleo |
| Chrono-09 | Casaco; moldura; mostrador; ponteiros; membros; engrenagens; pêndulo |

## Correções da auditoria

- As asas de Eros têm material próprio, separado do tronco. O coração e os chifres também são independentes.
- As UVs das asas cobrem uma imagem inteira por asa, com espelhamento entre esquerda e direita.
- Olhos, mãos e pés editáveis substituem cores fixas usadas nos modelos antigos.
- Cobaia-00 tem imagens independentes nos dois monitores. Seu wireframe permite editar cor, emissão e opacidade; linhas não usam imagens.
- O tamanho da cabeça agora acompanha também o visor/olhos e a boca nos modelos que usam essas peças.
- SysAdmin tem os olhos luminosos da referência, além do núcleo ciano.

## Projetos existentes

Ao abrir projetos antigos, os novos materiais são derivados das partes que já os desenhavam. Por exemplo, o antigo material `cloth` de Eros é copiado para `torso` e `wings`; `accent` é copiado para chifres e coração. As cópias são independentes. Os campos antigos permanecem no JSON para compatibilidade, mas o menu mostra apenas as partes realmente usadas por cada modelo.

Uma textura escolhida pelo usuário não é substituída na migração. Assim, se a cabeça de Eros tiver carpete aplicado, ela continuará com esse carpete. **Aplicar atlas no mapa** é a ação explícita que redistribui os materiais do atlas conforme a direção visual.

No Eros padrão, cabeça e corpo recebem pelúcia com tom magenta; as asas têm membrana própria; boca/dentes usam a imagem da arcada; chifres e coração têm materiais separados. O atlas desta versão contém tecido vermelho, que é usado com tonalidade rosa nas asas; você pode importar uma imagem específica de membrana nesse material.
