export const CHARACTER_MODELS = [
  { id: 'cob', label: 'Cob-01 / Coelhinha', icon: '♧', speed: 3.4, health: 6, radius: .62 },
  { id: 'kone', label: 'K-One / Pirâmide', icon: '◬', speed: 3.2, health: 8, radius: .72 },
  { id: 'boxjaw', label: 'Box-Jaw / Arquivista', icon: '▣', speed: 2.9, health: 10, radius: .72 },
  { id: 'eros', label: 'Eros / Morcego', icon: '⋈', speed: 3.9, health: 8, radius: .7, flying: true },
  { id: 'sysadmin', label: 'SysAdmin / Vulto', icon: '♙', speed: 3.2, health: 12, radius: .34 },
  { id: 'cobaia', label: 'Cobaia-00 / Terminal', icon: '♜', speed: 3.1, health: 10, radius: .4 },
  { id: 'error404', label: 'Error 404 / Aberração Pop-up', icon: '⚠', speed: 3.0, health: 14, radius: .92, enemy: true, slots: [['body','Massa orgânica / corpo'],['mouth','Interior da boca'],['teeth','Dentes'],['legs','Pernas digitais'],['screens','Monitores / imagens'],['alerts','Janelas de erro'],['core','Glitch / núcleo']] },
  { id: 'crtcat', label: 'CRT-07 / Gato-monitor', icon: '⌁', speed: 3.7, health: 8, radius: .58, slots: [['body','Corpo / pelúcia'],['head','Carcaça CRT'],['screen','Rosto / tela'],['ears','Orelhas'],['feet','Patas'],['tail','Cauda'],['core','Núcleo / coração']] },
  { id: 'diskbot', label: 'Disk-03 / Robô de disquete', icon: '▧', speed: 3.3, health: 10, radius: .54, slots: [['body','Corpo metálico'],['head','Disquete / cabeça'],['shutter','Proteção metálica'],['eyes','Visor / olhos'],['hands','Mãos'],['feet','Pés'],['core','Cassete / núcleo']] },
  { id: 'patchdoll', label: 'Patch-02 / Boneca de retalhos', icon: '✣', speed: 3.5, health: 7, radius: .5, slots: [['body','Corpo de tecido'],['head','Cabeça'],['cloth','Vestido / retalhos'],['eyes','Olhos de botão'],['stitches','Costuras'],['hair','Cabelo / laço'],['emblem','Pingente']] },
  { id: 'filemoth', label: 'Noct-08 / Mariposa de arquivo', icon: '⋈', speed: 4.0, health: 7, radius: .56, flying: true, slots: [['body','Corpo / tecido'],['head','Cabeça'],['wings','Asas de arquivo'],['eyes','Olhos'],['antennae','Antenas'],['markings','Marcas / texto'],['core','Núcleo luminoso']] },
  { id: 'chronoguard', label: 'Chrono-09 / Guardião-relógio', icon: '◷', speed: 3.0, health: 12, radius: .66, slots: [['body','Corpo / casaco'],['head','Moldura do relógio'],['dial','Mostrador'],['hands','Ponteiros'],['limbs','Braços e pernas'],['gears','Engrenagens'],['core','Pêndulo / núcleo']] },
];
export const characterDefinition = id => CHARACTER_MODELS.find(c => c.id === id) || CHARACTER_MODELS[0];
export const validCharacter = id => CHARACTER_MODELS.some(c => c.id === id);

export const NEW_CHARACTER_APPEARANCE = {
  error404: { body: ['none','#281329'], mouth: ['none','#08080e'], teeth: ['none','#e0cab0'], legs: ['metal','#652849'], screens: ['eye','#ffffff'], alerts: ['alert','#ffffff'], core: ['static','#cd579e','#59273f'] },
  crtcat: { body: ['none','#7eaea6'], head: ['metal','#23383f'], screen: ['static','#dbf5ed','#28584e'], ears: ['none','#c089ac'], feet: ['none','#203735'], tail: ['none','#7eaea6'], core: ['none','#a2dfce','#3e7464'] },
  diskbot: { body: ['metal','#658186'], head: ['none','#364e69'], shutter: ['metal','#afc2c4'], eyes: ['none','#f4d188','#79692f'], hands: ['metal','#809499'], feet: ['none','#253e48'], core: ['none','#91c9bb','#31584c'] },
  patchdoll: { body: ['none','#d0b9a2'], head: ['none','#e1c9af'], cloth: ['plaid','#ffffff'], eyes: ['none','#1c222b'], stitches: ['none','#794b52'], hair: ['none','#795456'], emblem: ['none','#cd6894'] },
  filemoth: { body: ['none','#a3a69b'], head: ['none','#e0d6bd'], wings: ['paper','#e5d6b6'], eyes: ['none','#29424a','#16292d'], antennae: ['none','#3a5958'], markings: ['none','#485366'], core: ['none','#93d7d4','#3d7673'] },
  chronoguard: { body: ['plaid','#65607b'], head: ['metal','#ba9a61'], dial: ['clock','#ffffff'], hands: ['none','#18232b'], limbs: ['metal','#5b7276'], gears: ['metal','#cfb17a'], core: ['none','#b1e3bf','#3f7559'] },
};
