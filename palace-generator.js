import { newProject, createEntity, configureItem, configureWindow, mat, atlasAsset, validCharacter } from './palace-engine.js';

export const GENERATOR_STYLES = [
  { key: 'buffer', label: 'Buffer / corredores submersos', description: 'Tijolos verdes, azulejo molhado, água e luz fria.' },
  { key: 'yellow', label: 'Labirinto das Salas Amarelas', description: 'Papel amarelo, carpete, fluorescentes e Watchers.' },
  { key: 'archive', label: 'Arquivo Morto do Palace', description: 'Estantes, registros, cápsulas e projeções antigas.' },
  { key: 'shrine', label: 'Terminal do Núcleo / BSOD Shrine', description: 'Torres de monitores, telas azuis e erros flutuantes.' },
  { key: 'palace', label: 'Palace / hotel de memórias', description: 'Mistura de alas quentes e frias, quartos e andares conectados.' },
  { key: 'ghost', label: 'Memória Fantasma / plataformas', description: 'Plataformas no vazio, pontes, wireframe e dados expostos.' },
];
export const GENERATOR_LAYOUTS = [
  { key: 'dfs', label: 'Corredores longos / DFS', description: 'Caminhos profundos e muitos becos.' },
  { key: 'prim', label: 'Bifurcações curtas / Prim', description: 'Rede ramificada com decisões frequentes.' },
  { key: 'kruskal', label: 'Rede equilibrada / Kruskal', description: 'Passagens distribuídas entre vários setores.' },
  { key: 'binary', label: 'Direcional / árvore binária', description: 'Corredores com tendência norte/leste.' },
  { key: 'division', label: 'Divisão de salas', description: 'Grandes divisórias com portas entre regiões.' },
  { key: 'braided', label: 'Trançado / muitos loops', description: 'Rotas alternativas e menos becos.' },
  { key: 'rooms', label: 'Salas e corredores', description: 'Salas abertas interligadas por uma rede de passagens.' },
  { key: 'hotel', label: 'Hotel / quartos repetidos', description: 'Corredores principais e alas liminais.' },
  { key: 'rings', label: 'Anéis e núcleo central', description: 'Circuitos em volta de uma sala central.' },
  { key: 'open', label: 'Sandbox aberto / praça', description: 'Área livre com decoração e objetivos espalhados.' },
];
export const GENERATOR_SIZES = { small: [7, 7], medium: [11, 11], large: [17, 17], huge: [23, 23] };
const DIR = [{ dx: 0, dy: -1, bit: 1, opposite: 4 }, { dx: 1, dy: 0, bit: 2, opposite: 8 }, { dx: 0, dy: 1, bit: 4, opposite: 1 }, { dx: -1, dy: 0, bit: 8, opposite: 2 }];
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
export function normalizeGenerator(input = {}) {
  const integer = (v, fallback, a, b) => Number.isFinite(Number(v)) ? Math.round(clamp(Number(v), a, b)) : fallback;
  return { avatar:validCharacter(input.avatar)?input.avatar:'cob',style: GENERATOR_STYLES.some(s => s.key === input.style) ? input.style : 'buffer', layout: GENERATOR_LAYOUTS.some(s => s.key === input.layout) ? input.layout : 'dfs', width: integer(input.width, 11, 7, 30), depth: integer(input.depth, 11, 7, 30), levels: integer(input.levels, 1, 1, 3), cellSize: Number.isFinite(Number(input.cellSize)) ? clamp(Number(input.cellSize), 5, 10) : 5, seed: String(input.seed || 'PALACE-1998').slice(0, 80), loops: integer(input.loops, 10, 0, 100), density: integer(input.density, 45, 0, 100), disks: integer(input.disks, 3, 0, 9), difficulty: ['none', 'easy', 'normal', 'hard'].includes(input.difficulty) ? input.difficulty : 'normal', npcs: input.npcs !== false, windows: input.windows !== false, water: input.water !== false, roof: input.roof !== false, secrets: input.secrets !== false };
}
function hash(value) { let h = 2166136261; for (const c of value) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
function random(seed) { let state = hash(seed); return () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffle(array, rng) { for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } return array; }
function topology(w, h, layout, loops, rng) {
  const cells = Array(w * h).fill(15), rooms = [], secretEdges = [];
  const index = (x, y) => y * w + x;
  const neighbors = i => { const x = i % w, y = Math.floor(i / w); return DIR.map((d, dir) => ({ ...d, dir, x: x + d.dx, y: y + d.dy })).filter(d => d.x >= 0 && d.x < w && d.y >= 0 && d.y < h).map(d => ({ ...d, to: index(d.x, d.y) })); };
  const carve = (i, dir) => { const d = DIR[dir], x = i % w + d.dx, y = Math.floor(i / w) + d.dy; if (x < 0 || y < 0 || x >= w || y >= h) return; cells[i] &= ~d.bit; cells[index(x, y)] &= ~d.opposite; };
  const dfs = () => { const visited = new Set([0]), stack = [0]; while (stack.length) { const i = stack.at(-1), options = neighbors(i).filter(n => !visited.has(n.to)); if (!options.length) { stack.pop(); continue; } const n = options[Math.floor(rng() * options.length)]; carve(i, n.dir); visited.add(n.to); stack.push(n.to); } };
  if (layout === 'prim') {
    const visited = new Set([0]), frontier = neighbors(0).map(n => ({ from: 0, ...n }));
    while (frontier.length) { const j = Math.floor(rng() * frontier.length), edge = frontier.splice(j, 1)[0]; if (visited.has(edge.to)) continue; carve(edge.from, edge.dir); visited.add(edge.to); frontier.push(...neighbors(edge.to).filter(n => !visited.has(n.to)).map(n => ({ from: edge.to, ...n }))); }
  } else if (layout === 'kruskal') {
    const parent = Array.from({ length: w * h }, (_, i) => i), find = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
    const edges = []; cells.forEach((_, i) => neighbors(i).filter(n => n.dir === 1 || n.dir === 2).forEach(n => edges.push({ from: i, ...n })));
    for (const edge of shuffle(edges, rng)) { const a = find(edge.from), b = find(edge.to); if (a !== b) { parent[a] = b; carve(edge.from, edge.dir); } }
  } else if (layout === 'binary') {
    cells.forEach((_, i) => { const choices = neighbors(i).filter(n => n.dir === 0 || n.dir === 1); if (choices.length) carve(i, choices[Math.floor(rng() * choices.length)].dir); });
  } else if (layout === 'division') {
    cells.forEach((_, i) => neighbors(i).forEach(n => carve(i, n.dir)));
    const divide = (x, y, rw, rh) => {
      if (rw < 2 || rh < 2) return;
      const horizontal = rh > rw || rh === rw && rng() < .5;
      if (horizontal) { const cut = y + 1 + Math.floor(rng() * (rh - 1)), door = x + Math.floor(rng() * rw); for (let xx = x; xx < x + rw; xx++) if (xx !== door) { cells[index(xx, cut - 1)] |= 4; cells[index(xx, cut)] |= 1; } divide(x, y, rw, cut - y); divide(x, cut, rw, y + rh - cut); }
      else { const cut = x + 1 + Math.floor(rng() * (rw - 1)), door = y + Math.floor(rng() * rh); for (let yy = y; yy < y + rh; yy++) if (yy !== door) { cells[index(cut - 1, yy)] |= 2; cells[index(cut, yy)] |= 8; } divide(x, y, cut - x, rh); divide(cut, y, x + rw - cut, rh); }
    }; divide(0, 0, w, h);
  } else if (layout === 'open') cells.forEach((_, i) => neighbors(i).forEach(n => carve(i, n.dir)));
  else if (layout === 'hotel') {
    const spine = Math.floor(w / 2), bands = new Set([0, h - 1]); for (let y = 0; y < h; y += 3) bands.add(y);
    for (let y = 0; y < h - 1; y++) carve(index(spine, y), 2);
    for (const y of bands) for (let x = 0; x < w - 1; x++) carve(index(x, y), 1);
    for (let y = 0; y < h; y++) if (!bands.has(y)) { const band = [...bands].sort((a, b) => Math.abs(a - y) - Math.abs(b - y))[0]; for (let x = 0; x < w; x++) { let yy = y; while (yy !== band) { const dir = yy < band ? 2 : 0; carve(index(x, yy), dir); yy += DIR[dir].dy; } } }
  } else {
    dfs();
    if (layout === 'rooms') {
      const count = Math.max(3, Math.floor(w * h / 24));
      for (let r = 0; r < count; r++) { const rw = 2 + Math.floor(rng() * Math.min(3, w - 2)), rh = 2 + Math.floor(rng() * Math.min(3, h - 2)), x = Math.floor(rng() * (w - rw + 1)), y = Math.floor(rng() * (h - rh + 1)); rooms.push([x, y, rw, rh]); for (let yy = y; yy < y + rh; yy++) for (let xx = x; xx < x + rw; xx++) { if (xx < x + rw - 1) carve(index(xx, yy), 1); if (yy < y + rh - 1) carve(index(xx, yy), 2); } }
    }
    if (layout === 'rings') {
      for (let inset = 0; inset < Math.min(w, h) / 2; inset += 2) { const x2 = w - 1 - inset, y2 = h - 1 - inset; if (x2 <= inset || y2 <= inset) break; for (let x = inset; x < x2; x++) { carve(index(x, inset), 1); carve(index(x, y2), 1); } for (let y = inset; y < y2; y++) { carve(index(inset, y), 2); carve(index(x2, y), 2); } }
    }
  }
  const closed = []; cells.forEach((mask, i) => neighbors(i).filter(n => (n.dir === 1 || n.dir === 2) && mask & n.bit).forEach(n => closed.push({ from: i, dir: n.dir })));
  const ratio = layout === 'braided' ? Math.max(35, loops) : loops;
  shuffle(closed, rng).slice(0, Math.round(closed.length * ratio / 100)).forEach(e => carve(e.from, e.dir));
  return { cells, rooms, secretEdges, carve, neighbors };
}
function graphFor(levels, width, depth, links) {
  const area = width * depth, graph = Array.from({ length: area * levels.length }, () => []);
  levels.forEach((level, z) => level.cells.forEach((mask, i) => {
    const x = i % width, y = Math.floor(i / width);
    DIR.forEach(d => { const nx = x + d.dx, ny = y + d.dy; if (!(mask & d.bit) && nx >= 0 && nx < width && ny >= 0 && ny < depth) graph[z * area + i].push(z * area + ny * width + nx); });
  }));
  for (const [a, b] of links) { graph[a].push(b); graph[b].push(a); }
  return graph;
}
function bfs(graph, start) { const distance = Array(graph.length).fill(-1), parent = Array(graph.length).fill(-1), queue = [start]; distance[start] = 0; for (let q = 0; q < queue.length; q++) for (const next of graph[queue[q]]) if (distance[next] < 0) { distance[next] = distance[queue[q]] + 1; parent[next] = queue[q]; queue.push(next); } return { distance, parent, queue }; }
function mergedRuns(flags, emit) { for (let i = 0; i < flags.length;) { if (!flags[i]) { i++; continue; } const start = i; while (i < flags.length && flags[i]) i++; emit(start, i - start); } }

export function generatePalace(input = {}, library = {}) {
  const cfg = normalizeGenerator(input), rng = random(cfg.seed), p = newProject(), area = cfg.width * cfg.depth, N = area * cfg.levels, cs = cfg.cellSize, wallH = 5.4, storyH = 8, thickness = .35;
  const ox = -cfg.width * cs / 2, oz = -cfg.depth * cs / 2, hashPrefix = hash(cfg.seed + JSON.stringify(cfg)).toString(16);
  p.name = `${GENERATOR_STYLES.find(s => s.key === cfg.style).label} / ${cfg.seed}`;
  p.atlas = { ...(library.atlas || {}) }; for (const id of Object.values(p.atlas)) if (library.assets?.[id]) p.assets[id] = structuredClone(library.assets[id]);
  const environments = { buffer: ['#0b1715', '#172d26', .012, 1.3], yellow: ['#211f10', '#54482a', .014, 1.6], archive: ['#100d1a', '#201c2f', .011, 1.3], shrine: ['#071025', '#182940', .01, 1.5], palace: ['#111b1b', '#25372e', .012, 1.5], ghost: ['#02080c', '#0b2429', .008, 1.5] }[cfg.style];
  p.environment = { background: environments[0], fog: environments[1], fogDensity: environments[2], ambient: environments[3], pixelated: true };
  const levels = Array.from({ length: cfg.levels }, () => topology(cfg.width, cfg.depth, cfg.layout, cfg.loops, rng)), links = [], roofIds = [], reserve = new Set();
  const start = (cfg.depth - 2) * cfg.width + 1;
  // A small entry vestibule leaves room behind the third-person camera and a clear way forward.
  levels[0].carve(start, 0); levels[0].carve(start, 2); levels[0].carve(start, 3);
  for (let l = 0; l < cfg.levels - 1; l++) { const east = l % 2 === 1, column = east ? cfg.width - 1 : 0, bit = east ? 2 : 8, low = l * area + 5 * cfg.width + column, high = (l + 1) * area + cfg.width + column; links.push([low, high]); reserve.add(low); reserve.add(high); levels[l].cells[5 * cfg.width + column] &= ~bit; levels[l + 1].cells[cfg.width + column] &= ~bit; }
  if (cfg.secrets && cfg.style !== 'ghost') levels.forEach(level => {
    const candidates = []; level.cells.forEach((mask, from) => level.neighbors(from).filter(n => (n.dir === 1 || n.dir === 2) && mask & n.bit).forEach(n => candidates.push({ from, dir: n.dir })));
    for (const edge of shuffle(candidates, rng).slice(0, Math.max(1, Math.floor(area / 120)))) { level.secretEdges.push(edge); level.carve(edge.from, edge.dir); }
  });
  const graph = graphFor(levels, cfg.width, cfg.depth, links), navigation = bfs(graph, start);
  if (navigation.queue.length !== N) throw new Error('Falha interna: o mapa não ficou conectado.');
  const finalFloor = navigation.queue.filter(node => Math.floor(node / area) === cfg.levels - 1);
  const exitNode = finalFloor.reduce((a, b) => navigation.distance[b] > navigation.distance[a] ? b : a, finalFloor[0]);
  const world = node => { const level = Math.floor(node / area), cell = node % area; return [ox + (cell % cfg.width + .5) * cs, level * storyH, oz + (Math.floor(cell / cfg.width) + .5) * cs]; };
  const material = (key, extra = {}) => { const id = atlasAsset(p, key), fallback = { teal: 'metal', red: 'plaid', fur: 'none' }[key] || key; return mat(id ? 'custom' : fallback, '#ffffff', { texture: id, mapping: 'world', tileSize: [3, 3], ...extra }); };
  const chooseWall = (x = 0) => cfg.style === 'yellow' || cfg.style === 'palace' && x < 0 ? 'yellow' : cfg.style === 'archive' ? 'metal' : cfg.style === 'shrine' ? 'concrete' : 'brick';
  const floorKey = cfg.style === 'yellow' ? 'carpet' : cfg.style === 'archive' ? 'wood' : cfg.style === 'shrine' || cfg.style === 'ghost' ? 'metal' : 'tile';
  let serial = 0;
  const add = (type, position, size, options = {}, essential = false) => {
    if (p.entities.length >= 1490) { if (essential) throw new Error('A geometria ultrapassou 1.490 objetos. Reduza o tamanho, os andares ou os loops.'); return null; }
    const e = createEntity(type, options.model, p); e.id = `gen-${hashPrefix}-${++serial}`; e.position = [...position]; if (size) e.size = [...size];
    if (options.material) e.material = options.material; if (options.name) e.name = options.name;
    if (options.collision !== undefined) e.collision = options.collision;
    p.entities.push(e); return e;
  };
  const floor = (pos, size, name, key = floorKey) => add('floor', pos, size, { name, material: material(key, { roughness: key === 'carpet' ? .95 : .35, metalness: key === 'carpet' ? 0 : .25 }) }, true);
  for (let l = 0; l < cfg.levels; l++) {
    const y = l * storyH, level = levels[l];
    if (cfg.style !== 'ghost') floor([0, y, 0], [cfg.width * cs, .3, cfg.depth * cs], `Piso / andar ${l + 1}`);
    else {
      for (let i = 0; i < area; i++) floor(world(l * area + i), [cs * .68, .3, cs * .68], 'Plataforma de memória');
      for (let yy = 0; yy < cfg.depth; yy++) mergedRuns(Array.from({ length: cfg.width - 1 }, (_, x) => !(level.cells[yy * cfg.width + x] & 2)), (x, length) => floor([ox + (x + 1 + (length - 1) / 2) * cs, y - .015, oz + (yy + .5) * cs], [length * cs - cs * .68 + .08, .15, 2.2], 'Ponte / dados horizontais'));
      for (let xx = 0; xx < cfg.width; xx++) mergedRuns(Array.from({ length: cfg.depth - 1 }, (_, z) => !(level.cells[z * cfg.width + xx] & 4)), (z, length) => floor([ox + (xx + .5) * cs, y - .015, oz + (z + 1 + (length - 1) / 2) * cs], [2.2, .15, length * cs - cs * .68 + .08], 'Ponte / dados verticais'));
    }
    if (cfg.roof && cfg.style !== 'ghost') { const e = floor([0, y + wallH + .3, 0], [cfg.width * cs, .3, cfg.depth * cs], `Teto / andar ${l + 1}`, 'concrete'); roofIds.push(e.id); }
    if (cfg.style !== 'ghost') {
      for (let z = 0; z <= cfg.depth; z++) mergedRuns(Array.from({ length: cfg.width }, (_, x) => z === cfg.depth ? !!(level.cells[(cfg.depth - 1) * cfg.width + x] & 4) : !!(level.cells[z * cfg.width + x] & 1)), (x, length) => { const cx = ox + (x + length / 2) * cs; add('wall', [cx, y, oz + z * cs], [length * cs + thickness, wallH, thickness], { name: 'Parede / conexão horizontal', material: material(chooseWall(cx)) }, true); });
      for (let x = 0; x <= cfg.width; x++) mergedRuns(Array.from({ length: cfg.depth }, (_, z) => x === cfg.width ? !!(level.cells[z * cfg.width + cfg.width - 1] & 2) : !!(level.cells[z * cfg.width + x] & 8)), (z, length) => { const cx = ox + x * cs; add('wall', [cx, y, oz + (z + length / 2) * cs], [thickness, wallH, length * cs + thickness], { name: 'Parede / conexão vertical', material: material(chooseWall(cx)) }, true); });
      for (const edge of level.secretEdges) { const pos = world(l * area + edge.from), d = DIR[edge.dir]; const e = add('wall', [pos[0] + d.dx * cs / 2, y, pos[2] + d.dy * cs / 2], edge.dir === 1 ? [thickness, wallH, cs] : [cs, wallH, thickness], { name: 'Costura / parede falsa', collision: false, material: material(chooseWall(pos[0]), { opacity: .8, emissive: '#231321' }) }, true); }
    }
  }
  for (let l = 0; l < cfg.levels - 1; l++) {
    const east = l % 2 === 1, boundaryX = east ? ox + cfg.width * cs : ox;
    const x = boundaryX + (east ? 1 : -1) * cs / 2, y = l * storyH, topZ = oz + 2 * cs, lowZ = oz + 5 * cs, length = lowZ - topZ;
    add('ramp', [x, y, (topZ + lowZ) / 2], [3.2, storyH, length], { name: `Escadaria / andar ${l + 1} → ${l + 2}`, material: material('metal') }, true);
    for (const side of [-1, 1]) add('ramp', [x + side * 1.7, y + 1, (topZ + lowZ) / 2], [.15, storyH, length], { name: 'Guarda-corpo inclinado', material: material('metal') }, true);
    const landingWidth = cs * 1.5, landingX = boundaryX + (east ? 1 : -1) * cs / 4;
    floor([landingX, y, oz + 5.5 * cs], [landingWidth, .3, cs], 'Patamar / base da escadaria');
    floor([landingX, y + storyH, oz + 1.5 * cs], [landingWidth, .3, cs], 'Patamar / topo da escadaria');
  }
  reserve.add(start); reserve.add(exitNode);
  const ranked = [...navigation.queue].filter(n => !reserve.has(n)).sort((a, b) => navigation.distance[b] - navigation.distance[a]), diskNodes = [];
  for (let i = 0; i < cfg.disks; i++) { const candidates = i < cfg.levels ? ranked.filter(n => Math.floor(n / area) === i && !reserve.has(n)) : ranked.filter(n => !reserve.has(n)); const target = candidates[i < cfg.levels ? 0 : Math.min(candidates.length - 1, Math.floor(i * candidates.length / Math.max(1, cfg.disks)))]; if (target !== undefined && !diskNodes.includes(target)) { diskNodes.push(target); reserve.add(target); } }
  const spawn = add('spawn', world(start), null, { model:cfg.avatar,name: 'Entrada / protagonista gerado' }, true);
  spawn.character.dialogue = '';
  const exit = add('exit', world(exitNode), null, { name: 'COB_01.EXE / saída gerada' }, true);
  const exitPos = world(exitNode), spawnPos = world(start); exit.rotation = Math.PI;
  diskNodes.forEach((n, i) => add('disk', world(n), null, { name: `BUFFER_${String(i + 1).padStart(2, '0')}.DAT` }, true));
  const checkpointNodes = [start];
  checkpointNodes.push(...links.map(([, high]) => high));
  for (const node of checkpointNodes) { const pos = world(node); add('capsule', [pos[0] + cs * .24, pos[1], pos[2] + cs * .24], null, { name: 'Hyper-Sleep / checkpoint' }, true); reserve.add(node); }
  const free = shuffle([...navigation.queue].filter(n => !reserve.has(n)), rng), take = () => { let node; do { node = free.shift(); } while (node !== undefined && reserve.has(node)); if (node !== undefined) reserve.add(node); return node; };
  if (cfg.npcs) {
    const candidates = [...navigation.queue].filter(n => !reserve.has(n) && navigation.distance[n] > 0).sort((a, b) => navigation.distance[a] - navigation.distance[b]);
    const guideNode = candidates[0]; if (guideNode !== undefined) { const e = add('character', world(guideNode), null, { model: 'kone', name: 'K-One / guia do setor' }, true); e.character.dialogue = `Recupere ${cfg.disks} disquetes para restaurar a saída. ${cfg.secrets ? 'Paredes com brilho rosa podem esconder passagens.' : 'O mapa tem uma rota conectada até o terminal.'} O inventário abre com I.`; reserve.add(guideNode); const i = free.indexOf(guideNode); if (i >= 0) free.splice(i, 1); }
    const archiveNode = take(); if (archiveNode !== undefined) { const e = add('character', world(archiveNode), null, { model: cfg.style === 'ghost' ? 'cobaia' : 'boxjaw', name: 'Arquivista / registro do setor' }, true); e.character.dialogue = `Este lugar foi reconstruído a partir da semente ${cfg.seed}. As cápsulas guardam os arquivos recuperados e a integridade da sua versão atual.`; }
  }
  const enemyCount = cfg.difficulty === 'none' ? 0 : cfg.difficulty === 'easy' ? cfg.levels : cfg.difficulty === 'hard' ? Math.min(8, cfg.levels * 3) : Math.min(5, cfg.levels * 2);
  const distant = free.filter(n => navigation.distance[n] >= 7);
  for (let i = 0; i < enemyCount && distant.length; i++) { const node = distant.shift(); reserve.add(node); const model = i % 2 ? 'sysadmin' : 'eros', pos = world(node); if (model === 'eros') pos[1] += 3; const e = add('character', pos, model === 'sysadmin' ? [.9, .9, .9] : [.8, .8, .8], { model, name: model === 'eros' ? 'Eros / patrulha do setor' : 'SysAdmin / Hall Monitor' }, true); e.character.range = cfg.difficulty === 'hard' ? 17 : 12; e.character.damage = cfg.difficulty === 'hard' ? 2 : 1; }
  const extraItems = Math.min(12, Math.max(3, Math.floor(N / 70)));
  for (let i = 0; i < extraItems; i++) { const node = take(); if (node === undefined) break; const e = add('item', world(node), null, {}, true); configureItem(e, i % 3 === 0 ? 'heal' : i % 3 === 1 ? 'note' : 'key'); if (e.pickup.kind === 'note') { e.pickup.itemId = `log-${i}`; e.pickup.description = `PALACE / registro ${i + 1}\nSeed: ${cfg.seed}\nSetor: ${cfg.style}\n“Memórias também apodrecem, mas nunca desaparecem.”`; } }
  const pointLights = Math.min(20, Math.max(cfg.levels * 3, Math.floor(N / 20))), fixtureCount = Math.min(100, Math.max(cfg.levels * 6, Math.floor(N / 6)));
  const decorationNodes = shuffle([...navigation.queue], rng), warm = cfg.style === 'yellow' || cfg.style === 'palace', lightColor = warm ? '#edda9a' : cfg.style === 'archive' ? '#c3a1d4' : '#9ed9d2';
  for (let i = 0; i < fixtureCount && p.entities.length < 1470; i++) { const pos = world(decorationNodes[Math.floor(i * decorationNodes.length / fixtureCount)]); add('box', [pos[0], pos[1] + wallH - .22, pos[2]], [2.2, .1, .28], { name: 'Luminária fluorescente', collision: false, material: mat('none', '#18211d', { emissive: lightColor }) }); }
  for (let i = 0; i < pointLights; i++) { const pos = world(decorationNodes[Math.floor(i * decorationNodes.length / pointLights)]); const e = add('light', [pos[0], pos[1] + wallH - .25, pos[2]], [1, 1, 1], { name: 'Iluminação do setor' }); if (e) e.light = { color: i % 5 === 0 && !warm ? '#ce8cbe' : lightColor, intensity: 25, range: cs * 3.4 }; }
  const budget = Math.min(Math.floor(N * cfg.density / 100 * .3), Math.max(0, 1460 - p.entities.length)), decor = shuffle([...navigation.queue].filter(n => !reserve.has(n)), rng);
  let windowCount = 0;
  for (let i = 0; i < budget && decor.length; i++) {
    const node = decor.pop(), pos = world(node), level = Math.floor(node / area), cell = node % area, cx = cell % cfg.width;
    if (cfg.windows && i % 3 === 0) {
      const walls = DIR.map((d, k) => ({ ...d, dir: k })).filter(d => levels[level].cells[cell] & d.bit), wall = walls[Math.floor(rng() * walls.length)], preset = cfg.style === 'shrine' ? i % 2 ? 'bsod' : 'choice' : i % 6 === 0 ? 'eye' : 'lips';
      const e = add('window', wall ? [pos[0] + wall.dx * (cs / 2 - thickness / 2 - .1), pos[1] + 2.8, pos[2] + wall.dy * (cs / 2 - thickness / 2 - .1)] : [pos[0] + cs * .2, pos[1] + 2.8, pos[2]], [1.6, 1.3, .12], {});
      if (e) { configureWindow(e, preset); e.size = [1.6, 1.3, .12]; e.window.mount = wall ? 'wall' : 'floating'; e.window.facing = wall ? 'fixed' : 'camera'; e.window.bob = wall ? 0 : .08; e.rotation = wall ? Math.atan2(wall.dx, wall.dy) : Math.PI; e.collision = false; if (e.window.content === 'image') { const id = atlasAsset(p, preset === 'lips' ? 'lips' : 'eye'); if (id) { e.material.preset = 'custom'; e.material.texture = id; } } windowCount++; }
    } else {
      const corner = [pos[0] + cs * .27, pos[1], pos[2] + cs * .27];
      const shelf = cfg.style === 'archive', tower = cfg.style === 'shrine';
      const e = add('box', corner, shelf ? [1.05, 3.9, 1.05] : tower ? [1.1, 3.3, 1.1] : [.9, .9 + rng() * .8, .9], { name: shelf ? 'Estante / arquivos preservados' : tower ? 'Torre / suporte de monitores' : 'Caixa / detrito do setor', material: material(shelf ? 'wood' : 'metal') });
      if (e && (shelf || tower) && p.entities.length < 1465) { const screen = add('screen', [corner[0], corner[1] + 2.5, corner[2] - .56], [1, .85, .3], { name: 'Monitor de arquivo', material: material(tower ? 'static' : 'eye', { mapping: 'local' }), collision: false }); }
    }
  }
  if (cfg.water && cfg.style !== 'ghost') for (let l = 0; l < cfg.levels; l++) add('water', [0, l * storyH + .02, 0], [cfg.width * cs - .8, .1, cfg.depth * cs - .8], { name: 'Água / reflexos de buffer', material: material('water', { opacity: cfg.style === 'yellow' ? .14 : .28, roughness: .08, metalness: .65 }), collision: false });
  if (cfg.style === 'archive' || cfg.style === 'palace' || cfg.style === 'ghost') for (let i = 0; i < Math.min(8, Math.floor(N / 45)); i++) { const node = take(); if (node === undefined) break; const pos = world(node), e = add('character', [pos[0] + cs * .24, pos[1], pos[2] + cs * .24], [.6, .6, .6], { model: 'cob', name: 'Cob-01.cache / versão preservada' }); if (e) { e.character.role = 'cache'; e.character.invulnerable = true; e.character.dialogue = 'Esta versão ficou no último backup.'; Object.values(e.character.appearance).forEach(m => m.opacity = .4); } }
  const route = []; for (let node = exitNode; node >= 0; node = navigation.parent[node]) { route.push(node); if (node === start) break; } route.reverse();
  const edges = graph.reduce((sum, n) => sum + n.length, 0) / 2, deadEnds = graph.filter(n => n.length === 1).length;
  p.generation = { format: 'palace-procedural-v1', config: cfg, width: cfg.width, depth: cfg.depth, levels: cfg.levels, cells: levels.map(l => l.cells), rooms: levels.map(l => l.rooms), links, start, exit: exitNode, disks: diskNodes, checkpoints: checkpointNodes, route, roofIds, stats: { cells: N, reachable: navigation.queue.length, edges, loops: edges - N + 1, deadEnds, pathLength: route.length, objects: p.entities.length, windows: windowCount, enemies: enemyCount, widthMeters: cfg.width * cs, depthMeters: cfg.depth * cs, heightMeters: cfg.levels * storyH } };
  return p;
}

export function drawGeneratorMap(canvas, generation, level = 0, showRoute = true) {
  const { width: w, depth: h, cells, start, exit, disks, checkpoints, route } = generation, area = w * h;
  const ctx = canvas.getContext('2d'), pad = 22, scale = Math.min((canvas.width - pad * 2) / w, (canvas.height - pad * 2) / h), x0 = (canvas.width - w * scale) / 2, y0 = (canvas.height - h * scale) / 2;
  ctx.fillStyle = '#101a15'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#263d2b'; ctx.fillRect(x0, y0, w * scale, h * scale);
  const point = n => [x0 + (n % area % w + .5) * scale, y0 + (Math.floor(n % area / w) + .5) * scale];
  if (showRoute) { ctx.strokeStyle = '#d4b87599'; ctx.lineWidth = Math.max(2, scale * .22); ctx.beginPath(); let previous = null; for (const n of route) { if (Math.floor(n / area) !== level) { previous = null; continue; } const [x,y] = point(n); if (previous === null) ctx.moveTo(x,y); else ctx.lineTo(x,y); previous = n; } ctx.stroke(); }
  ctx.strokeStyle = '#91b17a'; ctx.lineWidth = 1.5;
  cells[level].forEach((mask, i) => { const x = x0 + i % w * scale, y = y0 + Math.floor(i / w) * scale; ctx.beginPath(); if (mask & 1) { ctx.moveTo(x,y); ctx.lineTo(x+scale,y); } if (mask & 2) { ctx.moveTo(x+scale,y); ctx.lineTo(x+scale,y+scale); } if (mask & 4) { ctx.moveTo(x,y+scale); ctx.lineTo(x+scale,y+scale); } if (mask & 8) { ctx.moveTo(x,y); ctx.lineTo(x,y+scale); } ctx.stroke(); });
  const marker = (n, color, radius = 3, offset = 0) => { if (Math.floor(n / area) !== level) return; const [x,y] = point(n); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x + offset * scale,y + offset * scale,Math.max(radius,scale*.12),0,7);ctx.fill(); };
  marker(start, '#e99bbc', 5); marker(exit, '#a6e7d6', 5); disks.forEach(n => marker(n, '#f1cc76')); checkpoints.forEach(n => marker(n, '#7ca6e7', 3, .24)); generation.links.flat().forEach(n => marker(n, '#e5dbe6', 4));
}
