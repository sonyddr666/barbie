import * as THREE from 'three';
import { OrbitControls } from './node_modules/three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from './node_modules/three/examples/jsm/controls/TransformControls.js';
import { CATALOG, ATLAS_TILES, ARCHITECTURE_TYPES, characterSlots, updateEntityUV, atlasAsset, applyAtlasToEntity, setAtlasMaterial, configureItem, configureWindow, clone, uid, clamp, createEntity, appearance, newProject, demoProject, validateProject, buildEntity, disposeObject, previewTexture, storeProject, restoreProject } from './palace-engine.js';
import { sliceAtlas } from './palace-atlas.js';
import { snapConnection } from './palace-connections.js';
import { PlaySession } from './palace-runtime.js';
import { GENERATOR_STYLES, GENERATOR_LAYOUTS, GENERATOR_SIZES, normalizeGenerator, generatePalace, drawGeneratorMap } from './palace-generator.js';
import { WINDOW_PRESETS, WINDOW_ACTIONS, windowPreset, windowState, drawWindow, WindowPanel, orientSystemWindow, applyWindowControl } from './palace-windows.js';

const $ = id => document.getElementById(id);
const viewport = $('viewport');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, .1, 500);
camera.position.set(26, 25, 30);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewport.prepend(renderer.domElement);
renderer.domElement.tabIndex = 0;
const actorLayer = document.createElement('div'); actorLayer.id = 'actorLabels'; viewport.append(actorLayer);
const actorInfo = document.createElement('div'); actorInfo.id = 'runtimeActorInfo'; actorInfo.className = 'hidden'; viewport.append(actorInfo);
const materialPartNote = document.createElement('p'); materialPartNote.id = 'materialPartNote'; materialPartNote.className = 'field-note'; $('slotField').after(materialPartNote);
{ const option = document.createElement('option'); option.value = 'static'; option.textContent = 'Estática CRT'; $('materialPreset').append(option); }
for (const [key, name] of [['wood','Madeira escura'],['concrete','Concreto rachado'],['carpet','Carpete mofado'],['water','Água de buffer']]) { const option = document.createElement('option'); option.value = key; option.textContent = name; $('materialPreset').append(option); }
const ambient = new THREE.HemisphereLight('#c6ddbf', '#182c23', 1.6); scene.add(ambient);
const sun = new THREE.DirectionalLight('#c9d9bc', 2); sun.position.set(12, 35, 18); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, far: 120 }); sun.shadow.bias = -.001; scene.add(sun);
const world = new THREE.Group(); scene.add(world);
const grid = new THREE.GridHelper(160, 160, '#53654e', '#273d2d'); grid.position.y = .012; grid.material.transparent = true; grid.material.opacity = .45; scene.add(grid);
const axes = new THREE.AxesHelper(3); axes.position.y = .025; scene.add(axes);
const orbit = new OrbitControls(camera, renderer.domElement); orbit.target.set(0, 0, -4); orbit.enableDamping = true;
orbit.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE }; orbit.maxPolarAngle = Math.PI * .49; orbit.minDistance = 2; orbit.maxDistance = 180;
const transform = new TransformControls(camera, renderer.domElement); transform.setSize(.8); scene.add(transform.getHelper());
const selectionBox = new THREE.BoxHelper(new THREE.Object3D(), '#b7d895'); selectionBox.visible = false; scene.add(selectionBox);
const roots = new Map(), undo = [], redo = [];
let project = demoProject(), selected = null, placement = null, ghost = null, ghostPoint = null, copiedMaterial = null, saveTimer, saveChain = Promise.resolve(), revision = 0, savedRevision = -1;
let session = null, editorCamera = null, transforming = false, pointerDown = null, dragCamera = null, toastTimer, modalCloseCallback = null, loadingProject = true;
let textureTarget = null, cropImage = null, cropName = '', cropOffset = { x: 0, y: 0 }, cropBase = 1, cropDragging = null;
let copiedObject = null, pasteCount = 0;
let importingAtlas = false;
let ghostDefinition = null;
let previewRoot = null, previewEntity = null;
let generatedPreview = null;
const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
ray.params.Line.threshold = .035;
const windowPreview = new WindowPanel({ parent: viewport, onControl: control => {
  if (!previewRoot) return; const data = previewRoot.userData.systemWindow, effect = applyWindowControl(previewEntity.window, data.state, control);
  if (effect?.close) { windowPreview.close(); return; }
  if (effect && !['pause', 'menu'].includes(effect.effect)) toast('Prévia da ação: ' + WINDOW_ACTIONS[effect.effect]);
  data.repaint(data.state); windowPreview.render();
}, onDismiss: () => { if (previewRoot) disposeObject(previewRoot); previewRoot = null; previewEntity = null; } });

function toast(text, duration = 3500) { $('editorToast').textContent = text; $('editorToast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('editorToast').classList.remove('show'), duration); }
function snapshot() { return { name: project.name, environment: clone(project.environment), entities: clone(project.entities), assets: project.assets, atlas: clone(project.atlas || {}), generation: clone(project.generation || null), selected }; }
function pushHistory() { undo.push(snapshot()); if (undo.length > 60) undo.shift(); redo.length = 0; historyButtons(); }
function historyButtons() { $('undoButton').disabled = !undo.length; $('redoButton').disabled = !redo.length; $('deleteButton').disabled = !selected; $('duplicateButton').disabled = !selected; $('copyObjectButton').disabled = !selected; }
function fromSnapshot(s) {
  project = { ...project, name: s.name, environment: clone(s.environment), entities: clone(s.entities), assets: { ...project.assets, ...s.assets }, atlas: clone(s.atlas || {}), generation: s.generation ? clone(s.generation) : undefined };
  selected = s.selected; rebuildAll(); changed();
}
function undoAction() { if (!undo.length || session) return; redo.push(snapshot()); fromSnapshot(undo.pop()); historyButtons(); }
function redoAction() { if (!redo.length || session) return; undo.push(snapshot()); fromSnapshot(redo.pop()); historyButtons(); }
function changed() {
  revision++; $('saveState').textContent = 'Alterações locais · salvamento pendente';
  clearTimeout(saveTimer); saveTimer = setTimeout(() => save(false), 900);
  refreshHierarchy(); historyButtons();
  refreshAtlasLibrary();
}
function save(notify = true) {
  clearTimeout(saveTimer); const data = clone(project), version = revision; $('saveState').textContent = 'Salvando no navegador...';
  saveChain = saveChain.catch(() => {}).then(async () => {
    try {
      await storeProject(data); savedRevision = version;
      $('saveState').textContent = revision === version ? '● Salvo no navegador · ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Alterações locais · salvamento pendente';
      if (notify) toast('PROJETO SALVO — objetos, personagens e texturas.');
    } catch (err) { $('saveState').textContent = 'Falha no salvamento · exporte o JSON'; toast('Não foi possível salvar no navegador. Exporte o JSON para guardar o projeto.', 7000); console.error(err); }
  });
  return saveChain;
}
function applyEnvironment() {
  const e = project.environment; scene.background = new THREE.Color(e.background); scene.fog = new THREE.FogExp2(e.fog, e.fogDensity); ambient.intensity = e.ambient;
  viewport.classList.toggle('pixelated', e.pixelated); renderer.setPixelRatio(e.pixelated ? .9 : Math.min(devicePixelRatio, 1.5));
  $('worldFog').value = e.fog; $('worldBackground').value = e.background; $('fogDensity').value = e.fogDensity; $('ambientIntensity').value = e.ambient; $('worldPixelated').checked = e.pixelated;
  $('fogValue').textContent = e.fogDensity.toFixed(3); $('ambientValue').textContent = e.ambient.toFixed(1);
  resize();
}
function rebuildAll() {
  transform.detach(); selectionBox.visible = false;
  for (const root of roots.values()) disposeObject(root); roots.clear();
  for (const entity of project.entities) { const root = buildEntity(entity, project); world.add(root); roots.set(entity.id, root); }
  scene.updateMatrixWorld(true); applyEnvironment(); $('projectName').value = project.name;
  if (!roots.has(selected)) selected = null; select(selected); refreshHierarchy();
  $('emptyHint').classList.toggle('hidden', project.entities.length > 0);
  applyEditorVisibility();
  refreshAtlasLibrary();
}
function rebuildEntity(id) {
  const e = project.entities.find(e => e.id === id); if (!e) return;
  if (id === selected) transform.detach(); const old = roots.get(id); if (old) disposeObject(old);
  const root = buildEntity(e, project); world.add(root); roots.set(id, root); scene.updateMatrixWorld(true);
  if (id === selected) { transform.attach(root); updateSelectionBox(); }
}
function applyEditorVisibility() {
  const roofs = new Set(project.generation?.roofIds || []); $('generatedRoofControl').classList.toggle('hidden', !roofs.size);
  for (const e of project.entities) roots.get(e.id).visible = e.visible && (session || !$('hideGeneratedRoofs').checked || !roofs.has(e.id));
  updateSelectionBox();
}
$('hideGeneratedRoofs').onchange = applyEditorVisibility;
function getSelected() { return project.entities.find(e => e.id === selected); }
function materialFor(entity = getSelected(), slot = $('materialSlot').value) { return !entity ? null : ['character', 'spawn'].includes(entity.type) ? entity.character.appearance[slot || 'body'] : entity.material; }
function updateSelectionBox() { const root = roots.get(selected); selectionBox.visible = !!root && root.visible && !session; if (root) selectionBox.setFromObject(root); }
function select(id) {
  selected = id; const e = getSelected(); transform.detach();
  if (e?.type === 'window' && !session) { const root = roots.get(id); root.position.fromArray(e.position); root.rotation.set(0, e.rotation, 0); root.scale.fromArray(e.size); }
  $('noSelection').classList.toggle('hidden', !!e); $('objectInspector').classList.toggle('hidden', !e);
  $('selectedType').textContent = e ? e.type.toUpperCase() : 'WORLD';
  $('selectionStatus').textContent = e ? `${e.name} / ${e.type}` : 'Nenhum objeto selecionado';
  if (e && !session && !placement) transform.attach(roots.get(id));
  updateSelectionBox(); inspector(); refreshHierarchy(); historyButtons(); refreshAtlasLibrary();
}
function inspector() {
  const e = getSelected(); if (!e) return;
  $('objectId').textContent = e.id.slice(0, 8); $('objectName').value = e.name; $('objectVisible').checked = e.visible; $('objectCollision').checked = e.collision;
  document.querySelectorAll('#positionFields input').forEach(i => i.value = Number(e.position[Number(i.dataset.axis)].toFixed(3)));
  document.querySelectorAll('#sizeFields input').forEach(i => i.value = Number(e.size[Number(i.dataset.axis)].toFixed(3)));
  $('objectRotation').value = Number(THREE.MathUtils.radToDeg(e.rotation).toFixed(1));
  const character = ['spawn', 'character'].includes(e.type);
  $('characterSection').classList.toggle('hidden', !character); $('lightSection').classList.toggle('hidden', e.type !== 'light');
  $('windowSection').classList.toggle('hidden', e.type !== 'window'); if (e.type === 'window') windowInspector(e);
  $('behaviorSection').classList.toggle('hidden', !['screen', 'exit'].includes(e.type)); $('interactionText').value = e.message;
  $('mappingSection').classList.toggle('hidden', !ARCHITECTURE_TYPES.includes(e.type));
  $('connectionSection').classList.toggle('hidden', !['floor', 'wall', 'box', 'ramp'].includes(e.type));
  $('connectionInfo').textContent = e.type === 'ramp' ? 'A rampa sobe para o eixo local -Z. Conectar aproxima a base ou o topo do piso correspondente.' : 'Alinha faces e bordas de peças a até 5 m. Alt+C conecta. Ctrl+Z desfaz.';
  $('playerMovementSection').classList.toggle('hidden', !(e.type === 'spawn' || character && e.character.role === 'player'));
  $('characterJumpSpeed').value = e.character.jumpSpeed;
  $('pickupSection').classList.toggle('hidden', !['item', 'disk', 'box'].includes(e.type));
  $('pickupEnabled').checked = e.pickup.enabled; $('pickupEnabled').disabled = e.type === 'disk'; $('pickupKind').value = e.pickup.kind; $('pickupKind').disabled = e.type === 'disk';
  $('pickupKind').querySelector('option[value="disk"]').disabled = e.type !== 'disk';
  $('pickupName').value = e.pickup.name; $('pickupId').value = e.pickup.itemId; $('pickupQuantity').value = e.pickup.quantity; $('pickupQuantity').disabled = e.type === 'disk'; $('pickupHeal').value = e.pickup.heal; $('pickupDescription').value = e.pickup.description;
  const previousSlot = $('materialSlot').value;
  $('materialSlot').replaceChildren();
  const choices = character ? characterSlots(e.character.model).map(s => [s.key, s.label]) : [['surface', e.type === 'window' ? 'Imagem do conteúdo / cor' : e.type === 'screen' ? 'Tela do monitor' : 'Superfície']];
  for (const [value, text] of choices) { const o = document.createElement('option'); o.value = value; o.textContent = text; $('materialSlot').append(o); }
  if (character && [...$('materialSlot').options].some(o => o.value === previousSlot)) $('materialSlot').value = previousSlot;
  if (character) {
    $('characterModel').value = e.character.model; $('characterRole').value = e.character.role; $('characterDialogue').value = e.character.dialogue;
    $('characterSpeed').value = e.character.speed; $('characterRange').value = e.character.range; $('headScale').value = e.character.headScale; $('earScale').value = e.character.earScale;
    $('characterHealth').value = e.character.maxHealth; $('characterDamage').value = e.character.damage;
    $('characterInvulnerable').checked = e.character.invulnerable; $('characterMovement').value = e.character.movement;
    $('characterWanderRadius').value = e.character.wanderRadius; $('characterIdleAnimation').checked = e.character.idleAnimation;
  }
  $('lightColor').value = e.light.color; $('lightIntensity').value = e.light.intensity; $('lightRange').value = e.light.range;
  materialInspector();
}
function materialInspector() {
  const m = materialFor(); if (!m) return;
  $('materialColor').value = m.color; $('materialEmission').value = m.emissive; $('materialPreset').value = m.preset;
  $('repeatU').value = m.repeat[0]; $('repeatV').value = m.repeat[1]; $('uvRotation').value = m.uvRotation;
  $('materialMapping').value = m.mapping; $('tileSizeU').value = m.tileSize[0]; $('tileSizeV').value = m.tileSize[1]; $('offsetU').value = m.offset[0]; $('offsetV').value = m.offset[1];
  const entity = getSelected(), isCharacter = ['character', 'spawn'].includes(entity.type), specification = isCharacter ? characterSlots(entity.character.model).find(s => s.key === $('materialSlot').value) : null;
  const isWindow = entity.type === 'window', isLine = specification?.texture === false;
  for (const id of ['repeatU', 'repeatV', 'uvRotation', 'roughness', 'metalness']) $(id).disabled = isWindow || isLine;
  for (const id of ['materialPreset', 'textureEdit', 'textureClear']) $(id).disabled = isLine;
  let count = 0; if (isCharacter) roots.get(entity.id)?.traverse(o => { if (o.userData.materialSlot === specification?.key) count++; });
  materialPartNote.textContent = isLine ? 'Wireframe: cor, emissão e opacidade das linhas. Esta parte não usa imagem.' : isCharacter ? `${specification.label} · ${count} superfícies. A edição afeta somente esta parte.` : '';
  for (const k of ['roughness', 'metalness', 'opacity']) { $(k).value = m[k]; $(k + 'Value').textContent = m[k].toFixed(2); }
  const data = previewTexture(m, project); $('texturePreview').replaceChildren();
  if (data) { const img = document.createElement('img'); img.src = data; img.alt = 'Textura da parte selecionada'; $('texturePreview').append(img); }
  else { const label = document.createElement('span'); label.textContent = m.preset === 'custom' ? 'IMAGEM NÃO ENCONTRADA' : 'MATERIAL SEM IMAGEM'; $('texturePreview').append(label); }
}
function windowInspector(e) {
  const w = e.window;
  const fields = { windowPreset: 'preset', windowTheme: 'theme', windowTitle: 'title', windowContent: 'content', windowText: 'text', windowIcon: 'icon', windowMount: 'mount', windowFacing: 'facing', windowBob: 'bob', windowImageFit: 'imageFit', windowProgress: 'progress', windowProgressSpeed: 'progressSpeed', windowStatus: 'status', windowResponse: 'response', windowHeal: 'heal', windowTitleColor: 'titleColor', windowBodyColor: 'bodyColor', windowTextColor: 'textColor' };
  for (const [id, key] of Object.entries(fields)) $(id).value = w[key];
  for (const [id, key] of Object.entries({ windowTitleBar: 'titleBar', windowClose: 'close', windowMinimize: 'minimize', windowMaximize: 'maximize', windowMenuBar: 'menuBar', windowStatusBar: 'statusBar', windowWatcher: 'watcher' })) $(id).checked = w[key];
  for (const [id, key] of Object.entries({ windowMenus: 'menus', windowTabs: 'tabs', windowRows: 'rows', windowFields: 'fields' })) $(id).value = w[key].join('\n');
  $('windowTabTexts').value = w.tabTexts.join('\n---\n'); $('windowButtonCount').value = w.buttons.length;
  $('windowButtonsEditor').replaceChildren();
  w.buttons.forEach((b, index) => {
    const group = document.createElement('div'); group.className = 'window-button-editor';
    const nameLabel = document.createElement('label'); nameLabel.textContent = 'Botão ' + (index + 1); const name = document.createElement('input'); name.value = b.label; name.dataset.windowButton = index; name.setAttribute('aria-label', 'Texto do botão ' + (index + 1)); name.onchange = () => mutateSelected(e => e.window.buttons[index].label = name.value.slice(0, 40)); nameLabel.append(name);
    const actionLabel = document.createElement('label'); actionLabel.textContent = 'Ação'; const action = document.createElement('select'); action.setAttribute('aria-label', 'Ação do botão ' + (index + 1));
    for (const [key, label] of Object.entries(WINDOW_ACTIONS)) { const option = document.createElement('option'); option.value = key; option.textContent = label; action.append(option); } action.value = b.action; action.onchange = () => mutateSelected(e => e.window.buttons[index].action = action.value); actionLabel.append(action);
    const closeLabel = document.createElement('label'), close = document.createElement('input'); close.type = 'checkbox'; close.checked = b.close; close.onchange = () => mutateSelected(e => e.window.buttons[index].close = close.checked); closeLabel.append(close, document.createTextNode(' Fechar depois da ação'));
    group.append(nameLabel, actionLabel, closeLabel); $('windowButtonsEditor').append(group);
  });
}
function mutateSelected(callback, rebuild = true) {
  const e = getSelected(); if (!e || session) return;
  pushHistory(); callback(e); if (rebuild) rebuildEntity(e.id); else syncRoot(e); inspector(); changed();
}
function syncRoot(e) { const root = roots.get(e.id); root.position.fromArray(e.position); root.rotation.y = e.rotation; root.scale.fromArray(e.size); root.visible = e.visible; scene.updateMatrixWorld(true); updateEntityUV(root, e); updateSelectionBox(); }
function duplicateSelected() {
  const e = getSelected(); if (!e || session) return;
  if (project.entities.length >= 1500) return toast('Limite de 1.500 objetos neste setor.');
  pushHistory(); const copy = clone(e); copy.id = uid(); copy.name += ' / cópia'; copy.position[0] = clamp(copy.position[0] + Math.max(1, Number($('snapSize').value)), -500, 500);
  project.entities.push(copy); rebuildEntity(copy.id); select(copy.id); changed();
}
function connectSelected() {
  const e = getSelected(); if (!e || session) return;
  const connection = snapConnection(e, project.entities, 5);
  if (!connection) return toast('Aproxime a peça de um piso, parede ou rampa alinhados para conectar.');
  if (connection.distance < .00001) return toast('A peça já está alinhada à conexão mais próxima.');
  cancelPlacement(); pushHistory(); e.position = connection.position; syncRoot(e); inspector(); changed();
  toast(`PEÇA CONECTADA — ${connection.kind}. Ctrl+Z desfaz.`);
}
function objectMaterials(e) { return [e.material, ...Object.values(e.character.appearance)]; }
function copyObject() {
  const e = getSelected(); if (!e || session) return false;
  const assets = {};
  for (const m of objectMaterials(e)) if (m.texture && project.assets[m.texture]) assets[m.texture] = clone(project.assets[m.texture]);
  copiedObject = { format: 'palace-object', version: 1, entity: clone(e), assets }; pasteCount = 0;
  // The local clipboard works without permissions; an available system clipboard also supports other tabs.
  navigator.clipboard?.writeText(JSON.stringify(copiedObject)).catch(() => {});
  toast(`OBJETO COPIADO — ${e.name}. Ctrl+V cola com texturas e configurações.`); return true;
}
async function pasteObject() {
  if (session || hasModal()) return;
  let payload = copiedObject;
  if (!payload && navigator.clipboard?.readText) {
    try { const input = JSON.parse(await navigator.clipboard.readText()); if (input.format === 'palace-object' && input.version === 1) payload = input; } catch { /* local toolbar remains usable */ }
  }
  if (!payload) return toast('Copie um objeto da cena primeiro com Ctrl+C.');
  if (session || hasModal()) return;
  if (project.entities.length >= 1500) return toast('Limite de 1.500 objetos neste setor.');
  let incoming;
  try { incoming = validateProject({ ...newProject(), assets: payload.assets, entities: [payload.entity] }); }
  catch (err) { return toast('Objeto incompatível: ' + err.message); }
  const copy = incoming.entities[0]; copy.id = uid(); copy.name = (copy.name + ' / cópia').slice(0, 100);
  const assets = { ...project.assets }, remap = new Map();
  for (const [id, asset] of Object.entries(incoming.assets)) {
    const newId = assets[id] && assets[id].data !== asset.data ? uid() : id;
    assets[newId] = asset; remap.set(id, newId);
  }
  for (const m of objectMaterials(copy)) if (remap.has(m.texture)) m.texture = remap.get(m.texture);
  if (Object.values(assets).reduce((sum, a) => sum + a.data.length, 0) > 40 * 1024 * 1024) return toast('As texturas excedem 40 MB.');
  cancelPlacement(); pushHistory();
  project.assets = assets; copiedObject = payload;
  const step = Math.max(1, Number($('snapSize').value)); copy.position[0] = clamp(copy.position[0] + step * ++pasteCount, -500, 500);
  project.entities.push(copy); rebuildEntity(copy.id); select(copy.id); changed(); $('emptyHint').classList.add('hidden');
  toast('OBJETO COLADO — cópia independente. Use o gizmo para posicionar.');
}
function deleteSelected() {
  if (!selected || session) return; pushHistory(); disposeObject(roots.get(selected)); roots.delete(selected); project.entities = project.entities.filter(e => e.id !== selected); select(null); changed(); $('emptyHint').classList.toggle('hidden', project.entities.length > 0);
}
function refreshHierarchy() {
  $('entityCount').textContent = project.entities.length; const list = $('hierarchy'); list.replaceChildren(); const query = $('sceneSearch').value.toLowerCase();
  for (const e of project.entities.filter(e => `${e.name} ${e.type}`.toLowerCase().includes(query))) {
    const b = document.createElement('button'); b.className = 'hierarchy-item' + (e.id === selected ? ' active' : ''); b.dataset.id = e.id;
    const icon = document.createElement('span'); icon.className = 'type-icon'; icon.textContent = CATALOG.find(c => c.type === e.type && (!c.model || c.model === e.character.model) && (!c.kind || c.kind === e.pickup.kind) && (!c.windowKind || c.windowKind === e.window?.preset))?.icon || '◇';
    const name = document.createElement('span'); name.className = 'entity-name'; name.textContent = e.name;
    const vis = document.createElement('span'); vis.className = 'visibility'; vis.textContent = e.visible ? '·' : '○';
    b.append(icon, name, vis); b.onclick = () => { cancelPlacement(); select(e.id); }; b.ondblclick = () => focusSelection(); list.append(b);
  }
}
function refreshAtlasLibrary() {
  const tiles = $('atlasTiles'); tiles.replaceChildren(); let count = 0;
  for (const tile of ATLAS_TILES) {
    const id = atlasAsset(project, tile.key); if (!id) continue; count++;
    const b = document.createElement('button'); b.className = 'atlas-tile'; b.dataset.tile = tile.key;
    const current = materialFor(); if (current?.texture === id) b.classList.add('active');
    const image = document.createElement('img'); image.src = project.assets[id].data; image.alt = tile.label;
    const name = document.createElement('span'); name.textContent = tile.label; b.append(image, name);
    b.onclick = () => {
      if (!getSelected()) return toast('Selecione um objeto da cena para aplicar esta textura.');
      if ($('materialSlot').value === 'wireframe') return toast('O wireframe usa cor, emissão e opacidade; selecione uma superfície para aplicar imagem.');
      mutateSelected(e => setAtlasMaterial(materialFor(e), project, tile.key, { force: true, repeat: ['eye', 'teeth', 'lips', 'static'].includes(tile.key) ? [1, 1] : materialFor(e).repeat }));
      toast(`${tile.label} aplicada na parte selecionada.`);
    };
    tiles.append(b);
  }
  $('atlasCount').textContent = `${count} / 16`; $('applyAtlasButton').disabled = !count || importingAtlas;
  $('atlasStatus').textContent = count ? 'Atlas incorporado no projeto. Novos objetos usam estas texturas.' : 'Importe a imagem com os 16 materiais.';
}
function applyAtlasToMap() {
  if (session || importingAtlas || !Object.keys(project.atlas || {}).length) return;
  cancelPlacement(); pushHistory(); let count = 0;
  for (const e of project.entities) if (applyAtlasToEntity(e, project, $('atlasForce').checked)) count++;
  rebuildAll(); changed(); toast(`ATLAS APLICADO — ${count} objetos atualizados. Ctrl+Z desfaz.`);
}
async function importAtlasFile(file) {
  if (!file || session || importingAtlas) return;
  importingAtlas = true; $('importAtlasButton').disabled = true; $('replaceAtlasButton').disabled = true; $('playButton').disabled = true;
  $('atlasStatus').textContent = 'Recortando os 16 materiais...';
  try {
    const pack = await sliceAtlas(file, Number($('atlasResolution').value));
    const assets = { ...project.assets, ...pack.assets };
    if (Object.values(assets).reduce((sum, a) => sum + a.data.length, 0) > 40 * 1024 * 1024) throw new Error('As imagens excedem o limite de 40 MB do projeto.');
    cancelPlacement(); pushHistory(); project.assets = assets; project.atlas = pack.atlas;
    let count = 0; for (const e of project.entities) if (applyAtlasToEntity(e, project, $('atlasForce').checked)) count++;
    rebuildAll(); changed(); showTab('textures');
    toast(`ATLAS IMPORTADO — 16 texturas, ${count} objetos atualizados. Imagem ${pack.width} × ${pack.height}.`, 6000);
  } catch (err) { toast('Não foi possível importar o atlas: ' + err.message, 7000); }
  finally {
    importingAtlas = false; $('importAtlasButton').disabled = false; $('replaceAtlasButton').disabled = false; $('playButton').disabled = false;
    $('atlasFile').value = ''; refreshAtlasLibrary();
  }
}
$('importAtlasButton').onclick = () => $('atlasFile').click(); $('replaceAtlasButton').onclick = () => $('atlasFile').click();
$('atlasFile').onchange = () => importAtlasFile($('atlasFile').files[0]); $('applyAtlasButton').onclick = applyAtlasToMap;
function makePalette() {
  for (const category of [...new Set(CATALOG.map(c => c.category))]) {
    const section = document.createElement('div'); section.className = 'palette-category'; const h = document.createElement('h3'); h.textContent = category;
    const group = document.createElement('div'); group.className = 'palette-grid';
    for (const item of CATALOG.filter(c => c.category === category)) {
      const b = document.createElement('button'); b.className = 'palette-item'; b.dataset.type = item.type; if (item.model) b.dataset.model = item.model; if (item.kind) b.dataset.kind = item.kind; if (item.windowKind) b.dataset.windowKind = item.windowKind;
      const i = document.createElement('span'); i.className = 'icon'; i.textContent = item.icon; const t = document.createElement('span'); t.textContent = item.label;
      b.append(i, t); b.onclick = () => beginPlacement(item); group.append(b);
    }
    section.append(h, group); $('palette').append(section);
  }
}
function beginPlacement(item) {
  if (session) return; cancelPlacement(); placement = item; transform.detach();
  const e = createEntity(item.type, item.model, project); if (item.kind) configureItem(e, item.kind); if (item.windowKind) { configureWindow(e, item.windowKind); applyAtlasToEntity(e, project); }
  ghostDefinition = e; ghost = buildEntity(e, project); scene.add(ghost);
  ghost.traverse(o => { if (o.isLight) o.intensity = 0; if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = .35; o.material.depthWrite = false; } });
  ghost.visible = false; $('selectTool').classList.remove('active');
  document.querySelectorAll('.palette-item').forEach(b => b.classList.toggle('active', b.dataset.type === item.type && b.dataset.model === item.model && b.dataset.kind === item.kind && b.dataset.windowKind === item.windowKind));
  $('placementHint').textContent = `${item.label} · Clique para inserir · ESC / Q cancela`; $('placementHint').classList.remove('hidden');
}
function cancelPlacement() {
  if (ghost) disposeObject(ghost); ghost = null; ghostDefinition = null; ghostPoint = null; placement = null; $('placementHint').classList.add('hidden'); $('selectTool').classList.add('active');
  document.querySelectorAll('.palette-item').forEach(b => b.classList.remove('active')); if (selected && !session) transform.attach(roots.get(selected));
}
function setRay(event) {
  const rect = renderer.domElement.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1); ray.setFromCamera(pointer, camera);
}
function placementPoint(event) {
  setRay(event);
  if (ghostDefinition?.type === 'window' && ghostDefinition.window.mount === 'wall') {
    const hits = ray.intersectObjects(project.entities.filter(e => e.type === 'wall' && e.visible).map(e => roots.get(e.id)), true);
    const hit = hits.find(h => Math.abs(h.face.normal.clone().transformDirection(h.object.matrixWorld).y) < .5);
    if (hit) { const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld); const point = hit.point.clone().addScaledVector(normal, ghostDefinition.size[2] / 2 + .025); point.windowRotation = Math.atan2(-normal.x, -normal.z); point.windowMounted = true; return point; }
  }
  const height = Number($('placeHeight').value) || 0; const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -height); const p = new THREE.Vector3();
  if (!ray.ray.intersectPlane(plane, p)) return null;
  if ($('snapEnabled').checked) { const s = Number($('snapSize').value); p.x = Math.round(p.x / s) * s; p.z = Math.round(p.z / s) * s; }
  p.x = clamp(p.x, -500, 500); p.z = clamp(p.z, -500, 500);
  if ($('snapEdges').checked && ghostDefinition) {
    const candidate = { ...ghostDefinition, position: p.toArray() };
    const connection = snapConnection(candidate, project.entities, Math.max(.6, Number($('snapSize').value)));
    if (connection) p.fromArray(connection.position);
  }
  return p;
}
function addPlaced(event) {
  const point = placementPoint(event); if (!point) return;
  if (project.entities.length >= 1500) return toast('Limite de 1.500 objetos neste setor.');
  pushHistory(); const e = createEntity(placement.type, placement.model, project); e.position = point.toArray();
  if (placement.kind) configureItem(e, placement.kind);
  if (placement.windowKind) { configureWindow(e, placement.windowKind); applyAtlasToEntity(e, project); }
  if (e.type === 'window') { if (point.windowMounted) e.rotation = point.windowRotation; else e.position[1] += 2; }
  if (e.type === 'light') e.position[1] += 4;
  project.entities.push(e); rebuildEntity(e.id); select(e.id); transform.detach(); changed(); $('emptyHint').classList.add('hidden');
}
function setTransformMode(mode) {
  cancelPlacement(); transform.setMode(mode); transform.showX = mode !== 'rotate'; transform.showZ = mode !== 'rotate';
  document.querySelectorAll('[data-transform]').forEach(b => b.classList.toggle('active', b.dataset.transform === mode));
}
function applySnap() { const enabled = $('snapEnabled').checked, s = Number($('snapSize').value); transform.setTranslationSnap(enabled ? s : null); transform.setRotationSnap(enabled ? Math.PI / 12 : null); transform.setScaleSnap(enabled ? .25 : null); }
transform.addEventListener('dragging-changed', event => { transforming = event.value; orbit.enabled = !event.value && !session; });
transform.addEventListener('mouseDown', () => { if (selected) pushHistory(); });
transform.addEventListener('objectChange', () => {
  const e = getSelected(), root = roots.get(selected); if (!e || !root) return;
  e.position = root.position.toArray().map(v => clamp(v, -500, 500)); e.rotation = root.rotation.y; e.size = root.scale.toArray().map(v => clamp(v, .1, 200));
  root.rotation.x = 0; root.rotation.z = 0; root.scale.fromArray(e.size); scene.updateMatrixWorld(true); updateEntityUV(root, e); inspector(); updateSelectionBox();
});
transform.addEventListener('mouseUp', () => {
  const e = getSelected(); if (!e) return;
  if ($('snapEdges').checked) { const connection = snapConnection(e, project.entities, Math.max(.6, Number($('snapSize').value))); if (connection) { e.position = connection.position; syncRoot(e); inspector(); } }
  changed();
});
transform.showX = true; transform.showY = true; transform.showZ = true;
renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());
renderer.domElement.addEventListener('pointerdown', e => {
  renderer.domElement.focus({ preventScroll: true });
  if (session) {
    if (e.button === 0 && session.clickWindow(e)) return;
    if (!session.paused && !document.pointerLockElement) { dragCamera = { x: e.clientX, y: e.clientY }; renderer.domElement.setPointerCapture(e.pointerId); }
    return;
  }
  if (e.button === 0) pointerDown = { x: e.clientX, y: e.clientY, gizmo: !!transform.axis };
});
renderer.domElement.addEventListener('pointermove', e => {
  if (session) {
    if (dragCamera && !document.pointerLockElement) { session.mouse(e.clientX - dragCamera.x, e.clientY - dragCamera.y); dragCamera = { x: e.clientX, y: e.clientY }; }
    return;
  }
  if (placement && ghost) { ghostPoint = placementPoint(e); ghost.visible = !!ghostPoint; if (ghostPoint) { ghost.position.copy(ghostPoint); if (placement.type === 'light') ghost.position.y += 4; if (placement.type === 'window') { if (ghostPoint.windowMounted) ghost.rotation.y = ghostPoint.windowRotation; else { ghost.position.y += 2; ghost.rotation.y = Math.atan2(-(camera.position.x - ghost.position.x), -(camera.position.z - ghost.position.z)); } } if (ghostDefinition) { ghostDefinition.position = ghost.position.toArray(); updateEntityUV(ghost, ghostDefinition); } } }
});
renderer.domElement.addEventListener('pointerleave', () => { if (ghost) ghost.visible = false; });
renderer.domElement.addEventListener('pointerup', e => {
  dragCamera = null; if (session || e.button !== 0 || !pointerDown) return;
  const down = pointerDown; pointerDown = null;
  if (transforming || down.gizmo || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
  if (placement) return addPlaced(e);
  setRay(e); const hits = ray.intersectObjects([...roots.values()].filter(r => r.visible), true);
  const hit = hits.find(h => h.object.userData.entityId); select(hit?.object.userData.entityId || null);
  if (hit?.object.userData.materialSlot && [...$('materialSlot').options].some(o => o.value === hit.object.userData.materialSlot)) { $('materialSlot').value = hit.object.userData.materialSlot; materialInspector(); refreshAtlasLibrary(); }
});
addEventListener('mousemove', e => { if (session && document.pointerLockElement === renderer.domElement) session.mouse(e.movementX, e.movementY); });
function focusSelection() {
  const root = roots.get(selected); if (!root) { orbit.target.set(0, 0, -4); camera.position.set(26, 25, 30); orbit.update(); return; }
  const bounds = new THREE.Box3().setFromObject(root), center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3()).length();
  const direction = camera.position.clone().sub(orbit.target).normalize(); orbit.target.copy(center); camera.position.copy(center).addScaledVector(direction, Math.max(5, size * 1.5)); orbit.update();
}
function changeView(top) {
  camera.position.copy(orbit.target).add(top ? new THREE.Vector3(.001, 42, .001) : new THREE.Vector3(26, 25, 30));
  camera.up.set(0, 1, 0); orbit.update(); $('viewTop').classList.toggle('active', top); $('viewPerspective').classList.toggle('active', !top); $('viewportMode').textContent = top ? 'VISTA SUPERIOR / EDIÇÃO' : 'PERSPECTIVA / EDIÇÃO';
}

// Inspector changes are transactions: one undo entry per accepted change, including the gizmo.
$('objectName').onchange = () => mutateSelected(e => e.name = $('objectName').value.trim().slice(0, 100) || e.type, false);
$('objectVisible').onchange = () => mutateSelected(e => e.visible = $('objectVisible').checked, false);
$('objectCollision').onchange = () => mutateSelected(e => e.collision = $('objectCollision').checked, false);
document.querySelectorAll('#positionFields input').forEach(i => i.onchange = () => mutateSelected(e => e.position[Number(i.dataset.axis)] = clamp(Number(i.value) || 0, -500, 500), false));
document.querySelectorAll('#sizeFields input').forEach(i => i.onchange = () => mutateSelected(e => e.size[Number(i.dataset.axis)] = clamp(Number(i.value) || 1, .1, 200), false));
$('objectRotation').onchange = () => mutateSelected(e => e.rotation = THREE.MathUtils.degToRad(Number($('objectRotation').value) || 0), false);
$('materialSlot').onchange = () => { materialInspector(); refreshAtlasLibrary(); };
for (const [id, key] of [['materialColor', 'color'], ['materialEmission', 'emissive'], ['materialPreset', 'preset'], ['roughness', 'roughness'], ['metalness', 'metalness'], ['opacity', 'opacity']]) $(id).onchange = () => mutateSelected(e => {
  const m = materialFor(e); m[key] = ['roughness', 'metalness', 'opacity'].includes(key) ? Number($(id).value) : $(id).value;
  if (key === 'preset' && m.preset === 'custom' && !m.texture) toast('Importe uma imagem para usar este material.');
});
for (const [id, axis] of [['repeatU', 0], ['repeatV', 1]]) $(id).onchange = () => mutateSelected(e => materialFor(e).repeat[axis] = clamp(Number($(id).value) || 1, .1, 100));
$('uvRotation').onchange = () => mutateSelected(e => materialFor(e).uvRotation = clamp(Number($('uvRotation').value) || 0, -360, 360));
$('materialMapping').onchange = () => mutateSelected(e => materialFor(e).mapping = $('materialMapping').value);
for (const [id, axis] of [['tileSizeU', 0], ['tileSizeV', 1]]) $(id).onchange = () => mutateSelected(e => materialFor(e).tileSize[axis] = clamp(Number($(id).value) || 3, .1, 200));
for (const [id, axis] of [['offsetU', 0], ['offsetV', 1]]) $(id).onchange = () => mutateSelected(e => materialFor(e).offset[axis] = clamp(Number($(id).value) || 0, -100, 100));
$('textureClear').onclick = () => mutateSelected(e => { const m = materialFor(e); m.texture = null; m.preset = 'none'; });
$('copyMaterial').onclick = () => { if (materialFor()) { copiedMaterial = clone(materialFor()); toast('Material copiado. Selecione outro objeto ou outra parte e cole.'); } };
$('pasteMaterial').onclick = () => { if (!copiedMaterial) return toast('Copie um material primeiro.'); mutateSelected(e => { Object.assign(materialFor(e), clone(copiedMaterial)); if ($('materialSlot').value === 'wireframe') { materialFor(e).texture = null; materialFor(e).preset = 'none'; } }); };
$('characterModel').onchange = () => mutateSelected(e => { e.character.model = $('characterModel').value; e.character.appearance = appearance(e.character.model); applyAtlasToEntity(e, project); });
$('characterRole').onchange = () => mutateSelected(e => e.character.role = $('characterRole').value);
$('characterDialogue').onchange = () => mutateSelected(e => e.character.dialogue = $('characterDialogue').value.slice(0, 4000), false);
for (const [id, key, min, max] of [['characterSpeed', 'speed', .1, 15], ['characterRange', 'range', 1, 60], ['headScale', 'headScale', .3, 3], ['earScale', 'earScale', .2, 3]]) $(id).onchange = () => mutateSelected(e => e.character[key] = clamp(Number($(id).value) || 1, min, max));
for (const [id, key, min, max] of [['characterHealth', 'maxHealth', 1, 10000], ['characterDamage', 'damage', 0, 1000], ['characterWanderRadius', 'wanderRadius', .5, 30]]) $(id).onchange = () => mutateSelected(e => {
  const n = Number($(id).value); e.character[key] = clamp(Number.isFinite(n) ? n : min, min, max);
  if (key !== 'wanderRadius') e.character[key] = Math.round(e.character[key]);
}, false);
$('characterInvulnerable').onchange = () => mutateSelected(e => e.character.invulnerable = $('characterInvulnerable').checked, false);
$('characterMovement').onchange = () => mutateSelected(e => e.character.movement = $('characterMovement').value, false);
$('characterIdleAnimation').onchange = () => mutateSelected(e => e.character.idleAnimation = $('characterIdleAnimation').checked, false);
$('characterJumpSpeed').onchange = () => mutateSelected(e => e.character.jumpSpeed = clamp(Number($('characterJumpSpeed').value) || 0, 0, 16), false);
for (const p of WINDOW_PRESETS) { const option = document.createElement('option'); option.value = p.key; option.textContent = p.label; $('windowPreset').append(option); }
{ const option = document.createElement('option'); option.value = 'portrait'; option.textContent = 'Retrato + mensagem'; $('windowContent').append(option); }
$('windowPreset').onchange = () => mutateSelected(e => { configureWindow(e, $('windowPreset').value, true); applyAtlasToEntity(e, project); });
for (const [id, key] of Object.entries({ windowTitle: 'title', windowContent: 'content', windowText: 'text', windowIcon: 'icon', windowFacing: 'facing', windowImageFit: 'imageFit', windowStatus: 'status', windowResponse: 'response', windowTitleColor: 'titleColor', windowBodyColor: 'bodyColor', windowTextColor: 'textColor' })) $(id).onchange = () => mutateSelected(e => e.window[key] = $(id).value.slice(0, key === 'text' || key === 'response' ? 4000 : 160));
for (const [id, key] of Object.entries({ windowTitleBar: 'titleBar', windowClose: 'close', windowMinimize: 'minimize', windowMaximize: 'maximize', windowMenuBar: 'menuBar', windowStatusBar: 'statusBar', windowWatcher: 'watcher' })) $(id).onchange = () => mutateSelected(e => e.window[key] = $(id).checked);
for (const [id, key, max] of [['windowBob', 'bob', .5], ['windowProgress', 'progress', 100], ['windowProgressSpeed', 'progressSpeed', 25], ['windowHeal', 'heal', 10000]]) $(id).onchange = () => mutateSelected(e => e.window[key] = clamp(Number($(id).value) || 0, 0, max));
for (const [id, key, limit] of [['windowMenus', 'menus', 6], ['windowTabs', 'tabs', 6], ['windowRows', 'rows', 30], ['windowFields', 'fields', 8]]) $(id).onchange = () => mutateSelected(e => e.window[key] = $(id).value.split('\n').filter(s => s.trim()).slice(0, limit).map(s => s.slice(0, 200)));
$('windowTabTexts').onchange = () => mutateSelected(e => e.window.tabTexts = $('windowTabTexts').value.split(/\n---\n/).slice(0, 6));
$('windowTheme').onchange = () => mutateSelected(e => { e.window.theme = $('windowTheme').value; e.window.titleColor = e.window.theme === 'xp' ? '#1757cf' : '#000080'; if (!['terminal', 'bsod'].includes(e.window.content)) e.window.bodyColor = e.window.theme === 'xp' ? '#ece9d8' : '#c0c0c0'; });
$('windowMount').onchange = () => mutateSelected(e => { e.window.mount = $('windowMount').value; if (e.window.mount === 'wall') { e.window.facing = 'fixed'; e.window.bob = 0; } });
$('windowButtonCount').onchange = () => mutateSelected(e => { const count = Number($('windowButtonCount').value); e.window.buttons = Array.from({ length: count }, (_, i) => e.window.buttons[i] || { label: ['OK', 'Cancelar', 'Ignorar'][i], action: ['close', 'silence', 'ignore'][i], close: i !== 2 }); });
$('previewWindowButton').onclick = () => {
  const e = getSelected(); if (e?.type !== 'window') return;
  previewEntity = clone(e); previewRoot = buildEntity(previewEntity, project); windowPreview.open(previewRoot, previewEntity); windowPreview.element.querySelector('.window-dismiss').textContent = 'Fechar prévia / ESC';
};
$('createWindowButton').onclick = () => {
  const grid = document.createElement('div'); grid.className = 'window-menu-preview';
  for (const p of WINDOW_PRESETS) { const b = document.createElement('button'), c = document.createElement('canvas'); drawWindow(c, windowPreset(p.key)); const image = document.createElement('img'); image.src = c.toDataURL(); image.alt = p.label; b.append(image, document.createTextNode(p.label)); b.onclick = () => { closeModal('infoModal'); beginPlacement(CATALOG.find(c => c.type === 'window' && c.windowKind === p.key)); }; grid.append(b); }
  info('Escolha uma janela Windows', grid);
};
$('pickupEnabled').onchange = () => mutateSelected(e => e.pickup.enabled = e.type === 'disk' || $('pickupEnabled').checked, false);
for (const [id, key] of [['pickupName', 'name'], ['pickupId', 'itemId'], ['pickupDescription', 'description']]) $(id).onchange = () => mutateSelected(e => e.pickup[key] = $(id).value.slice(0, key === 'description' ? 4000 : 100), false);
$('pickupKind').onchange = () => mutateSelected(e => e.pickup.kind = e.type === 'disk' ? 'disk' : $('pickupKind').value);
$('pickupQuantity').onchange = () => mutateSelected(e => e.pickup.quantity = e.type === 'disk' ? 1 : Math.round(clamp(Number($('pickupQuantity').value) || 1, 1, 9999)), false);
$('pickupHeal').onchange = () => mutateSelected(e => e.pickup.heal = Math.round(clamp(Number($('pickupHeal').value) || 0, 0, 10000)), false);
$('lightColor').onchange = () => mutateSelected(e => e.light.color = $('lightColor').value);
$('lightIntensity').onchange = () => mutateSelected(e => e.light.intensity = clamp(Number($('lightIntensity').value) || 0, 0, 150));
$('lightRange').onchange = () => mutateSelected(e => e.light.range = clamp(Number($('lightRange').value) || 1, 1, 100));
$('interactionText').onchange = () => mutateSelected(e => e.message = $('interactionText').value.slice(0, 4000), false);
for (const [id, key] of [['worldFog', 'fog'], ['worldBackground', 'background'], ['fogDensity', 'fogDensity'], ['ambientIntensity', 'ambient'], ['worldPixelated', 'pixelated']]) $(id).onchange = () => {
  if (session) return; pushHistory(); project.environment[key] = key === 'pixelated' ? $(id).checked : ['ambient', 'fogDensity'].includes(key) ? Number($(id).value) : $(id).value; applyEnvironment(); changed();
};
$('projectName').onchange = () => { pushHistory(); project.name = $('projectName').value.trim().slice(0, 100) || 'Meu setor'; changed(); };
$('sceneSearch').oninput = refreshHierarchy;
function showTab(tab) { document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab)); for (const name of ['library', 'hierarchy', 'textures']) $(name + 'Tab').classList.toggle('hidden', name !== tab); }
document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => showTab(b.dataset.tab));
document.querySelectorAll('[data-transform]').forEach(b => b.onclick = () => setTransformMode(b.dataset.transform));
$('selectTool').onclick = cancelPlacement; $('undoButton').onclick = undoAction; $('redoButton').onclick = redoAction;
$('duplicateButton').onclick = duplicateSelected; $('deleteButton').onclick = deleteSelected; $('focusButton').onclick = focusSelection;
$('copyObjectButton').onclick = copyObject; $('pasteObjectButton').onclick = pasteObject;
$('connectButton').onclick = connectSelected;
$('snapEnabled').onchange = applySnap; $('snapSize').onchange = applySnap;
$('viewPerspective').onclick = () => changeView(false); $('viewTop').onclick = () => changeView(true);
$('gridButton').onclick = () => { grid.visible = !grid.visible; $('gridButton').classList.toggle('active', grid.visible); };

for (const [id, entries] of [['genStyle', GENERATOR_STYLES], ['genLayout', GENERATOR_LAYOUTS]]) for (const entry of entries) { const option = document.createElement('option'); option.value = entry.key; option.textContent = entry.label; $(id).append(option); }
function generatorConfig() {
  return normalizeGenerator({ style: $('genStyle').value, layout: $('genLayout').value, width: $('genWidth').value, depth: $('genDepth').value, levels: $('genLevels').value, cellSize: $('genCellSize').value, seed: $('genSeed').value, loops: $('genLoops').value, density: $('genDensity').value, disks: $('genDisks').value, difficulty: $('genDifficulty').value, npcs: $('genNpcs').checked, windows: $('genWindows').checked, water: $('genWater').checked, roof: $('genRoof').checked, secrets: $('genSecrets').checked });
}
function fillGenerator(config) {
  const c = normalizeGenerator(config);
  for (const [id, key] of Object.entries({ genStyle: 'style', genLayout: 'layout', genWidth: 'width', genDepth: 'depth', genLevels: 'levels', genCellSize: 'cellSize', genSeed: 'seed', genLoops: 'loops', genDensity: 'density', genDisks: 'disks', genDifficulty: 'difficulty' })) $(id).value = c[key];
  for (const [id, key] of Object.entries({ genNpcs: 'npcs', genWindows: 'windows', genWater: 'water', genRoof: 'roof', genSecrets: 'secrets' })) $(id).checked = c[key];
  $('genSize').value = Object.entries(GENERATOR_SIZES).find(([, pair]) => pair[0] === c.width && pair[1] === c.depth)?.[0] || 'custom'; generatorDescriptions();
}
function generatorDescriptions() {
  $('genStyleDescription').textContent = GENERATOR_STYLES.find(s => s.key === $('genStyle').value)?.description;
  $('genLayoutDescription').textContent = GENERATOR_LAYOUTS.find(s => s.key === $('genLayout').value)?.description;
  $('genLoopsValue').textContent = $('genLoops').value + '%'; $('genDensityValue').textContent = $('genDensity').value + '%';
  const ghost = $('genStyle').value === 'ghost'; $('genRoof').disabled = ghost; $('genWater').disabled = ghost;
}
function generatorPreview() {
  $('genError').textContent = ''; $('genPreview').disabled = true;
  try {
    generatedPreview = generatePalace(generatorConfig(), $('genAtlas').checked ? project : {});
    const meta = generatedPreview.generation, s = meta.stats; $('genPreviewLevel').replaceChildren();
    for (let i = 0; i < meta.levels; i++) { const o = document.createElement('option'); o.value = i; o.textContent = 'Andar ' + (i + 1); $('genPreviewLevel').append(o); }
    drawGeneratorMap($('generatorMap'), meta, 0, $('genShowRoute').checked);
    $('genStats').textContent = `${s.widthMeters} × ${s.depthMeters} m / ${meta.levels} andar(es)\n${s.reachable} / ${s.cells} células conectadas\n${s.objects} objetos / ${s.loops} loops / ${s.deadEnds} becos\nRota até a saída: ${s.pathLength} células\n${meta.disks.length} disquetes / ${meta.checkpoints.length} checkpoints\n${s.windows} janelas / ${s.enemies} ameaças`;
    return generatedPreview;
  } catch (err) { generatedPreview = null; $('genError').textContent = err.message; $('genStats').textContent = 'Ajuste as opções e gere a prévia novamente.'; return null; }
  finally { $('genPreview').disabled = false; }
}
$('generateMapButton').onclick = () => { if (session) return; fillGenerator(project.generation?.config || { style: 'buffer', layout: 'dfs', width: 11, depth: 11 }); $('generatorModal').classList.remove('hidden'); generatorPreview(); };
$('genStyle').onchange = () => { const style = $('genStyle').value; $('genLayout').value = { yellow: 'hotel', archive: 'rooms', shrine: 'rings', palace: 'hotel', ghost: 'braided', buffer: 'dfs' }[style]; $('genRoof').checked = style !== 'ghost' && style !== 'shrine'; $('genWater').checked = !['ghost', 'yellow'].includes(style); if (style === 'palace') $('genLevels').value = '2'; generatorDescriptions(); };
$('genLayout').onchange = generatorDescriptions;
$('genSize').onchange = () => { const size = GENERATOR_SIZES[$('genSize').value]; if (size) { $('genWidth').value = size[0]; $('genDepth').value = size[1]; } };
for (const id of ['genWidth', 'genDepth']) $(id).onchange = () => $('genSize').value = 'custom';
for (const id of ['genLoops', 'genDensity']) $(id).oninput = generatorDescriptions;
$('genRandomSeed').onclick = () => $('genSeed').value = 'PALACE-' + crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase();
$('genPreview').onclick = generatorPreview;
for (const id of ['genPreviewLevel', 'genShowRoute']) $(id).onchange = () => { if (generatedPreview) drawGeneratorMap($('generatorMap'), generatedPreview.generation, Number($('genPreviewLevel').value), $('genShowRoute').checked); };
$('genApply').onclick = () => {
  const generated = generatorPreview(); if (!generated) return;
  cancelPlacement(); pushHistory(); project = generated; selected = null; rebuildAll(); changed(); closeModal('generatorModal');
  const spawn = project.entities.find(e => e.type === 'spawn'); orbit.target.fromArray(spawn.position); camera.position.copy(orbit.target).add(new THREE.Vector3(18, 22, 24)); orbit.update();
  toast('MAPA GERADO — entrada, saída e objetivos conectados. Testar mapa inicia o jogo. Ctrl+Z desfaz.', 6500);
};

function info(title, content, actions = [{ label: 'Fechar' }], closeCallback = null) {
  $('infoTitle').textContent = title; $('infoContent').replaceChildren();
  if (content instanceof Node) $('infoContent').append(content); else $('infoContent').textContent = content;
  $('infoActions').replaceChildren(); modalCloseCallback = closeCallback;
  for (const action of actions) { const b = document.createElement('button'); b.textContent = action.label; if (action.primary) b.classList.add('primary'); b.onclick = () => { closeModal('infoModal'); action.run?.(); }; $('infoActions').append(b); }
  $('infoModal').classList.remove('hidden'); $('infoActions').firstElementChild?.focus();
}
function closeModal(id) { $(id).classList.add('hidden'); if (id === 'infoModal') { const cb = modalCloseCallback; modalCloseCallback = null; cb?.(); } }
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => closeModal(b.dataset.close));
function help() {
  const div = document.createElement('div');
  div.innerHTML = '<strong>Construir:</strong> escolha um objeto na biblioteca e clique no mapa. Altura controla o andar; Snap alinha à grade.<br><br><strong>Editar:</strong> clique para selecionar. <kbd>W</kbd> mover, <kbd>E</kbd> girar, <kbd>R</kbd> escalar, <kbd>F</kbd> enquadrar, <kbd>Q</kbd> selecionar. Use os eixos do gizmo ou valores no inspector.<br><br><strong>Navegar:</strong> botão direito orbita, botão do meio desloca, roda do mouse aproxima.<br><br><strong>Atalhos:</strong> <kbd>Ctrl+Z</kbd> desfaz, <kbd>Ctrl+Shift+Z</kbd> refaz, <kbd>Ctrl+D</kbd> duplica, <kbd>Delete</kbd> exclui, <kbd>Ctrl+S</kbd> salva.<br><br><strong>Texturas e personagens:</strong> selecione a parte em Material. Importe e recorte uma imagem ou escolha uma superfície. Personagens têm modelo, proporções, diálogo, velocidade e papel editáveis.<br><br><strong>Testar:</strong> coloque piso e entrada. Disquetes definem o objetivo; terminal encerra o setor; cápsulas são checkpoints. Colisão desmarcada cria paredes atravessáveis. <kbd>ESC</kbd> volta ao editor.<br><br><strong>Guardar:</strong> o projeto salva automaticamente neste navegador. Exporte JSON para ter uma cópia com as texturas incorporadas.';
  info('Bem-vindo à Palace Engine', div);
  const extra = document.createElement('p'); extra.textContent = 'Ctrl+C copia objetos, Ctrl+V cola e Ctrl+X recorta. Os campos de texto continuam usando copiar/colar normalmente. Personagens têm vida, dano, invulnerabilidade e movimento editáveis. No teste, P aplica 1 HP de dano ao personagem próximo para verificar a vida e o encerramento do processo.'; $('infoContent').append(extra);
  const controlsHelp = document.createElement('p'); controlsHelp.textContent = 'Controles do jogo: Espaço pula; Ctrl agacha; C alterna agachamento; I abre o inventário. A Biblioteca tem chaves, cápsulas de cura, registros e objetos coletáveis. Configure nome, quantidade e descrição no inspector Item / Inventário.'; $('infoContent').append(controlsHelp);
}
$('helpButton').onclick = help;
function replaceProject(data) { cancelPlacement(); project = data; selected = null; undo.length = 0; redo.length = 0; revision++; rebuildAll(); camera.position.set(26, 25, 30); orbit.target.set(0, 0, -4); orbit.update(); changed(); }
function confirmReplace(title, data) { info(title, 'Isso substitui o projeto aberto no editor. Exporte o JSON se quiser manter uma cópia do setor atual.', [{ label: 'Cancelar' }, { label: 'Substituir projeto', primary: true, run: () => replaceProject(data) }]); }
function withCurrentAtlas(p) {
  p.atlas = { ...project.atlas };
  for (const id of Object.values(p.atlas)) if (project.assets[id]) p.assets[id] = project.assets[id];
  p.entities.forEach(e => applyAtlasToEntity(e, p)); return p;
}
$('newProject').onclick = () => confirmReplace('Criar um mapa vazio?', withCurrentAtlas(newProject()));
$('loadExample').onclick = () => confirmReplace('Carregar o setor de exemplo?', withCurrentAtlas(demoProject()));
$('saveProject').onclick = () => save();
function exportJSON() {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = (project.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_-]+/gi, '-').slice(0, 70) || 'palace-project') + '.palace.json';
  a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('JSON exportado com todas as texturas incorporadas.');
}
$('exportProject').onclick = exportJSON; $('importProject').onclick = () => $('projectFile').click();
$('projectFile').onchange = async () => {
  const f = $('projectFile').files[0]; if (!f) return;
  try { if (f.size > 50 * 1024 * 1024) throw new Error('O arquivo excede 50 MB.'); const data = validateProject(JSON.parse(await f.text())); confirmReplace(`Abrir “${data.name}”?`, data); }
  catch (err) { toast('Não foi possível abrir: ' + err.message, 7000); }
  $('projectFile').value = '';
};

// Image cropper never samples editor grid overlays into the texture.
function cropDraw(ctx, size, guides = false) {
  ctx.clearRect(0, 0, size, size); ctx.fillStyle = '#101810'; ctx.fillRect(0, 0, size, size);
  if (cropImage) {
    ctx.save(); ctx.translate(size * (.5 + cropOffset.x), size * (.5 + cropOffset.y)); ctx.rotate(THREE.MathUtils.degToRad(Number($('cropRotation').value)));
    const zoom = cropBase * Number($('cropZoom').value) * size / 512; ctx.scale($('cropFlip').checked ? -zoom : zoom, zoom);
    ctx.drawImage(cropImage, -cropImage.width / 2, -cropImage.height / 2); ctx.restore();
  } else { ctx.fillStyle = '#799478'; ctx.font = `${size / 32}px monospace`; ctx.textAlign = 'center'; ctx.fillText('IMPORTE UMA IMAGEM', size / 2, size / 2); }
  if (guides) { ctx.strokeStyle = '#d5e2b326'; ctx.lineWidth = 1; for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(size * i / 3, 0); ctx.lineTo(size * i / 3, size); ctx.moveTo(0, size * i / 3); ctx.lineTo(size, size * i / 3); ctx.stroke(); } }
}
function drawCrop() { cropDraw($('cropCanvas').getContext('2d'), 512, true); }
function centerCrop() { cropOffset = { x: 0, y: 0 }; $('cropZoom').value = 1; $('cropRotation').value = 0; $('cropFlip').checked = false; if (cropImage) cropBase = Math.max(512 / cropImage.width, 512 / cropImage.height); drawCrop(); }
function loadCrop(src, name, revoke = false) {
  const img = new Image(); img.onload = () => { cropImage = img; cropName = name; centerCrop(); if (revoke) URL.revokeObjectURL(src); };
  img.onerror = () => { if (revoke) URL.revokeObjectURL(src); toast('Imagem inválida. Use PNG, JPEG ou WebP.'); }; img.src = src;
}
$('textureEdit').onclick = () => {
  if (!getSelected()) return;
  textureTarget = { id: selected, slot: $('materialSlot').value }; cropImage = null; cropName = 'Textura'; $('textureFile').value = ''; centerCrop();
  $('assetChoice').replaceChildren(); const empty = document.createElement('option'); empty.value = ''; empty.textContent = 'Escolher...'; $('assetChoice').append(empty);
  for (const [id, asset] of Object.entries(project.assets)) { const o = document.createElement('option'); o.value = id; o.textContent = asset.name; $('assetChoice').append(o); }
  const m = materialFor(); if (m.texture && project.assets[m.texture]) loadCrop(project.assets[m.texture].data, project.assets[m.texture].name);
  $('textureModal').classList.remove('hidden');
};
$('textureFile').onchange = () => { const f = $('textureFile').files[0]; if (!f) return; if (f.size > 20 * 1024 * 1024) return toast('Use uma imagem de até 20 MB.'); loadCrop(URL.createObjectURL(f), f.name, true); };
$('assetChoice').onchange = () => { const a = project.assets[$('assetChoice').value]; if (a) loadCrop(a.data, a.name); };
['cropZoom', 'cropRotation', 'cropFlip'].forEach(id => $(id).oninput = drawCrop); $('resetCrop').onclick = centerCrop;
$('cropCanvas').onpointerdown = e => { cropDragging = { x: e.clientX, y: e.clientY }; $('cropCanvas').setPointerCapture(e.pointerId); };
$('cropCanvas').onpointermove = e => { if (!cropDragging) return; const r = $('cropCanvas').getBoundingClientRect(); cropOffset.x += (e.clientX - cropDragging.x) / r.width; cropOffset.y += (e.clientY - cropDragging.y) / r.height; cropDragging = { x: e.clientX, y: e.clientY }; drawCrop(); };
$('cropCanvas').onpointerup = () => cropDragging = null;
$('applyCrop').onclick = () => {
  if (!cropImage) return toast('Importe uma imagem primeiro.');
  const e = project.entities.find(e => e.id === textureTarget?.id); if (!e) return;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = Number($('cropResolution').value); cropDraw(canvas.getContext('2d'), canvas.width);
  const data = canvas.toDataURL('image/png'); const total = Object.values(project.assets).reduce((sum, a) => sum + a.data.length, 0) + data.length;
  if (total > 40 * 1024 * 1024) return toast('Limite de 40 MB de texturas. Use uma resolução menor.');
  pushHistory(); const id = uid(); project.assets = { ...project.assets, [id]: { name: cropName, data } }; const m = materialFor(e, textureTarget.slot);
  m.texture = id; m.preset = 'custom'; m.color = '#ffffff'; if (e.type === 'window' && e.window.content !== 'portrait') e.window.content = 'image'; rebuildEntity(e.id); inspector(); changed(); closeModal('textureModal'); toast('TEXTURA APLICADA — incorporada no projeto e no modo jogável.');
};

function startPlay() {
  if (session || loadingProject || importingAtlas) return; cancelPlacement();
  const previousCamera = { position: camera.position.clone(), target: orbit.target.clone() };
  for (const e of project.entities) roots.get(e.id).visible = e.visible;
  try {
    const play = new PlaySession({ scene, camera, renderer, project, roots, toast, showDialogue: (title, text, close) => info(title, text, [{ label: 'Continuar' }], close) });
    session = play; editorCamera = previousCamera;
    transform.detach(); transform.enabled = false; selectionBox.visible = false; grid.visible = false; axes.visible = false; orbit.enabled = false;
    document.body.classList.add('playing'); $('playButton').textContent = '■ Voltar ao editor'; $('playHud').classList.remove('hidden'); $('playInstructions').classList.remove('hidden');
    $('playInstructions').textContent = 'WASD mover · ESPAÇO pular · CTRL / C agachar · SHIFT correr · E pegar · I inventário · ESC editor';
    resize(); session.cameraUpdate(1, true); session.capture();
  } catch (err) { applyEditorVisibility(); toast(err.message, 6000); }
}
function stopPlay() {
  if (!session) return; const old = session; session = null; old.dispose();
  document.body.classList.remove('playing'); $('playButton').textContent = '▶ Testar mapa'; ['playHud', 'playInstructions', 'runtimeHint'].forEach(id => $(id).classList.add('hidden'));
  camera.position.copy(editorCamera.position); orbit.target.copy(editorCamera.target); orbit.enabled = true; orbit.update(); transform.enabled = true;
  grid.visible = $('gridButton').classList.contains('active'); axes.visible = true; resize(); select(selected); toast('De volta ao editor. O teste não alterou os objetos do projeto.');
  applyEditorVisibility();
}
$('playButton').onclick = () => session ? stopPlay() : startPlay();
function hasModal() { return windowPreview.isOpen || !$('generatorModal').classList.contains('hidden') || !$('textureModal').classList.contains('hidden') || !$('infoModal').classList.contains('hidden'); }
addEventListener('keydown', e => {
  const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
  if (session) {
    if (e.code === 'Escape') { e.preventDefault(); if (session.windowPanel.isOpen) session.windowPanel.close(); else if (session.inventoryPanel.isOpen) session.inventoryPanel.close(); else if (hasModal()) closeModal('infoModal'); else stopPlay(); return; }
    if (!typing && !e.repeat && (e.code === 'KeyI' || e.code === 'Tab' && !session.paused && !session.inventoryPanel.isOpen)) { e.preventDefault(); session.toggleInventory(); return; }
    if (typing || session.paused) return;
    if (['Space', 'ControlLeft', 'ControlRight'].includes(e.code)) e.preventDefault(); session.keys.add(e.code);
    if (!e.repeat && e.code === 'KeyE') session.interact();
    if (!e.repeat && e.code === 'KeyP') session.testPulse();
    if (!e.repeat && e.code === 'Space') session.motion.requestJump();
    if (!e.repeat && e.code === 'KeyC') session.motion.toggleCrouch();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') { e.preventDefault(); save(); return; }
  if (e.code === 'Escape') { if (windowPreview.isOpen) windowPreview.close(); else if (hasModal()) { closeModal('generatorModal'); closeModal('textureModal'); closeModal('infoModal'); } else cancelPlacement(); return; }
  if (typing || hasModal()) return;
  if (e.altKey && e.code === 'KeyC') { e.preventDefault(); connectSelected(); return; }
  if (e.ctrlKey || e.metaKey) {
    if (e.code === 'KeyC') { e.preventDefault(); if (!e.repeat) copyObject(); }
    if (e.code === 'KeyV') { e.preventDefault(); if (!e.repeat) pasteObject(); }
    if (e.code === 'KeyX') { e.preventDefault(); if (!e.repeat && copyObject()) deleteSelected(); }
    if (e.code === 'KeyZ') { e.preventDefault(); e.shiftKey ? redoAction() : undoAction(); }
    if (e.code === 'KeyY') { e.preventDefault(); redoAction(); }
    if (e.code === 'KeyD') { e.preventDefault(); duplicateSelected(); }
    return;
  }
  if (e.code === 'Delete' || e.code === 'Backspace') { e.preventDefault(); deleteSelected(); }
  if (e.code === 'KeyQ') cancelPlacement(); if (e.code === 'KeyW') setTransformMode('translate'); if (e.code === 'KeyE') setTransformMode('rotate'); if (e.code === 'KeyR') setTransformMode('scale'); if (e.code === 'KeyF') focusSelection();
});
addEventListener('keyup', e => session?.keys.delete(e.code));
addEventListener('blur', () => { pointerDown = null; dragCamera = null; session?.keys.clear(); });
function resize() { const r = viewport.getBoundingClientRect(); if (!r.width || !r.height) return; camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); renderer.setSize(r.width, r.height); }
new ResizeObserver(resize).observe(viewport);
const clock = new THREE.Clock(); let statTime = 0;
function animate() {
  requestAnimationFrame(animate); const dt = Math.min(clock.getDelta(), .05);
  if (session) session.update(dt); else { orbit.update(); for (const e of project.entities) if (e.type === 'window' && e.id !== selected) orientSystemWindow(roots.get(e.id), e, camera, clock.elapsedTime); if (selected && transforming) updateSelectionBox(); }
  if (windowPreview.isOpen && previewRoot) { const canvas = windowPreview.element.querySelector('canvas'), data = previewRoot.userData.systemWindow; if (canvas.width === data.canvas.width && canvas.height === data.canvas.height) canvas.getContext('2d').drawImage(data.canvas, 0, 0); }
  if (session?.windowPanel.isOpen && session.activeWindow) { const canvas = session.windowPanel.element.querySelector('canvas'), data = roots.get(session.activeWindow).userData.systemWindow; if (canvas.width === data.canvas.width && canvas.height === data.canvas.height) canvas.getContext('2d').drawImage(data.canvas, 0, 0); }
  renderer.render(scene, camera); statTime += dt;
  if (statTime > .5) { $('stats').textContent = `${project.entities.length} objetos · ${renderer.info.render.triangles.toLocaleString('pt-BR')} tris`; statTime = 0; }
}
makePalette(); applySnap(); rebuildAll(); animate();
try { const stored = await restoreProject(); if (stored) { project = validateProject(stored); rebuildAll(); $('saveState').textContent = '● Projeto recuperado do navegador'; savedRevision = revision; } else { $('saveState').textContent = 'Setor de exemplo · salvando...'; await save(false); } }
catch (err) { $('saveState').textContent = 'Modo local · exporte JSON para guardar'; toast('O backup local não pôde ser carregado. O setor de exemplo está disponível.', 6000); console.error(err); }
loadingProject = false;
if (new URLSearchParams(location.search).has('test')) window.__ENGINE_TEST__ = {
  project: () => clone(project), select, place: (type, pos, model) => { pushHistory(); const e = createEntity(type, model, project); e.position = pos; project.entities.push(e); rebuildEntity(e.id); select(e.id); changed(); return e.id; },
  selected: () => selected, undo: undoAction, redo: redoAction, save: () => save(false), load: data => replaceProject(validateProject(data)),
  runtime: () => session ? { position: session.player.position.toArray(), camera: session.camera.position.toArray(), radius: session.radius, height: session.motion.height, health: session.health, noise: session.noise, disks: session.entities.filter(e => e.type === 'disk' && session.collected.has(e.id)).map(e => e.id), collected: [...session.collected], inventory: session.inventory.snapshot(), crouched: session.motion.crouched, grounded: session.motion.grounded, velocity: session.motion.velocity, won: session.won, near: session.near?.id, appearance: session.spawn.character.appearance, windows: [...session.windows].map(([id, state]) => ({ id, ...clone(state), visible: roots.get(id).visible, position: roots.get(id).position.toArray(), size: roots.get(id).scale.toArray(), rotation: roots.get(id).rotation.y })), actors: [...session.actors.values()].map(a => ({ id: a.entity.id, health: a.health, maxHealth: a.maxHealth, alive: a.alive, position: a.root.position.toArray(), rotation: a.root.rotation.y })) } : null,
  noise: () => { if (session) { session.noise = 100; session.invulnerable = 0; session.enemies.forEach(e => e.cooldown = 0); } },
  teleport: (x, y, z) => { session.player.position.set(x, y, z); session.motion.reset(); session.invulnerable = 30; session.findInteraction(); session.cameraUpdate(1, true); },
  step: dt => session?.update(dt), damage: () => { session.invulnerable = 0; session.damage('TEST'); },
  poses: id => { const data = []; roots.get(id)?.traverse(o => data.push({ position: o.position.toArray(), rotation: [o.rotation.x, o.rotation.y, o.rotation.z], scale: o.scale.toArray(), visible: o.visible })); return data; },
  windowPoint: (id, action, index = null) => { const root = roots.get(id), data = root.userData.systemWindow, region = data.layout.regions.find(r => r.action === action && (index === null || r.index === index)); if (!region) return null; scene.updateMatrixWorld(true); const p = data.face.localToWorld(new THREE.Vector3((region.x + region.w / 2) / data.canvas.width - .5, .5 - (region.y + region.h / 2) / data.canvas.height, 0)).project(camera), rect = renderer.domElement.getBoundingClientRect(); return { x: rect.left + (p.x * .5 + .5) * rect.width, y: rect.top + (-p.y * .5 + .5) * rect.height }; },
  start: startPlay, stop: stopPlay,
};
