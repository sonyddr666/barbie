# Personagens jogáveis / engine 0.8

Os **12 modelos** podem ser usados como protagonistas, NPCs, inimigos ou projeções.

## Seis novos personagens

| Modelo | Visual e partes |
|---|---|
| Error 404 / Aberração Pop-up | Massa orgânica, boca circular, dentes, três pernas, monitores e alertas; baseado na referência do chefe |
| CRT-07 / Gato-monitor | Corpo de pelúcia, cabeça CRT, tela/rosto, orelhas, patas, cauda e núcleo |
| Disk-03 / Robô de disquete | Cabeça de disquete, proteção metálica, visor, corpo mecânico, mãos, pés e cassete no peito |
| Patch-02 / Boneca de retalhos | Tecido, vestido xadrez, olhos de botão, cabelo/laço, costuras e pingente |
| Noct-08 / Mariposa de arquivo | Corpo, cabeça, olhos, antenas, asas de papel, marcas de arquivo e núcleo |
| Chrono-09 / Guardião-relógio | Casaco, moldura e mostrador, ponteiros animados, membros mecânicos, engrenagens e pêndulo |

Os materiais dessas partes são editáveis no inspector, incluindo imagens importadas. Os cinco personagens além do Error 404 são novas criações para o universo do Palace.

## Escolher o protagonista

- No topo do editor, use **Protagonista** para escolher qualquer um dos 12 modelos.
- Para usar um NPC já personalizado, selecione-o e clique em **Usar este personagem como principal**. A aparência, escala e configurações vêm desse NPC; a entrada do mapa define o ponto inicial. O NPC escolhido não aparece como outro inimigo ou guia durante esse teste.
- A opção **Da entrada / NPC principal** usa a configuração personalizada do mapa.
- O gerador também possui **Protagonista do mapa**.
- Durante o teste, **V** abre a seleção. Trocar mantém inventário, arquivos coletados, checkpoints e estado das janelas.
- No jogo principal, escolha pelo menu inicial; **V** pausa e permite trocar antes de retomar.

## Ajustes de controle

Todos usam WASD, corrida, pulo, agachamento, interação e inventário. Câmera e colisor acompanham o modelo. **Adaptar tamanho** reduz modelos grandes para uma altura jogável de até 3,2 m ou para o espaço disponível sob o teto, preservando as proporções. Desmarque para usar a escala original da cena.

Personagens com asas continuam usando gravidade e pulo; as asas animam de modo diferente no chão e no ar. O avatar usa controle do jogador, em vez da IA do NPC. A seleção e as configurações são salvas no JSON.
