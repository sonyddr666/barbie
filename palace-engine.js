import * as THREE from 'three';
import { WINDOW_PRESETS, windowPreset, normalizeWindow, buildSystemWindow } from './palace-windows.js';
import { CHARACTER_MODELS, NEW_CHARACTER_APPEARANCE, characterDefinition, validCharacter } from './palace-character-registry.js';
import { buildNewCharacter } from './palace-newcharacters.js';
export { CHARACTER_MODELS, characterDefinition, validCharacter };

export const VERSION = 1;
export const clone = value => structuredClone(value);
export const uid = () => crypto.randomUUID();
export const clamp = THREE.MathUtils.clamp;
export const CATALOG = [
  { type: 'floor', label: 'Piso', icon: '▱', category: 'ARQUITETURA' },
  { type: 'wall', label: 'Parede', icon: '▥', category: 'ARQUITETURA' },
  { type: 'box', label: 'Bloco / caixa', icon: '▣', category: 'ARQUITETURA' },
  { type: 'ramp', label: 'Rampa', icon: '◩', category: 'ARQUITETURA' },
  { type: 'water', label: 'Água', icon: '≈', category: 'ARQUITETURA' },
  { type: 'light', label: 'Luz', icon: '☼', category: 'CENÁRIO & LÓGICA' },
  { type: 'screen', label: 'Monitor', icon: '▤', category: 'CENÁRIO & LÓGICA' },
  { type: 'capsule', label: 'Checkpoint', icon: '◒', category: 'CENÁRIO & LÓGICA' },
  { type: 'disk', label: 'Disquete', icon: '▧', category: 'CENÁRIO & LÓGICA' },
  { type: 'exit', label: 'Terminal / saída', icon: '↗', category: 'CENÁRIO & LÓGICA' },
  ...WINDOW_PRESETS.map(p => ({ type: 'window', windowKind: p.key, label: p.label, icon: p.icon, category: 'JANELAS / WINDOWS' })),
  { type: 'spawn', label: 'Entrada / jogador', icon: '♡', category: 'PERSONAGENS' },
  ...[['key', 'Chave', '⚿'], ['heal', 'Cápsula de cura', '♡'], ['note', 'Registro / nota', '▤'], ['material', 'Objeto coletável', '◈']].map(([kind, label, icon]) => ({ type: 'item', kind, label, icon, category: 'ITENS COLETÁVEIS' })),
  ...CHARACTER_MODELS.map(({ id: model, label, icon }) => ({ type: 'character', model, label, icon, category: 'PERSONAGENS' })),
];
export const ATLAS_TILES = [
  ['brick', 'Tijolo com musgo'], ['tile', 'Azulejo úmido'], ['yellow', 'Papel amarelo'], ['concrete', 'Concreto rachado'],
  ['metal', 'Metal oxidado'], ['wood', 'Madeira escura'], ['carpet', 'Carpete mofado'], ['water', 'Água de buffer'],
  ['plaid', 'Xadrez da Cob-01'], ['teal', 'Tecido do K-One'], ['red', 'Tecido do Box-Jaw'], ['fur', 'Pelúcia branca'],
  ['eye', 'Olho humano'], ['teeth', 'Dentes / Box-Jaw'], ['lips', 'Lábios / Echo'], ['static', 'Estática CRT'],
].map(([key, label], index) => ({ key, label, row: Math.floor(index / 4), column: index % 4 }));
export const ARCHITECTURE_TYPES = ['floor', 'wall', 'box', 'ramp', 'water'];
export const CHARACTER_SLOTS = {
  cob: [['body', 'Pelúcia / braços, pernas e cauda'], ['head', 'Cabeça / pelúcia'], ['ears', 'Orelhas / exterior'], ['innerEars', 'Orelhas / interior rosa'], ['cloth', 'Vestido xadrez'], ['eyes', 'Olhos'], ['face', 'Nariz / imagem facial'], ['cheeks', 'Bochechas'], ['emblem', 'Pingente / coração']],
  kone: [['body', 'Capuz prismático'], ['cloth', 'Manto / tecido'], ['face', 'Olho humano / visor'], ['hands', 'Mãos'], ['feet', 'Pés']],
  boxjaw: [['body', 'Cabeça / concreto'], ['cloth', 'Manto vermelho'], ['face', 'Boca / dentes'], ['side', 'Olho lateral'], ['hands', 'Mãos'], ['feet', 'Pés']],
  eros: [['body', 'Cabeça / pelúcia'], ['torso', 'Corpo / tronco'], ['face', 'Boca / dentes'], ['wings', 'Asas / membrana'], ['eyes', 'Olhos'], ['horns', 'Chifres'], ['emblem', 'Coração da testa']],
  sysadmin: [['body', 'Corpo / sombra'], ['head', 'Cabeça'], ['core', 'Núcleo ciano / peito'], ['eyes', 'Olhos luminosos']],
  cobaia: [['body', 'Estrutura / braços e pernas'], ['head', 'Carcaça do monitor / cabeça'], ['face', 'Tela da cabeça'], ['screen', 'Tela do peito'], ['wireframe', 'Linhas / wireframe (cor)']],
  ...Object.fromEntries(CHARACTER_MODELS.filter(m => m.slots).map(m => [m.id, m.slots])),
};
export function characterSlots(model) { return (CHARACTER_SLOTS[model] || CHARACTER_SLOTS.cob).map(([key, label]) => ({ key, label, texture: key !== 'wireframe' })); }
export function mat(preset = 'none', color = '#ffffff', extra = {}) {
  return { preset, color, emissive: '#000000', texture: null, mapping: 'local', tileSize: [3, 3], offset: [0, 0], repeat: [1, 1], uvRotation: 0, roughness: .8, metalness: .05, opacity: 1, ...extra };
}
export function appearance(model = 'cob') {
  const colors = { cob: '#e8e4d8', kone: '#42908c', boxjaw: '#a63753', eros: '#be5188', sysadmin: '#101719', cobaia: '#163a31' };
  const a = {
    body: mat('none', colors[model] || '#d7d9d3'),
    cloth: mat(model === 'cob' ? 'plaid' : 'none', model === 'cob' ? '#ffffff' : colors[model] || '#d7d9d3'),
    face: mat(model === 'cobaia' ? 'static' : model === 'kone' ? 'eye' : model === 'boxjaw' || model === 'eros' ? 'teeth' : 'none', model === 'cob' ? '#090d0d' : model === 'sysadmin' ? '#7ed8ce' : '#ffffff'),
    side: mat(model === 'boxjaw' ? 'eye' : 'none'),
    accent: mat('none', model === 'sysadmin' || model === 'cobaia' ? '#8ae8c3' : '#d889ab', { emissive: model === 'sysadmin' || model === 'cobaia' ? '#306658' : '#000000' }),
  };
  const black = () => mat('none', '#090d0d', { roughness: .85 });
  if (model === 'cob') Object.assign(a, { head: structuredClone(a.body), ears: structuredClone(a.body), innerEars: structuredClone(a.accent), eyes: black(), cheeks: structuredClone(a.accent), emblem: mat('none', '#883d5b') });
  if (model === 'kone' || model === 'boxjaw') Object.assign(a, { hands: model === 'kone' ? black() : mat('none', '#c6baa5'), feet: black() });
  if (model === 'eros') Object.assign(a, { torso: structuredClone(a.body), wings: mat('none', '#963b6d'), eyes: black(), horns: mat('none', '#903b6a'), emblem: mat('none', '#f5b7d3') });
  if (model === 'sysadmin') Object.assign(a, { head: structuredClone(a.body), core: structuredClone(a.accent), eyes: mat('none', '#9bf0e4', { emissive: '#60c6b7', roughness: .25 }) });
  if (model === 'cobaia') Object.assign(a, { head: structuredClone(a.body), screen: structuredClone(a.face), wireframe: mat('none', '#72cdb1', { metalness: 0 }) });
  for (const [key, [preset, color, emissive]] of Object.entries(NEW_CHARACTER_APPEARANCE[model] || {})) a[key] = mat(preset, color, { emissive: emissive || '#000000' });
  return a;
}
export function normalizeAppearance(model, input = {}) {
  input ||= {};
  const defaults = appearance(model), aliases = {
    cob: { head: 'body', ears: 'body', innerEars: 'accent', cheeks: 'accent', emblem: 'accent' },
    kone: { hands: 'body' }, boxjaw: { hands: 'body' },
    eros: { torso: 'cloth', wings: 'cloth', horns: 'accent', emblem: 'accent' },
    sysadmin: { head: 'body', core: 'accent' }, cobaia: { head: 'body', screen: 'face' },
  }[model] || {};
  const result = Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key, normalizeMaterial(input[key] || input[aliases[key]], fallback)]));
  if (model === 'cob' && input.face?.preset === 'none' && input.face.color?.toLowerCase() === '#ffffff') result.face.color = '#090d0d';
  return result;
}
export function createEntity(type, model, project = null) {
  const sizes = { floor: [4, .25, 4], wall: [4, 4, .4], box: [1.5, 1.5, 1.5], ramp: [3, 2, 5], water: [4, .04, 4], light: [1, 1, 1], screen: [1.3, 1.1, .4], window: [3.2, 2, .12] };
  const material = type === 'floor' ? mat('tile', '#ffffff', { repeat: [2, 2], roughness: .3, metalness: .25 }) : type === 'wall' ? mat('brick', '#ffffff', { repeat: [2, 2] }) : type === 'water' ? mat('tile', '#6caa9a', { roughness: .08, metalness: .7, opacity: .45 }) : type === 'screen' ? mat('eye') : mat('metal', '#8e9d87');
  const m = validCharacter(model) ? model : 'cob', definition = characterDefinition(m);
  const entity = {
    id: uid(), type, name: CATALOG.find(c => c.type === type && (!model || c.model === model))?.label || type,
    position: [0, 0, 0], rotation: 0, size: sizes[type] || [1, 1, 1], visible: true,
    collision: ['floor', 'ramp', 'wall', 'box', 'screen', 'exit'].includes(type), material,
    character: { model: m, role: type === 'spawn' ? 'player' : ['eros', 'sysadmin'].includes(m) ? 'enemy' : 'npc', speed: type === 'spawn' ? 3.4 : m === 'eros' ? 3.7 : 2.6, jumpSpeed: 7.3, range: 12, maxHealth: ['eros', 'sysadmin'].includes(m) ? 12 : 6, damage: 1, invulnerable: false, movement: 'idle', wanderRadius: 4, idleAnimation: true, headScale: 1, earScale: 1, dialogue: m === 'kone' ? 'Observe as paredes. O sistema nem sempre lembra de fechá-las.' : m === 'boxjaw' ? 'Cada checkpoint guarda uma versão sua. Recupere os arquivos antes de sair.' : 'Este setor ainda guarda memórias.', appearance: appearance(m) },
    pickup: { enabled: type === 'disk' || type === 'item', itemId: type === 'item' ? 'fragmento' : '', name: '', kind: type === 'disk' ? 'disk' : 'material', quantity: 1, description: type === 'disk' ? 'Fragmento necessário para restaurar COB_01.EXE.' : '', heal: 2 },
    light: { color: '#b2e8ce', intensity: 22, range: 14 },
    message: type === 'screen' ? 'WATCHER OFFLINE — o sistema perdeu um olho.' : type === 'exit' ? 'COB_01.EXE successfully restored.' : '',
  };
  if (type === 'item') configureItem(entity, 'material');
  entity.character.maxHealth = definition.health;
  if (type === 'spawn') entity.character.speed = definition.speed;
  if (definition.enemy && type !== 'spawn') entity.character.role = 'enemy';
  if (type === 'window') configureWindow(entity, 'warning');
  if (ARCHITECTURE_TYPES.includes(type)) { entity.material.mapping = 'world'; entity.material.repeat = [1, 1]; }
  if (project) applyAtlasToEntity(entity, project);
  return entity;
}
export function configureWindow(e, preset, preservePlacement = false) {
  const previous = e.window; e.window = windowPreset(preset); e.name = 'Janela / ' + (WINDOW_PRESETS.find(p => p.key === preset)?.label || 'Aviso');
  if (!preservePlacement) e.size = [...(WINDOW_PRESETS.find(p => p.key === preset)?.size || [3.2, 1.45, .12])];
  if (preservePlacement && previous) Object.assign(e.window, { mount: previous.mount, facing: previous.facing, bob: previous.bob });
  e.material = mat(preset === 'eye' ? 'eye' : preset === 'lips' ? 'lips' : 'none');
  e.rotation = previous ? e.rotation : Math.PI; return e;
}
export function configureItem(e, kind) {
  const templates = {
    key: { name: 'Chave de buffer', itemId: 'buffer-key', kind: 'key', description: 'Uma chave preservada nos registros do Palace.' },
    heal: { name: 'Hyper-Sleep portátil', itemId: 'hyper-sleep', kind: 'heal', description: 'Uma cápsula portátil que restaura 2 HP de integridade.', heal: 2 },
    note: { name: 'Registro esquecido', itemId: 'registro', kind: 'note', description: '“O sistema continua guardando uma cópia de cada tentativa.”' },
    material: { name: 'Fragmento de dados', itemId: 'fragmento', kind: 'material', description: 'Um pequeno objeto recuperado da memória do servidor.' },
  };
  const t = templates[kind] || templates.material; e.name = t.name; Object.assign(e.pickup, t, { enabled: true });
  e.material = mat('none', { key: '#d8b766', heal: '#8ac9a9', note: '#d5caa3', material: '#99cec6' }[t.kind], { emissive: t.kind === 'material' ? '#1c4945' : '#000000' }); return e;
}
export function inventoryItem(e) {
  const p = e.pickup;
  return { id: p.itemId || e.id, name: p.name || e.name, kind: e.type === 'disk' ? 'disk' : p.kind, quantity: e.type === 'disk' ? 1 : p.quantity, description: p.description, heal: p.heal };
}
export function newProject() {
  return { format: 'palace-engine', version: VERSION, collisionVersion: 2, name: 'Meu setor do Palace', environment: { background: '#0c1614', fog: '#142822', fogDensity: .018, ambient: 1.6, pixelated: true }, assets: {}, atlas: {}, entities: [] };
}
export function atlasAsset(project, key) { const id = project.atlas?.[key]; return id && project.assets[id] ? id : null; }
export function setAtlasMaterial(m, project, key, { force = false, repeat = m.repeat, color = '#ffffff', roughness = m.roughness, metalness = m.metalness } = {}) {
  const id = atlasAsset(project, key); if (!id) return false;
  if (m.preset === 'custom' && !project.assets[m.texture]?.atlasKey && !force) return false;
  Object.assign(m, { preset: 'custom', texture: id, color, repeat: [...repeat], roughness, metalness }); return true;
}
export function applyAtlasToEntity(e, project, force = false) {
  let changed = false;
  const set = (m, key, extra = {}) => { changed = setAtlasMaterial(m, project, key, { force, ...extra }) || changed; };
  const oldKey = project.assets[e.material.texture]?.atlasKey;
  if (e.type === 'wall') set(e.material, e.material.preset === 'yellow' || oldKey === 'yellow' ? 'yellow' : /concreto/i.test(e.name) ? 'concrete' : 'brick', { repeat: [Math.max(e.size[0], e.size[2]) / 3, e.size[1] / 3], roughness: .9, metalness: .05 });
  if (e.type === 'floor') set(e.material, /amarela|carpete/i.test(e.name) ? 'carpet' : 'tile', { repeat: [e.size[0] / 3, e.size[2] / 3], roughness: /amarela|carpete/i.test(e.name) ? .92 : .3, metalness: .15 });
  if (e.type === 'box') set(e.material, /concreto/i.test(e.name) ? 'concrete' : 'wood', { repeat: [1, 1], roughness: .95, metalness: 0 });
  if (e.type === 'ramp') set(e.material, 'metal', { repeat: [e.size[0] / 2, e.size[2] / 2], roughness: .6, metalness: .45 });
  if (e.type === 'water') set(e.material, 'water', { repeat: [e.size[0] / 3, e.size[2] / 3], roughness: .08, metalness: .6 });
  if (e.type === 'screen') set(e.material, e.material.preset === 'lips' || oldKey === 'lips' ? 'lips' : oldKey === 'static' ? 'static' : 'eye', { repeat: [1, 1], roughness: .35, metalness: .1 });
  if (e.type === 'window' && e.window.content === 'image' && (e.material.preset !== 'none' || oldKey)) set(e.material, e.material.preset === 'lips' || oldKey === 'lips' ? 'lips' : e.material.preset === 'custom' && oldKey === 'static' ? 'static' : 'eye', { repeat: [1, 1] });
  if (e.type === 'exit' || e.type === 'disk') set(e.material, 'metal', { repeat: [1, 1], roughness: .55, metalness: .4 });
  if (e.type === 'character' || e.type === 'spawn') {
    const model = e.character.model, a = normalizeAppearance(model, e.character.appearance); e.character.appearance = a;
    if (model === 'cob') { set(a.body, 'fur', { repeat: [2, 1] }); set(a.head, 'fur', { repeat: [2, 1] }); set(a.ears, 'fur', { repeat: [1, 1] }); set(a.cloth, 'plaid', { repeat: [2, 1] }); }
    if (model === 'kone') { set(a.body, 'teal', { repeat: [1, 1] }); set(a.cloth, 'teal', { repeat: [2, 1] }); set(a.face, 'eye', { repeat: [1, 1] }); }
    if (model === 'boxjaw') { set(a.body, 'concrete', { repeat: [1, 1] }); set(a.cloth, 'red', { repeat: [2, 1] }); set(a.face, 'teeth', { repeat: [1, 1] }); set(a.side, 'eye', { repeat: [1, 1] }); }
    if (model === 'eros') { set(a.body, 'fur', { color: '#d36aa8' }); set(a.torso, 'fur', { color: '#d36aa8' }); set(a.wings, 'red', { color: '#ee9dd2' }); set(a.horns, 'fur', { color: '#903b6a' }); set(a.face, 'teeth', { repeat: [1, 1] }); }
    if (model === 'sysadmin') { set(a.body, 'concrete', { color: '#20262c' }); set(a.head, 'concrete', { color: '#20262c' }); }
    if (model === 'cobaia') { set(a.body, 'metal', { color: '#78bd9e' }); set(a.head, 'metal', { color: '#78bd9e' }); set(a.face, 'static', { repeat: [1, 1] }); set(a.screen, 'static', { repeat: [1, 1] }); }
    const recipes = {
      error404: { body: ['concrete','#57213f'], legs: ['metal','#733656'], screens: ['eye','#ffffff'], core: ['static','#db74ba'] },
      crtcat: { body: ['fur','#86b7b1'], head: ['metal','#466169'], screen: ['static','#d4ede3'], tail: ['fur','#86b7b1'] },
      diskbot: { body: ['metal','#839faa'], shutter: ['metal','#b8c9cc'], hands: ['metal','#839faa'] },
      patchdoll: { body: ['fur','#cdb49c'], head: ['fur','#e2c5a8'], cloth: ['plaid','#ffffff'] },
      filemoth: { body: ['fur','#b4b9ac'], head: ['fur','#e5dcc9'] },
      chronoguard: { body: ['teal','#919aaa'], head: ['metal','#d6b582'], limbs: ['metal','#90aaa7'], gears: ['metal','#ddbd87'] },
    };
    for (const [key, [texture, color]] of Object.entries(recipes[model] || {})) set(a[key], texture, { color });
  }
  if (changed && ARCHITECTURE_TYPES.includes(e.type)) { e.material.mapping = 'world'; e.material.tileSize = e.type === 'ramp' ? [2, 2] : [3, 3]; e.material.repeat = [1, 1]; }
  return changed;
}
export function demoProject() {
  const p = newProject(); p.name = 'Buffer / laboratório de mundos';
  const add = (type, pos, size, extra = {}) => {
    const e = createEntity(type, extra.model); e.position = pos; if (size) e.size = size;
    if (extra.model) delete extra.model;
    Object.assign(e, extra); p.entities.push(e); return e;
  };
  add('floor', [0, 0, 0], [22, .3, 24], { name: 'Átrio / piso molhado', material: mat('tile', '#d7e6d4', { repeat: [9, 9], roughness: .3, metalness: .3 }) });
  add('floor', [0, 0, -18], [8, .3, 12], { name: 'Corredor / piso' });
  add('floor', [-17, 0, 0], [12, .3, 12], { name: 'Salas amarelas / piso' });
  add('wall', [0, 0, 12], [22, 6, .5], { name: 'Parede sul' });
  for (const x of [-11, 11]) {
    add('wall', [x, 0, -8], [.5, 6, 8], { name: 'Parede lateral' });
    add('wall', [x, 0, 8], [.5, 6, 8], { name: 'Parede lateral' });
  }
  add('wall', [11, 0, 0], [.5, 6, 8], { name: 'Parede leste' });
  add('wall', [-7.5, 0, -12], [7, 6, .5]); add('wall', [7.5, 0, -12], [7, 6, .5]);
  add('wall', [-4, 0, -18], [.4, 6, 12]); add('wall', [4, 0, -18], [.4, 6, 12]); add('wall', [0, 0, -24], [8, 6, .4]);
  for (const [pos, size] of [[[-23, 0, 0], [.4, 5, 12]], [[-17, 0, -6], [12, 5, .4]], [[-17, 0, 6], [12, 5, .4]]]) add('wall', pos, size, { material: mat('yellow') });
  add('wall', [-17, 0, 2], [.5, 5, 5], { name: 'Divisória amarela', material: mat('yellow') });
  add('box', [3, 0, -5], [2, 1.8, 2], { name: 'Cobertura / caixa' });
  add('box', [-3, 0, -16], [1.3, 1.3, 1.3]);
  add('ramp', [8.7, 0, 6], [3.4, 3, 8], { name: 'Acesso à passarela' });
  add('floor', [8.7, 3, -4], [3.4, .3, 12], { name: 'Passarela superior' });
  add('wall', [7, 3, -4], [.12, .9, 12], { name: 'Guarda-corpo' });
  add('water', [0, .025, 1], [11, .04, 17], { name: 'Poça de buffer', collision: false });
  add('spawn', [0, 0, 8], null, { name: 'Cob-01 / ponto inicial' });
  add('character', [-5, 0, 4], null, { name: 'K-One / guia', model: 'kone', rotation: Math.PI });
  add('character', [-14, 0, -2], null, { name: 'Box-Jaw / memória', model: 'boxjaw', rotation: Math.PI });
  add('character', [0, 4, -8], null, { name: 'Eros / patrulha', model: 'eros' });
  add('character', [2, 0, -21], [.8, .8, .8], { name: 'SysAdmin / vigia', model: 'sysadmin' });
  add('capsule', [4.5, 0, 7], null, { name: 'Hyper-Sleep / backup' });
  configureItem(add('item', [3.5, 0, 4.5]), 'heal');
  configureItem(add('item', [-19, 0, 3]), 'key');
  configureItem(add('item', [-14, 0, 4]), 'note');
  add('disk', [-20, 0, -3], null, { name: 'BUFFER_01.DAT' });
  add('disk', [9, 3, -6], null, { name: 'BUFFER_02.DAT' });
  add('disk', [0, 0, -18], null, { name: 'BUFFER_03.DAT' });
  add('exit', [0, 0, -22], null, { name: 'Terminal COB_01.EXE' });
  add('screen', [-3.74, 2, -14], null, { name: 'Watcher do corredor', rotation: -Math.PI / 2 });
  const win = (preset, pos, size, rotation = Math.PI) => { const e = add('window', pos, size); configureWindow(e, preset); if (size) e.size = size; e.rotation = rotation; return e; };
  win('confirm', [2, 1.8, -10], [2.8, 1.7, .12]);
  win('eye', [-3.74, 3.2, -19], [1.5, 1.25, .12], -Math.PI / 2);
  win('lips', [-22.74, 2.8, 1], [1.8, 1.5, .12], -Math.PI / 2);
  win('bsod', [0, 3.9, -23.72], [4, 2.2, .12]);
  win('progress', [7.5, 5, -3], [2.8, 1.8, .12]);
  for (const [x, y, z, color] of [[0, 5.8, 2, '#b2e8ce'], [0, 5.8, -9, '#96d3c5'], [0, 5.5, -18, '#8dbbd7'], [-17, 4.6, 0, '#e2c58d'], [9, 5.8, -5, '#d7a6c1']]) add('light', [x, y, z], null, { light: { color, intensity: 30, range: 16 } });
  for (const e of p.entities) if (ARCHITECTURE_TYPES.includes(e.type)) { e.material.mapping = 'world'; e.material.tileSize = [3, 3]; e.material.repeat = [1, 1]; }
  return p;
}

const colorPattern = /^#[0-9a-f]{6}$/i;
const color = (value, fallback) => colorPattern.test(value) ? value : fallback;
const num = (value, fallback, min = -500, max = 500) => Number.isFinite(Number(value)) ? clamp(Number(value), min, max) : fallback;
function normalizeMaterial(value, fallback = mat()) {
  const m = { ...fallback, ...value };
  const presets = ['none', 'brick', 'tile', 'yellow', 'plaid', 'metal', 'wood', 'concrete', 'carpet', 'water', 'eye', 'lips', 'teeth', 'static', 'alert', 'paper', 'clock', 'custom'];
  return { preset: presets.includes(m.preset) ? m.preset : 'none', color: color(m.color, '#ffffff'), emissive: color(m.emissive, '#000000'), texture: typeof m.texture === 'string' ? m.texture : null, mapping: ['world', 'local'].includes(m.mapping) ? m.mapping : 'local', tileSize: [num(m.tileSize?.[0], 3, .1, 200), num(m.tileSize?.[1], 3, .1, 200)], offset: [num(m.offset?.[0], 0, -100, 100), num(m.offset?.[1], 0, -100, 100)], repeat: [num(m.repeat?.[0], 1, .1, 100), num(m.repeat?.[1], 1, .1, 100)], uvRotation: num(m.uvRotation, 0, -360, 360), roughness: num(m.roughness, .8, 0, 1), metalness: num(m.metalness, .05, 0, 1), opacity: num(m.opacity, 1, .1, 1) };
}
export function validateProject(input) {
  if (!input || input.format !== 'palace-engine' || input.version !== VERSION || !Array.isArray(input.entities)) throw new Error('Formato inválido. Abra um projeto JSON da Palace Engine v1.');
  if (input.entities.length > 1500) throw new Error('Este editor aceita até 1.500 objetos por setor.');
  const p = newProject(); p.name = String(input.name || p.name).slice(0, 100);
  if (input.player && typeof input.player === 'object') p.player = { model: validCharacter(input.player.model) ? input.player.model : 'source', sourceId: typeof input.player.sourceId === 'string' ? input.player.sourceId : null, fit: input.player.fit !== false };
  const e = input.environment || {};
  p.environment = { background: color(e.background, p.environment.background), fog: color(e.fog, p.environment.fog), fogDensity: num(e.fogDensity, .018, 0, .08), ambient: num(e.ambient, 1.6, .1, 4), pixelated: e.pixelated !== false };
  let bytes = 0;
  for (const [id, a] of Object.entries(input.assets || {})) {
    if (!a || !/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(a.data)) throw new Error('O projeto contém uma imagem incompatível.');
    bytes += a.data.length; if (bytes > 40 * 1024 * 1024) throw new Error('As texturas excedem 40 MB. Use recortes menores.');
    p.assets[id] = { name: String(a.name || 'Textura').slice(0, 100), data: a.data };
    if (ATLAS_TILES.some(t => t.key === a.atlasKey)) p.assets[id].atlasKey = a.atlasKey;
  }
  for (const t of ATLAS_TILES) if (typeof input.atlas?.[t.key] === 'string' && p.assets[input.atlas[t.key]]) p.atlas[t.key] = input.atlas[t.key];
  const ids = new Set();
  for (const o of input.entities) {
    if (!CATALOG.some(c => c.type === o.type)) throw new Error('O projeto contém um tipo de objeto desconhecido.');
    const base = createEntity(o.type, o.character?.model);
    const id = typeof o.id === 'string' && !ids.has(o.id) ? o.id : uid(); ids.add(id);
    const ch = o.character || {};
    const model = validCharacter(ch.model) ? ch.model : 'cob';
    const ap = appearance(model);
    p.entities.push({ ...base, id, name: String(o.name || base.name).slice(0, 100),
      position: [0, 1, 2].map(i => num(o.position?.[i], 0)), rotation: num(o.rotation, 0, -Math.PI * 200, Math.PI * 200), size: [0, 1, 2].map(i => num(o.size?.[i], 1, .1, 200)), visible: o.visible !== false, collision: ['floor', 'ramp'].includes(o.type) && (input.collisionVersion || 0) < 2 ? true : (o.collision ?? base.collision) === true,
      material: normalizeMaterial(o.material, base.material),
      character: { model, role: ['player', 'npc', 'enemy', 'cache'].includes(ch.role) ? ch.role : base.character.role, speed: num(ch.speed, 3.4, .1, 15), jumpSpeed: num(ch.jumpSpeed, 7.3, 0, 16), range: num(ch.range, 12, 1, 60), maxHealth: Math.round(num(ch.maxHealth, base.character.maxHealth, 1, 10000)), damage: Math.round(num(ch.damage, 1, 0, 1000)), invulnerable: ch.invulnerable === true, movement: ['idle', 'wander', 'follow'].includes(ch.movement) ? ch.movement : 'idle', wanderRadius: num(ch.wanderRadius, 4, .5, 30), idleAnimation: ch.idleAnimation !== false, headScale: num(ch.headScale, 1, .3, 3), earScale: num(ch.earScale, 1, .2, 3), dialogue: String(ch.dialogue || '').slice(0, 4000), appearance: Object.fromEntries(Object.keys(ap).map(k => [k, normalizeMaterial(ch.appearance?.[k], ap[k])])) },
      pickup: { enabled: o.type === 'disk' || ['item', 'box'].includes(o.type) && (o.pickup?.enabled ?? base.pickup.enabled) === true, itemId: String(o.pickup?.itemId || '').slice(0, 100), name: String(o.pickup?.name || '').slice(0, 100), kind: o.type === 'disk' ? 'disk' : ['key', 'heal', 'note', 'material'].includes(o.pickup?.kind) ? o.pickup.kind : 'material', quantity: Math.round(num(o.pickup?.quantity, 1, 1, 9999)), description: String(o.pickup?.description || '').slice(0, 4000), heal: Math.round(num(o.pickup?.heal, 2, 0, 10000)) },
      light: { color: color(o.light?.color, '#b2e8ce'), intensity: num(o.light?.intensity, 22, 0, 150), range: num(o.light?.range, 14, 1, 100) }, message: String(o.message || '').slice(0, 4000),
    });
    const entity = p.entities.at(-1);
    entity.character.appearance = normalizeAppearance(model, ch.appearance);
    if (entity.type === 'window') entity.window = normalizeWindow(o.window);
    if (ARCHITECTURE_TYPES.includes(entity.type) && !o.material?.mapping) {
      const horizontal = ['floor', 'water', 'ramp'].includes(entity.type), m = entity.material;
      m.tileSize = [clamp((horizontal ? entity.size[0] : Math.max(entity.size[0], entity.size[2])) / m.repeat[0], .1, 200), clamp((horizontal ? entity.size[2] : entity.size[1]) / m.repeat[1], .1, 200)];
      m.mapping = 'world'; m.repeat = [1, 1];
    }
  }
  const generation = input.generation;
  if (generation?.format === 'palace-procedural-v1' && Number.isInteger(generation.width) && generation.width >= 7 && generation.width <= 30 && Number.isInteger(generation.depth) && generation.depth >= 7 && generation.depth <= 30 && Number.isInteger(generation.levels) && generation.levels >= 1 && generation.levels <= 3 && Array.isArray(generation.cells) && generation.cells.length === generation.levels && generation.cells.every(level => Array.isArray(level) && level.length === generation.width * generation.depth && level.every(v => Number.isInteger(v) && v >= 0 && v <= 15)) && JSON.stringify(generation).length < 500000) p.generation = structuredClone(generation);
  return p;
}

const procedural = new Map();
function makeTexture(preset) {
  if (procedural.has(preset)) return procedural.get(preset);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const c = canvas.getContext('2d'), s = 128;
  const fill = (col, x = 0, y = 0, w = s, h = s) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  if (preset === 'brick') {
    fill('#27382c'); for (let y = 0; y < s; y += 16) for (let x = -32; x < s; x += 32) fill(y % 32 ? '#50614b' : '#405a48', x + (y % 32 ? 16 : 0), y, 30, 14);
  } else if (preset === 'tile') {
    fill('#223830'); for (let y = 0; y < s; y += 32) for (let x = 0; x < s; x += 32) fill((x + y) % 64 ? '#728375' : '#516b5c', x + 1, y + 1, 30, 30);
  } else if (preset === 'yellow') {
    fill('#b3995c'); for (let y = 0; y < s; y += 16) for (let x = 0; x < s; x += 16) { c.fillStyle = '#806f40'; c.beginPath(); c.ellipse(x + 8, y + 8, 3, 5, 0, 0, 7); c.fill(); }
  } else if (preset === 'plaid') {
    fill('#ce7d9d'); for (let i = 0; i < s; i += 16) { fill('#ffdaea80', i, 0, 8, s); fill('#ffdaea80', 0, i, s, 8); }
  } else if (preset === 'metal') {
    fill('#596b5d'); for (let i = 0; i < s; i += 16) fill('#23392b', i, 0, 2, s);
  } else if (preset === 'wood') {
    fill('#4d3b29'); for (let x = 0; x < s; x += 32) { fill('#211d15', x, 0, 2, s); for (let i = 4; i < 30; i += 5) fill('#84644455', x + i, 0, 1, s); }
  } else if (preset === 'concrete') {
    fill('#747d72'); c.strokeStyle = '#39473d'; c.lineWidth = 2;
    for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(i * 27, 0); c.lineTo(i * 23 + 12, 38); c.lineTo(i * 25 + 2, 73); c.lineTo(i * 26 + 19, 128); c.stroke(); }
  } else if (preset === 'carpet') {
    fill('#93804b'); let seed = 1888; for (let i = 0; i < 2600; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; fill(['#554d2b','#c2a96b','#736735'][(seed >>> 24) % 3], seed % 128, seed >>> 16 & 127, 2, 2); }
  } else if (preset === 'water') {
    fill('#183e3e'); let seed = 773; for (let i = 0; i < 260; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; fill('#82b9a855', seed % 128, seed >>> 16 & 127, 4 + seed % 20, 1); }
  } else if (preset === 'alert') {
    fill('#c0c0c0'); fill('#15277d',0,0,128,19); c.fillStyle='#fff';c.font='bold 9px monospace';c.fillText('WARNING',5,13);c.fillStyle='#edcc43';c.beginPath();c.moveTo(24,38);c.lineTo(39,66);c.lineTo(9,66);c.fill();c.fillStyle='#111';c.font='bold 20px monospace';c.fillText('!',19,62);c.font='9px monospace';c.fillText('ERROR 404',45,55);c.strokeRect(43,86,42,22);c.fillText('OK',57,101);
  } else if (preset === 'paper') {
    fill('#ddd2b6'); for(let y=20;y<114;y+=12) fill('#45536277',12,y,94-(y%3)*9,2);fill('#b39f78',0,0,128,4);
  } else if (preset === 'clock') {
    fill('#ddd5be'); c.strokeStyle='#796447';c.lineWidth=4;c.beginPath();c.arc(64,64,58,0,7);c.stroke();for(let i=0;i<12;i++){const a=i/12*Math.PI*2;c.fillStyle='#27313e';c.fillRect(62+Math.sin(a)*48,62-Math.cos(a)*48,4,4);}
  } else if (preset === 'static') {
    fill('#11222b'); let seed = 1998;
    for (let i = 0; i < 4096; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; fill(['#cfdbd1', '#48aaa8', '#765088', '#26314b'][(seed >>> 24) % 4], i % 64 * 2, Math.floor(i / 64) * 2, 2, 2); }
    for (let y = 0; y < s; y += 4) fill('#00000077', 0, y, s, 1);
  } else if (preset === 'eye') {
    fill('#271c35'); c.fillStyle = '#cf8aab'; c.beginPath(); c.ellipse(64, 64, 57, 34, 0, 0, 7); c.fill(); c.fillStyle = '#dfded1'; c.beginPath(); c.ellipse(64, 64, 48, 24, 0, 0, 7); c.fill();
    c.fillStyle = '#3e96ac'; c.beginPath(); c.arc(64, 64, 23, 0, 7); c.fill();
    for (let i = 0; i < 60; i++) { const a = i / 60 * 7; c.strokeStyle = i % 2 ? '#0c4b69' : '#9cc5bc'; c.beginPath(); c.moveTo(64 + Math.cos(a) * 12, 64 + Math.sin(a) * 12); c.lineTo(64 + Math.cos(a) * 23, 64 + Math.sin(a) * 23); c.stroke(); }
    c.fillStyle = '#0b1020'; c.beginPath(); c.arc(64, 64, 12, 0, 7); c.fill(); fill('#fff', 56, 53, 7, 7);
  } else if (preset === 'lips') {
    fill('#281930'); c.fillStyle = '#d34887'; c.beginPath(); c.moveTo(9, 65); c.bezierCurveTo(40, 25, 50, 50, 64, 40); c.bezierCurveTo(95, 26, 100, 55, 119, 65); c.bezierCurveTo(78, 105, 39, 98, 9, 65); c.fill(); fill('#261522', 25, 60, 80, 10);
  } else if (preset === 'teeth') {
    fill('#89565c'); fill('#371322', 8, 27, 112, 75); fill('#0c0b14', 12, 43, 104, 46);
    for (let i = 0; i < 8; i++) { fill('#dbc8a8', 17 + i * 12, 40, 9, 21); fill('#dac4a3', 17 + i * 12, 66, 9, 20); }
  }
  if (!['eye', 'lips', 'teeth'].includes(preset)) {
    let seed = 1998;
    for (let i = 0; i < 900; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; const x = seed % 128; seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; fill('#17261922', x, seed % 128, 2, 3); }
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; procedural.set(preset, texture); return texture;
}
export function previewTexture(m, project) {
  if (m.preset === 'custom') return project.assets[m.texture]?.data || null;
  return m.preset === 'none' ? null : makeTexture(m.preset).image.toDataURL();
}
export function buildMaterial(m, project) {
  let t = null;
  if (m.preset === 'custom' && project.assets[m.texture]) t = new THREE.TextureLoader().load(project.assets[m.texture].data);
  else if (m.preset !== 'none' && m.preset !== 'custom') t = makeTexture(m.preset).clone();
  if (t) {
    t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.fromArray(m.repeat); t.offset.fromArray(m.offset || [0, 0]); t.center.set(.5, .5); t.rotation = THREE.MathUtils.degToRad(m.uvRotation); t.needsUpdate = true;
  }
  return new THREE.MeshStandardMaterial({ map: t, color: m.color, emissive: m.emissive, roughness: m.roughness, metalness: m.metalness, opacity: m.opacity, transparent: m.opacity < 1, depthWrite: m.opacity > .85, flatShading: true, side: THREE.DoubleSide });
}
function part(parent, geo, material, pos = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, material); m.position.fromArray(pos); m.castShadow = true; m.receiveShadow = true; if (material.name) m.userData.materialSlot = material.name; parent.add(m); return m;
}
function box(parent, material, pos, size) { return part(parent, new THREE.BoxGeometry(...size), material, pos); }
function heart() { const s = new THREE.Shape(); s.moveTo(0, -.35); s.bezierCurveTo(-.65, .1, -.4, .7, 0, .4); s.bezierCurveTo(.4, .7, .65, .1, 0, -.35); return new THREE.ShapeGeometry(s); }
export function buildCharacter(ch, project) {
  const g = new THREE.Group();
  const source = normalizeAppearance(ch.model, ch.appearance);
  const a = Object.fromEntries(characterSlots(ch.model).filter(s => s.key !== 'wireframe').map(({ key }) => { const material = buildMaterial(source[key], project); material.name = key; return [key, material]; }));
  g.userData.materials = a;
  g.userData.animation = { limbs: [], wings: [] };
  if (NEW_CHARACTER_APPEARANCE[ch.model]) return buildNewCharacter(ch, a);
  if (ch.model === 'cob') {
    part(g, new THREE.CylinderGeometry(.27, .57, .85, 8), a.cloth, [0, .85, 0]);
    const head = new THREE.Group(); head.position.y = 1.7; head.scale.setScalar(ch.headScale); g.add(head);
    part(head, new THREE.SphereGeometry(.58, 12, 8), a.head).scale.set(1.06, .95, .92);
    for (const sign of [-1, 1]) {
      const ear = new THREE.Group(); ear.position.set(sign * .23, .63, 0); ear.scale.y = ch.earScale; head.add(ear);
      part(ear, new THREE.CapsuleGeometry(.13, .46, 3, 6), a.ears);
      part(ear, new THREE.CapsuleGeometry(.065, .34, 3, 6), a.innerEars, [0, 0, -.105]);
      part(head, new THREE.SphereGeometry(.13, 8, 6), a.eyes, [sign * .21, .02, -.49]).scale.set(1, 1.2, .5);
      part(head, new THREE.SphereGeometry(.08, 8, 4), a.cheeks, [sign * .39, -.15, -.41]).scale.set(1.2, .6, .2);
      const arm = part(g, new THREE.CapsuleGeometry(.085, .34, 3, 6), a.body, [sign * .44, 1.05, 0]); arm.rotation.z = sign * .18; g.userData.animation.limbs.push(arm);
      const leg = part(g, new THREE.CapsuleGeometry(.1, .27, 3, 6), a.body, [sign * .2, .25, -.025]); g.userData.animation.limbs.push(leg);
    }
    if (source.face.preset !== 'none') { const face = part(head, new THREE.PlaneGeometry(.87, .63), a.face, [0, 0, -.54]); face.rotation.y = Math.PI; }
    part(head, new THREE.SphereGeometry(.03, 6, 4), a.face, [0, -.16, -.52]);
    part(g, heart(), a.emblem, [0, 1.1, -.32]).scale.setScalar(.14);
    part(g, new THREE.SphereGeometry(.12, 8, 6), a.body, [0, .65, .47]);
  } else if (ch.model === 'kone' || ch.model === 'boxjaw') {
    const body = part(g, new THREE.CylinderGeometry(.15, .77, 1.5, 4), a.cloth, [0, 1.08, 0]); body.rotation.y = Math.PI / 4;
    if (ch.model === 'kone') {
      const headGroup = new THREE.Group(); headGroup.position.y = 2.25; headGroup.scale.setScalar(ch.headScale); g.add(headGroup);
      const head = part(headGroup, new THREE.ConeGeometry(.9, 1.1, 4), a.body); head.rotation.y = Math.PI / 4;
      const face = part(headGroup, new THREE.PlaneGeometry(.8, .57), a.face, [0, -.05, -.52]); face.rotation.y = Math.PI;
    } else {
      box(g, a.body, [0, 2.1, 0], [1.05 * ch.headScale, 1.05 * ch.headScale, 1.05 * ch.headScale]);
      const face = part(g, new THREE.PlaneGeometry(ch.headScale, ch.headScale), a.face, [0, 2.1, -.531 * ch.headScale]); face.rotation.y = Math.PI;
      part(g, new THREE.PlaneGeometry(.9 * ch.headScale, .9 * ch.headScale), a.side, [.531 * ch.headScale, 2.1, 0]).rotation.y = Math.PI / 2;
    }
    for (const sign of [-1, 1]) {
      g.userData.animation.limbs.push(part(g, new THREE.CapsuleGeometry(.1, .25, 2, 6), a.feet, [sign * .3, .24, 0]));
      g.userData.animation.limbs.push(part(g, new THREE.SphereGeometry(.12, 6, 4), a.hands, [sign * .6, 1, 0]));
    }
  } else if (ch.model === 'eros') {
    const head = new THREE.Group(); head.position.y = 1; head.scale.setScalar(ch.headScale); g.add(head);
    part(head, new THREE.SphereGeometry(.7, 10, 8), a.body);
    part(g, new THREE.ConeGeometry(.4, .85, 6), a.torso, [0, .35, 0]);
    for (const sign of [-1, 1]) {
      part(head, new THREE.SphereGeometry(.18, 8, 6), a.eyes, [sign * .24, .02, -.61]).scale.set(1, .8, .4);
      const horn = part(head, new THREE.ConeGeometry(.12, .62 * ch.earScale, 5), a.horns, [sign * .46, .7, 0]); horn.rotation.z = -sign * .3;
      const wg = new THREE.Group(); wg.position.set(sign * .5, 1, 0); g.add(wg);
      const s = new THREE.Shape(); s.moveTo(0, .1); s.lineTo(sign * 1.7, 1); s.lineTo(sign * 1.5, -.6); s.quadraticCurveTo(sign * .9, -.15, sign * .7, -.6); s.lineTo(0, -.3);
      const geometry = new THREE.ShapeGeometry(s); geometry.computeBoundingBox(); const bounds = geometry.boundingBox, vertices = geometry.attributes.position, uv = geometry.attributes.uv;
      for (let i = 0; i < vertices.count; i++) { const u = (vertices.getX(i) - bounds.min.x) / (bounds.max.x - bounds.min.x), v = (vertices.getY(i) - bounds.min.y) / (bounds.max.y - bounds.min.y); uv.setXY(i, sign < 0 ? 1 - u : u, v); }
      part(wg, geometry, a.wings); g.userData.animation.wings.push(wg);
    }
    part(head, new THREE.PlaneGeometry(.78, .3), a.face, [0, -.3, -.68]).rotation.y = Math.PI;
    part(head, heart(), a.emblem, [0, .35, -.68]).scale.setScalar(.25);
  } else {
    const height = ch.model === 'sysadmin' ? 4.7 : 4;
    box(g, a.body, [0, height * .62, 0], [.46, height * .48, .28]);
    const head = new THREE.Group(); head.position.y = height; head.scale.setScalar(ch.headScale); g.add(head);
    box(head, a.head, [0, 0, 0], [.5, .6, .4]);
    for (const sign of [-1, 1]) {
      const arm = part(g, new THREE.CylinderGeometry(.055, .08, height * .5, 5), a.body, [sign * .5, height * .58, 0]); arm.rotation.z = sign * .14;g.userData.animation.limbs.push(arm);
      g.userData.animation.limbs.push(part(g, new THREE.CylinderGeometry(.075, .09, height * .42, 5), a.body, [sign * .15, height * .21, 0]));
    }
    if (ch.model === 'cobaia') {
      part(head, new THREE.PlaneGeometry(.45, .5), a.face, [0, 0, -.21]).rotation.y = Math.PI;
      part(g, new THREE.PlaneGeometry(.4, .6), a.screen, [0, height * .68, -.16]).rotation.y = Math.PI;
      const config = source.wireframe, color = new THREE.Color(config.color).add(new THREE.Color(config.emissive)), material = new THREE.LineBasicMaterial({ color, opacity: config.opacity, transparent: config.opacity < 1, toneMapped: false }); material.name = 'wireframe'; g.userData.materials.wireframe = material;
      g.traverse(o => { if (o.isMesh) { const lines = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry), material); lines.userData.materialSlot = 'wireframe'; o.add(lines); } });
    } else {
      const glow = part(g, new THREE.SphereGeometry(.19, 8, 6), a.core, [0, height * .68, -.17]); glow.scale.set(.8, 2.2, .4);
      for (const sign of [-1, 1]) part(head, new THREE.SphereGeometry(.052, 8, 6), a.eyes, [sign * .12, .03, -.22]);
    }
  }
  return g;
}
export function buildEntity(e, project, editing = true) {
  if (e.type === 'window') {
    const root = buildSystemWindow(e, ['image', 'portrait'].includes(e.window.content) ? previewTexture(e.material, project) : null);
    root.position.fromArray(e.position); root.rotation.y = e.rotation; root.scale.fromArray(e.size); root.visible = e.visible; root.name = e.name; root.userData.entityId = e.id;
    root.traverse(o => { if (o.isMesh) o.userData.entityId = e.id; }); return root;
  }
  const g = new THREE.Group(); g.userData.entityId = e.id; g.name = e.name;
  const m = buildMaterial(e.material, project), dark = new THREE.MeshStandardMaterial({ color: '#1d2922', metalness: .4, roughness: .6 });
  if (e.type === 'floor') box(g, m, [0, -.5, 0], [1, 1, 1]);
  else if (['wall', 'box'].includes(e.type)) box(g, m, [0, .5, 0], [1, 1, 1]);
  else if (e.type === 'ramp') {
    const geo = new THREE.BufferGeometry();
    const positions = [], uvs = [];
    const triangle = (a, b, c, ta, tb, tc) => { positions.push(...a, ...b, ...c); uvs.push(...ta, ...tb, ...tc); };
    const quad = (a, b, c, d) => {
      triangle(a, b, c, [0, 0], [1, 0], [1, 1]);
      triangle(a, c, d, [0, 0], [1, 1], [0, 1]);
    };
    const a = [-.5, 0, .5], b = [.5, 0, .5], c = [.5, 1, -.5], d = [-.5, 1, -.5], leftBack = [-.5, 0, -.5], rightBack = [.5, 0, -.5];
    // Each face has a non-degenerate UV surface; the two slope triangles share one rectangle.
    quad(a, b, c, d);
    quad(leftBack, d, c, rightBack);
    triangle(leftBack, a, d, [0, 0], [1, 0], [0, 1]);
    triangle(b, rightBack, c, [1, 0], [0, 0], [0, 1]);
    quad(leftBack, rightBack, b, a);
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geo.computeVertexNormals(); part(g, geo, m);
  } else if (e.type === 'water') { const p = part(g, new THREE.PlaneGeometry(1, 1), m, [0, .015, 0]); p.rotation.x = -Math.PI / 2; p.castShadow = false; }
  else if (e.type === 'spawn' || e.type === 'character') {
    m.dispose(); g.add(buildCharacter(e.character, project));
    if (e.type === 'spawn' && editing) {
      const ring = part(g, new THREE.TorusGeometry(.9, .025, 4, 32), new THREE.MeshBasicMaterial({ color: '#b6dc8c' }), [0, .03, 0]); ring.rotation.x = -Math.PI / 2; ring.userData.editorOnly = true;
    }
  } else if (e.type === 'light') {
    m.dispose(); const l = new THREE.PointLight(e.light.color, e.light.intensity, e.light.range, 2); g.add(l);
    box(g, new THREE.MeshBasicMaterial({ color: e.light.color }), [0, 0, 0], [1.7, .1, .25]);
    if (editing) { const marker = part(g, new THREE.SphereGeometry(.16, 8, 6), new THREE.MeshBasicMaterial({ color: e.light.color, wireframe: true })); marker.userData.editorOnly = true; }
  } else if (e.type === 'screen') {
    box(g, dark, [0, .5, 0], [1, 1, 1]); part(g, new THREE.PlaneGeometry(.88, .73), m, [0, .5, -.51]).rotation.y = Math.PI;
    box(g, new THREE.MeshBasicMaterial({ color: '#2b428c' }), [0, .9, -.52], [.9, .13, .02]);
  } else if (e.type === 'disk') {
    box(g, m, [0, 1, 0], [.65, .7, .1]); box(g, dark, [0, 1.17, -.07], [.4, .22, .02]);
    box(g, new THREE.MeshStandardMaterial({ color: '#e3d0a4' }), [0, .85, -.07], [.48, .18, .02]);
    const ring = part(g, new THREE.TorusGeometry(.52, .014, 4, 24), new THREE.MeshBasicMaterial({ color: '#e6c486' }), [0, 1, 0]); ring.rotation.x = Math.PI / 2;
  } else if (e.type === 'item') {
    if (e.pickup.kind === 'key') {
      part(g, new THREE.TorusGeometry(.17, .05, 5, 12), m, [0, .75, 0]); box(g, m, [0, .43, 0], [.09, .5, .09]); box(g, m, [.09, .27, 0], [.23, .07, .1]);
    } else if (e.pickup.kind === 'heal') {
      part(g, new THREE.CapsuleGeometry(.16, .4, 3, 8), m, [0, .65, 0]);
      part(g, new THREE.SphereGeometry(.165, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#d887ad' }), [0, .85, 0]);
    } else if (e.pickup.kind === 'note') {
      const sheet = box(g, m, [0, .65, 0], [.6, .72, .04]); sheet.rotation.z = -.12;
      for (let y = .48; y < .86; y += .1) box(g, dark, [0, y, -.025], [.38, .02, .01]);
    } else part(g, new THREE.IcosahedronGeometry(.3, 0), m, [0, .65, 0]);
    const halo = part(g, new THREE.TorusGeometry(.42, .012, 4, 24), new THREE.MeshBasicMaterial({ color: '#b8d298' }), [0, .25, 0]); halo.rotation.x = Math.PI / 2;
  } else if (e.type === 'capsule') {
    const glass = new THREE.MeshPhysicalMaterial({ color: '#b4e5cf', transparent: true, opacity: .3, roughness: .1, depthWrite: false });
    part(g, new THREE.CapsuleGeometry(.48, 1.1, 4, 12), glass, [0, 1.2, 0]);
    part(g, new THREE.CylinderGeometry(.36, .36, .85, 10), m, [0, .8, 0]);
    part(g, new THREE.SphereGeometry(.36, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#ba6a97' }), [0, 1.6, 0]);
    box(g, dark, [0, .1, 0], [1.3, .2, 1.3]);
    const shape = new THREE.Shape(); shape.moveTo(-.13, -.18); shape.lineTo(.18, 0); shape.lineTo(-.13, .18); shape.closePath();
    part(g, new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: '#edcd88', side: THREE.DoubleSide }), [0, 1.2, -.5]);
    const l = new THREE.PointLight('#8bd3b4', 5, 5); l.position.y = 1; g.add(l);
  } else if (e.type === 'exit') {
    box(g, m, [0, .45, 0], [1.3, .9, .7]); box(g, dark, [0, 1.35, 0], [1.4, .95, .35]);
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const ctx = c.getContext('2d'); ctx.fillStyle = '#142d23'; ctx.fillRect(0, 0, 256, 128); ctx.fillStyle = '#b6e0a2'; ctx.font = '17px monospace'; ctx.fillText('RESTORE FILE?', 15, 45); ctx.font = '13px monospace'; ctx.fillText('COB_01.EXE', 15, 74); ctx.fillText('> ENTER', 15, 104);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; part(g, new THREE.PlaneGeometry(1.24, .78), new THREE.MeshBasicMaterial({ map: t }), [0, 1.35, -.18]).rotation.y = Math.PI;
  }
  g.position.fromArray(e.position); g.rotation.y = e.rotation; g.scale.fromArray(e.size); g.visible = e.visible;
  updateEntityUV(g, e);
  g.traverse(o => { if (o.isMesh || o.isLineSegments) o.userData.entityId = e.id; });
  return g;
}
export function updateEntityUV(root, entity) {
  if (!ARCHITECTURE_TYPES.includes(entity.type) || entity.material.mapping !== 'world') return;
  root.updateWorldMatrix(true, true);
  const [sizeU, sizeV] = entity.material.tileSize || [3, 3], axisAligned = Math.abs(Math.sin(entity.rotation * 2)) < .00001;
  const point = new THREE.Vector3(), normal = new THREE.Vector3(), normalMatrix = new THREE.Matrix3();
  root.traverse(mesh => {
    if (!mesh.isMesh || !mesh.geometry.attributes.uv || !mesh.geometry.attributes.normal) return;
    const geometry = mesh.geometry, positions = geometry.attributes.position, normals = geometry.attributes.normal, uv = geometry.attributes.uv;
    normalMatrix.getNormalMatrix(mesh.matrixWorld);
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
      normal.fromBufferAttribute(normals, i).applyNormalMatrix(normalMatrix);
      if (entity.type === 'water' || entity.type === 'ramp' && normals.getY(i) > .5 || Math.abs(normal.y) > .5) uv.setXY(i, point.x / sizeU, -point.z / sizeV);
      else {
        let u = point.x + point.z;
        if (!axisAligned) { let tx = normal.z, tz = -normal.x; const length = Math.hypot(tx, tz) || 1; tx /= length; tz /= length; if (Math.abs(tx) >= Math.abs(tz) ? tx < 0 : tz < 0) { tx *= -1; tz *= -1; } u = point.x * tx + point.z * tz; }
        uv.setXY(i, u / sizeU, point.y / sizeV);
      }
    }
    uv.needsUpdate = true;
  });
}
export function disposeObject(object) {
  if (object.userData.systemWindow) object.userData.systemWindow.disposed = true;
  const materials = new Set(), geos = new Set();
  object.traverse(o => { if (o.geometry) geos.add(o.geometry); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m)); });
  materials.forEach(m => { m.map?.dispose(); m.dispose(); }); geos.forEach(g => g.dispose()); object.removeFromParent();
}
export function localPoint(e, x, z) {
  const dx = x - e.position[0], dz = z - e.position[2], c = Math.cos(e.rotation), s = Math.sin(e.rotation);
  return { x: c * dx - s * dz, z: s * dx + c * dz };
}
export function groundAt(entities, x, z, y, radius = 0) {
  let best = -Infinity;
  for (const e of entities) {
    if (!e.visible || !e.collision || !['floor', 'ramp', 'box', 'wall'].includes(e.type)) continue;
    const p = localPoint(e, x, z);
    const supportRadius = radius;
    if (!overlapsFootprint(e, p, supportRadius)) continue;
    const h = e.type === 'ramp' ? rampHeight(e, p.z) : e.position[1] + (e.type === 'floor' ? 0 : e.size[1]);
    if (h <= y + .42 && h > best) best = h;
  }
  return best;
}
export function isBlocked(entities, x, y, z, radius = .28, height = 1.7) {
  for (const e of entities) {
    if (!e.visible || !e.collision || ['water', 'character', 'spawn', 'light', 'disk', 'item', 'capsule'].includes(e.type)) continue;
    const p = localPoint(e, x, z);
    if (!overlapsFootprint(e, p, radius)) continue;
    if (e.type === 'floor') {
      if (y < e.position[1] - .06 && y + height > e.position[1] - e.size[1] + .025) return true;
      continue;
    }
    if (e.type === 'ramp') {
      if (y + height > e.position[1] + .025 && y < rampHeight(e, p.z) - .06) return true;
      continue;
    }
    const sy = e.type === 'exit' ? 1.9 * e.size[1] : e.size[1];
    if (y + height <= e.position[1] + .025 || y >= e.position[1] + sy - .08) continue;
    return true;
  }
  return false;
}
function footprintSize(e) { return [e.size[0] * (e.type === 'exit' ? 1.4 : 1), e.size[2] * (e.type === 'exit' ? .7 : 1)]; }
function overlapsFootprint(e, p, radius) {
  const [w, d] = footprintSize(e);
  if (!radius) return Math.abs(p.x) <= w / 2 && Math.abs(p.z) <= d / 2;
  const dx = Math.max(0, Math.abs(p.x) - w / 2), dz = Math.max(0, Math.abs(p.z) - d / 2);
  return dx * dx + dz * dz < radius * radius - .000001;
}
function rampHeight(e, localZ) { return e.position[1] + e.size[1] * (.5 - clamp(localZ / e.size[2], -.5, .5)); }
export function characterRadius(character, size = [1, 1, 1]) {
  const r = characterDefinition(character.model).radius;
  return r * Math.max(size[0], size[2]) * Math.max(1, character.headScale || 1);
}
export function resolveBodyOverlap(entities, position, radius, height) {
  const { x, y, z } = position;
  if (!isBlocked(entities, x, y, z, radius, height)) return null;
  const candidates = [];
  const add = (nx, ny, nz) => {
    if (!isBlocked(entities, nx, ny, nz, radius, height) && Number.isFinite(groundAt(entities, nx, nz, ny, radius))) candidates.push({ x: nx, y: ny, z: nz, distance: (nx - x) ** 2 + (ny - y) ** 2 + (nz - z) ** 2 });
  };
  for (const e of entities) {
    if (!isBlocked([e], x, y, z, radius, height)) continue;
    const p = localPoint(e, x, z), [w, d] = footprintSize(e), c = Math.cos(e.rotation), s = Math.sin(e.rotation);
    for (const [lx, lz] of [[w / 2 + radius + .01, p.z], [-w / 2 - radius - .01, p.z], [p.x, d / 2 + radius + .01], [p.x, -d / 2 - radius - .01]]) add(e.position[0] + c * lx + s * lz, y, e.position[2] - s * lx + c * lz);
    const top = e.type === 'ramp' ? rampHeight(e, p.z) : e.position[1] + (e.type === 'floor' ? 0 : e.size[1]);
    if (top - y >= 0 && top - y < .45) add(x, top, z);
  }
  for (const distance of [.15, .3, .6, 1, 1.5, 2, 3, 5]) {
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; add(x + Math.cos(a) * distance, y, z + Math.sin(a) * distance); }
    if (candidates.length) break;
  }
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0] || null;
}

export async function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('palace-engine', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('projects');
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
}
export async function storeProject(project) {
  const db = await database();
  try { await new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readwrite'); tx.objectStore('projects').put(project, 'working'); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('Backup interrompido'));
  }); } finally { db.close(); }
}
export async function restoreProject() {
  const db = await database();
  try { return await new Promise((resolve, reject) => { const r = db.transaction('projects').objectStore('projects').get('working'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); }
  finally { db.close(); }
}
