import * as THREE from 'three';
import { buildCharacter, disposeObject, groundAt, isBlocked, characterRadius, resolveBodyOverlap, inventoryItem, clamp } from './palace-engine.js';
import { PlayerMotion } from './player-motion.js';
import { Inventory, InventoryPanel } from './inventory.js';
import { WindowPanel, windowState, orientSystemWindow, windowControlAt, applyWindowControl } from './palace-windows.js';

export class PlaySession {
  constructor({ scene, camera, renderer, project, roots, toast, showDialogue }) {
    this.scene = scene; this.camera = camera; this.renderer = renderer; this.project = project; this.roots = roots; this.toast = toast; this.showDialogue = showDialogue;
    this.entities = project.entities; this.keys = new Set(); this.collected = new Set(); this.disabled = new Set(); this.health = 6; this.noise = 0; this.invulnerable = 3; this.time = 0; this.yaw = 0; this.pitch = .18; this.velocity = 0; this.near = null; this.paused = false; this.won = false; this.damageOpacity = 0; this.bannerTime = 0;
    this.spawn = this.entities.find(e => e.visible && (e.type === 'spawn' || e.type === 'character' && e.character.role === 'player'));
    if (!this.spawn) throw new Error('Coloque uma Entrada / jogador no mapa antes de testar.');
    if (!Number.isFinite(groundAt(this.entities, this.spawn.position[0], this.spawn.position[2], this.spawn.position[1] + 1))) throw new Error('A entrada está fora do piso. Posicione um piso debaixo do jogador.');
    this.maxHealth = this.spawn.character.maxHealth || 6; this.health = this.maxHealth;
    this.total = this.entities.filter(e => e.type === 'disk' && e.visible).length;
    this.player = buildCharacter(this.spawn.character, project); this.player.position.fromArray(this.spawn.position); this.scene.add(this.player);
    this.player.rotation.y = this.spawn.rotation; this.player.scale.fromArray(this.spawn.size);
    const bounds = new THREE.Box3().setFromObject(this.player);
    this.motion = new PlayerMotion({ height: bounds.max.y - this.player.position.y, jumpSpeed: this.spawn.character.jumpSpeed });
    this.radius = characterRadius(this.spawn.character, this.spawn.size); this.lastSafePosition = this.player.position.clone();
    if (isBlocked(this.entities, ...this.player.position.toArray(), this.radius, this.motion.height)) {
      if (!isBlocked(this.entities, ...this.player.position.toArray(), this.radius, this.motion.standingHeight * .48)) { this.motion.crouched = true; this.player.scale.y *= .48; }
      else {
        const safe = resolveBodyOverlap(this.entities, this.player.position, this.radius, this.motion.height);
        if (!safe) { disposeObject(this.player); throw new Error('A entrada não tem espaço livre para este personagem. Mova-a para fora dos blocos.'); }
        this.player.position.set(safe.x, safe.y, safe.z);
      }
    }
    this.lastSafePosition.copy(this.player.position);
    Object.defineProperty(this, 'velocity', { get: () => this.motion.velocity, set: v => this.motion.velocity = v });
    this.inventory = new Inventory();
    this.inventoryPanel = new InventoryPanel({ parent: renderer.domElement.parentElement, inventory: this.inventory, onClose: () => { this.paused = false; this.capture(); }, onUse: item => this.useItem(item) });
    this.windows = new Map(this.entities.filter(e => e.type === 'window').map(e => [e.id, windowState(e.window)])); this.activeWindow = null;
    this.windowPanel = new WindowPanel({ parent: renderer.domElement.parentElement, onControl: control => this.controlWindow(this.activeWindow, control), onDismiss: () => { this.activeWindow = null; this.paused = false; this.capture(); } });
    this.yaw = this.spawn.rotation;
    this.savedTransforms = new Map();
    for (const [id, root] of roots) {
      const poses = []; root.traverse(o => poses.push({ object: o, position: o.position.clone(), rotation: o.rotation.clone(), scale: o.scale.clone(), visible: o.visible }));
      this.savedTransforms.set(id, { pos: root.position.clone(), rot: root.rotation.clone(), visible: root.visible, poses });
      const e = this.entities.find(e => e.id === id);
      if (e.type === 'spawn' || e.type === 'character' && e.character.role === 'player') root.visible = false;
      root.traverse(o => { if (o.userData.editorOnly) o.visible = false; });
    }
    this.actors = new Map(); this.targetActor = null; this.pulseCooldown = 0;
    const labelLayer = document.getElementById('actorLabels'); labelLayer.replaceChildren();
    for (const e of this.entities.filter(e => e.visible && e.type === 'character' && e.character.role !== 'player')) {
      const root = roots.get(e.id), label = document.createElement('div'); label.className = 'actor-label';
      const name = document.createElement('span'); name.textContent = e.name; label.append(name);
      const value = document.createElement('small'), track = document.createElement('div'), fill = document.createElement('i'); track.append(fill); label.append(value, track); labelLayer.append(label);
      const bounds = new THREE.Box3().setFromObject(root);
      this.actors.set(e.id, { entity: e, root, health: e.character.maxHealth || 6, maxHealth: e.character.maxHealth || 6, alive: true, home: root.position.clone(), target: root.position.clone(), wait: 0, phase: this.actors.size * 1.7, label, value, fill, labelHeight: bounds.max.y - root.position.y + .4 });
    }
    this.enemies = this.entities.filter(e => e.visible && e.type === 'character' && e.character.role === 'enemy').map(e => ({ entity: e, root: roots.get(e.id), active: false, cooldown: 3, attack: 0, looking: 0, last: new THREE.Vector3(...e.position) }));
    this.checkpoint = { position: this.player.position.clone(), collected: new Set(), disabled: new Set(), actors: this.actorSnapshot(), inventory: [], crouched: this.motion.crouched, windows: structuredClone(this.windows) };
    this.collisionMeshes = this.entities.filter(e => e.visible && e.collision && ['floor', 'ramp', 'wall', 'box', 'screen', 'exit', 'window'].includes(e.type)).flatMap(e => {
      const meshes = []; roots.get(e.id)?.traverse(o => { if (o.isMesh) meshes.push(o); }); return meshes;
    });
    this.ray = new THREE.Raycaster(); this.scene.updateMatrixWorld(true);
    this.cameraUpdate(1, true); this.updateHud();
    document.getElementById('runtimeObjective').textContent = this.total ? 'Recupere as memórias e encontre o terminal.' : 'Explore o mapa e encontre o terminal.';
    this.toast('TESTE INICIADO — ESC volta à edição. As alterações do mapa ficam preservadas.');
  }
  capture() {
    try { const p = this.renderer.domElement.requestPointerLock(); p?.catch?.(() => this.toast('Arraste com o mouse para girar a câmera.')); } catch { /* drag camera is supported */ }
  }
  activeEntities() {
    return this.entities.filter(e => !this.collected.has(e.id) && !this.windows.get(e.id)?.closed).map(e => {
      if (e.type !== 'window') return e;
      const root = this.roots.get(e.id); return { ...e, type: 'box', position: [root.position.x, root.position.y - root.scale.y / 2, root.position.z], rotation: root.rotation.y, size: root.scale.toArray() };
    });
  }
  diskCount() { return this.entities.filter(e => e.type === 'disk' && this.collected.has(e.id)).length; }
  toggleInventory() {
    if (this.inventoryPanel.isOpen) { this.inventoryPanel.close(); return; }
    if (this.paused) return;
    this.paused = true; this.keys.clear(); this.motion.jumpBuffer = 0;
    if (document.pointerLockElement) document.exitPointerLock();
    document.getElementById('runtimeHint').classList.add('hidden'); this.inventoryPanel.open();
  }
  useItem(item) {
    if (item.kind !== 'heal' || !this.inventory.items.has(item.id)) return;
    if (this.health >= this.maxHealth) return this.toast('Sua integridade já está completa. A cápsula foi preservada.');
    if (item.heal <= 0) return this.toast('Este item não tem recuperação configurada.');
    this.health = Math.min(this.maxHealth, this.health + item.heal); this.inventory.consume(item.id); this.updateHud(); this.toast('Cápsula usada — integridade recuperada.');
  }
  saveCheckpoint() {
    this.checkpoint = { position: this.player.position.clone(), collected: new Set(this.collected), disabled: new Set(this.disabled), actors: this.actorSnapshot(), inventory: this.inventory.snapshot(), crouched: this.motion.crouched, windows: structuredClone(this.windows) };
  }
  updateWindows(dt) {
    for (const e of this.entities.filter(e => e.type === 'window')) {
      const root = this.roots.get(e.id), state = this.windows.get(e.id), data = root.userData.systemWindow;
      if (!state.closed && e.window.content === 'progress' && !state.progressPaused && e.window.progressSpeed) {
        const old = Math.floor(state.progress); state.progress = Math.min(100, state.progress + dt * e.window.progressSpeed);
        if (Math.floor(state.progress) !== old) data.repaint(state);
      }
      orientSystemWindow(root, e, this.camera, this.time, state, this.player.position);
    }
  }
  openWindow(e, focusField = null) {
    if (this.windows.get(e.id)?.closed) return;
    this.activeWindow = e.id; this.paused = true; this.keys.clear(); if (document.pointerLockElement) document.exitPointerLock();
    this.windowPanel.open(this.roots.get(e.id), e); document.getElementById('runtimeHint').classList.add('hidden');
    if (focusField !== null) this.windowPanel.element.querySelectorAll('.system-window-fields input')[focusField]?.focus();
  }
  beep() {
    try {
      this.audio ||= new (window.AudioContext || window.webkitAudioContext)(); this.audio.resume().catch(() => {});
      const o = this.audio.createOscillator(), g = this.audio.createGain(), now = this.audio.currentTime; o.type = 'triangle'; o.frequency.setValueAtTime(450, now); o.frequency.setValueAtTime(220, now + .12); g.gain.setValueAtTime(.05, now); g.gain.exponentialRampToValueAtTime(.0001, now + .32); o.connect(g).connect(this.audio.destination); o.start(); o.stop(now + .33);
    } catch { /* numerical noise and detection still work without audio */ }
  }
  controlWindow(id, control) {
    const e = this.entities.find(e => e.id === id), state = this.windows.get(id); if (!e || !state || state.closed) return;
    if (control.action === 'field' && control.value === undefined) { this.openWindow(e, control.index); return; }
    const effect = applyWindowControl(e.window, state, control);
    if (effect) {
      if (effect.close) state.closed = true;
      if (effect.effect === 'noise') { this.noise = 100; this.enemies.forEach(enemy => enemy.cooldown = 0); this.beep(); this.toast('ALERTA DE WINDOWS — os processos próximos ouviram o aviso.'); }
      if (effect.effect === 'silence') { this.noise = 0; this.enemies.forEach(enemy => { enemy.active = false; enemy.cooldown = 8; }); this.toast('PROCESSOS SUSPENSOS — alguns segundos de silêncio.'); }
      if (effect.effect === 'heal') { this.health = Math.min(this.maxHealth, this.health + e.window.heal); this.toast('Integridade recuperada pela janela.'); }
      if (effect.effect === 'checkpoint') { this.saveCheckpoint(); this.toast('Checkpoint registrado pela janela.'); }
      if (effect.effect === 'message') this.toast(effect.text || e.window.response || 'Processo atualizado.');
      if (effect.effect === 'ignore') this.toast('Erro mantido aberto. Você pode continuar explorando.');
    }
    this.roots.get(id).userData.systemWindow.repaint(state); this.updateWindows(0); this.updateHud();
    if (this.windowPanel.isOpen && this.activeWindow === id) {
      if (state.closed || state.minimized || effect?.effect === 'ignore') this.windowPanel.close(); else this.windowPanel.render();
    }
  }
  clickWindow(event) {
    if (this.paused) return false;
    const rect = this.renderer.domElement.getBoundingClientRect(), locked = document.pointerLockElement === this.renderer.domElement;
    const pointer = locked ? new THREE.Vector2(0, 0) : new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    this.scene.updateMatrixWorld(true); this.ray.setFromCamera(pointer, this.camera); this.ray.far = 12;
    const roots = [...this.windows].filter(([id, s]) => !s.closed && this.roots.get(id).visible).map(([id]) => this.roots.get(id));
    const hit = this.ray.intersectObjects(roots, true)[0];
    if (!hit?.object.userData.windowFace || hit.point.distanceTo(this.player.position) > 5 || !this.lineOfSight(this.camera.position, hit.point, hit.object.userData.entityId)) return false;
    const e = this.entities.find(e => e.id === hit.object.userData.entityId), root = this.roots.get(e.id), control = windowControlAt(root, hit);
    if (control) this.controlWindow(e.id, control); else this.openWindow(e); return true;
  }
  dispose() {
    this.inventoryPanel.dispose();
    this.windowPanel.dispose();
    this.audio?.close().catch(() => {});
    this.keys.clear(); if (document.pointerLockElement) document.exitPointerLock(); disposeObject(this.player);
    for (const [id, root] of this.roots) {
      const prev = this.savedTransforms.get(id); if (!prev) continue;
      root.position.copy(prev.pos); root.rotation.copy(prev.rot); root.visible = prev.visible;
      for (const pose of prev.poses) { pose.object.position.copy(pose.position); pose.object.rotation.copy(pose.rotation); pose.object.scale.copy(pose.scale); pose.object.visible = pose.visible; }
      const e = this.entities.find(e => e.id === id); if (e.type === 'window') root.userData.systemWindow.repaint(windowState(e.window));
    }
    document.getElementById('runtimeDamage').style.opacity = '0'; document.getElementById('runtimeBanner').classList.add('hidden');
    document.getElementById('actorLabels').replaceChildren(); document.getElementById('runtimeActorInfo').classList.add('hidden');
  }
  mouse(dx, dy) { if (!this.paused) { this.yaw -= dx * .0025; this.pitch = clamp(this.pitch + dy * .002, -.15, .8); } }
  lineOfSight(from, to, ignoreId = null) {
    const direction = to.clone().sub(from), distance = direction.length();
    if (distance < .01) return true;
    this.ray.set(from, direction.normalize()); this.ray.far = distance;
    return !this.ray.intersectObjects(this.collisionMeshes.filter(m => m.visible && m.parent.visible && m.userData.entityId !== ignoreId), false).some(h => h.distance < distance - .2);
  }
  cameraUpdate(dt, immediate = false) {
    const target = this.player.position.clone().add(new THREE.Vector3(0, 1.4 * this.spawn.size[1] * (this.motion.crouched ? .55 : 1), 0));
    const dist = 5.7, offset = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch) * dist, 1.1 + Math.sin(this.pitch) * dist, Math.cos(this.yaw) * Math.cos(this.pitch) * dist);
    this.scene.updateMatrixWorld(true); this.ray.set(target, offset.clone().normalize()); this.ray.far = offset.length();
    const hits = this.ray.intersectObjects(this.collisionMeshes.filter(m => m.visible && m.parent.visible), false);
    if (hits.length) offset.setLength(Math.max(.55, hits[0].distance - .25));
    const desired = target.clone().add(offset);
    if (immediate || hits.length && this.camera.position.distanceTo(target) > offset.length() + .05) this.camera.position.copy(desired);
    else this.camera.position.lerp(desired, 1 - Math.exp(-dt * 12));
    this.camera.lookAt(target); this.player.visible = this.camera.position.distanceTo(target) > 1;
  }
  updateHud() {
    const $ = id => document.getElementById(id);
    const hearts = this.health / this.maxHealth * 6;
    $('runtimeHearts').textContent = [0, 1, 2].map(i => hearts >= (i + 1) * 2 ? '♥' : hearts > i * 2 ? '◐' : '♡').join('') + ` ${this.health}/${this.maxHealth}`;
    $('runtimeDisks').textContent = `${this.diskCount()} / ${this.total}`;
    const threat = this.enemies.find(e => e.active && this.actors.get(e.entity.id)?.alive);
    $('runtimeNoise').textContent = threat ? `${threat.entity.name} / PROCESSO DETECTADO` : this.motion.crouched ? 'AGACHADO / SILENCIOSO' : this.noise > 40 ? 'RUÍDO ALTO' : 'PROCESSO SILENCIOSO';
  }
  banner(text, duration = 4) { const b = document.getElementById('runtimeBanner'); b.textContent = text; b.classList.remove('hidden'); this.bannerTime = duration; }
  rollback() {
    this.player.position.copy(this.checkpoint.position); this.health = this.maxHealth; this.noise = 0; this.invulnerable = 4; this.motion.reset(); this.player.scale.fromArray(this.spawn.size);
    this.motion.crouched = !!this.checkpoint.crouched;
    if (this.motion.crouched) this.player.scale.y *= .48;
    this.lastSafePosition.copy(this.player.position);
    this.collected = new Set(this.checkpoint.collected); this.disabled = new Set(this.checkpoint.disabled);
    this.inventory.restore(this.checkpoint.inventory);
    this.windows = structuredClone(this.checkpoint.windows);
    for (const e of this.entities.filter(e => e.type === 'window')) this.roots.get(e.id).userData.systemWindow.repaint(this.windows.get(e.id));
    this.updateWindows(0);
    for (const e of this.entities.filter(e => e.pickup.enabled)) this.roots.get(e.id).visible = e.visible && !this.collected.has(e.id);
    for (const [id, actor] of this.actors) {
      const cp = this.checkpoint.actors.get(id); actor.health = cp.health; actor.alive = cp.health > 0; actor.root.visible = actor.alive;
      actor.root.position.copy(cp.position); actor.root.rotation.copy(cp.rotation); actor.target.copy(cp.position); actor.wait = 0;
    }
    for (const enemy of this.enemies) { enemy.active = false; enemy.cooldown = 4; enemy.attack = 0; enemy.looking = 0; }
    this.cameraUpdate(1, true); this.updateHud(); this.banner('ROLLBACK — último checkpoint restaurado.', 3);
  }
  damage(message, amount = 1) {
    if (this.invulnerable > 0 || this.spawn.character.invulnerable || this.won || amount <= 0) return;
    this.health = Math.max(0, this.health - amount); this.invulnerable = 2.5; this.damageOpacity = .9; this.toast(message); this.updateHud();
    if (this.health <= 0) this.rollback();
  }
  interact() {
    if (!this.near || this.paused) return;
    const e = this.near;
    if (e.type === 'window') { this.openWindow(e); return; }
    if (e.pickup.enabled) {
      if (this.collected.has(e.id)) return;
      this.collected.add(e.id); this.roots.get(e.id).visible = false; this.inventory.add(inventoryItem(e)); this.noise = Math.min(100, this.noise + 15);
      this.toast(`${e.pickup.name || e.name} guardado no inventário. I abre a lista de itens.`);
    }
    else if (e.type === 'capsule') {
      this.health = this.maxHealth; this.noise = 0; this.invulnerable = 4;
      this.saveCheckpoint();
      this.toast('BACKUP DO TESTE SALVO — integridade restaurada.');
    } else if (e.type === 'screen') { this.disabled.add(e.id); this.toast(e.message || 'WATCHER OFFLINE'); }
    else if (e.type === 'exit') {
      if (this.diskCount() < this.total) this.toast(`Ainda faltam ${this.total - this.diskCount()} fragmentos de memória.`);
      else { this.won = true; this.banner(e.message || 'COB_01.EXE successfully restored. Explore ou pressione ESC para voltar ao editor.', 8); }
    } else if (e.type === 'character') {
      this.paused = true; this.keys.clear(); if (document.pointerLockElement) document.exitPointerLock();
      this.showDialogue(e.name, e.character.dialogue || 'O registro está vazio.', () => { this.paused = false; this.capture(); });
    }
    this.updateHud(); this.findInteraction();
  }
  findInteraction() {
    this.near = null; let closest = 2.6;
    for (const e of this.entities) {
      if (!e.visible || (!e.pickup.enabled && !['capsule', 'screen', 'exit', 'character', 'window'].includes(e.type)) || this.collected.has(e.id) || this.disabled.has(e.id) || this.windows.get(e.id)?.closed) continue;
      if (e.type === 'character' && ['enemy', 'player'].includes(e.character.role)) continue;
      if (e.type === 'character' && !this.actors.get(e.id)?.alive) continue;
      const pos = e.type === 'character' || e.type === 'window' ? this.roots.get(e.id).position.clone() : new THREE.Vector3(...e.position);
      const d = e.type === 'window' ? new THREE.Box3().setFromObject(this.roots.get(e.id)).distanceToPoint(this.player.position.clone().add(new THREE.Vector3(0, 1.4, 0))) : pos.distanceTo(this.player.position);
      if (d < closest && this.lineOfSight(this.player.position.clone().add(new THREE.Vector3(0, this.motion.crouched ? .65 : 1.1, 0)), pos.clone().add(new THREE.Vector3(0, .65, 0)), e.id)) { this.near = e; closest = d; }
    }
    const hint = document.getElementById('runtimeHint'); hint.classList.toggle('hidden', !this.near || this.paused);
    if (this.near) hint.textContent = `E · ${this.near.pickup.enabled ? 'Pegar' : this.near.type === 'window' ? 'Abrir controles de' : this.near.type === 'capsule' ? 'Salvar checkpoint' : this.near.type === 'screen' ? 'Desligar' : this.near.type === 'exit' ? 'Restaurar arquivo' : 'Conversar com'} ${this.near.pickup.enabled ? this.near.pickup.name || this.near.name : this.near.name}`;
  }
  move(dt) {
    const k = this.keys;
    const entities = this.activeEntities(), blocked = (x, y, z, height) => isBlocked(entities, x, y, z, this.radius, height);
    this.motion.stance(this.player.position, k.has('ControlLeft') || k.has('ControlRight'), blocked);
    let f = (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0), r = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
    const len = Math.hypot(f, r); if (len) { f /= len; r /= len; }
    const silent = this.motion.crouched, running = !silent && (k.has('ShiftLeft') || k.has('ShiftRight'));
    const speed = this.spawn.character.speed * (silent ? .5 : running ? 1.75 : 1);
    const dx = (-Math.sin(this.yaw) * f + Math.cos(this.yaw) * r) * speed * dt, dz = (-Math.cos(this.yaw) * f - Math.sin(this.yaw) * r) * speed * dt;
    const p = this.player.position, before = p.clone();
    this.motion.step(dt, { position: p, dx, dz, blocked, ground: (x, z, y) => groundAt(entities, x, z, y, this.radius) });
    if (blocked(p.x, p.y, p.z, this.motion.height)) {
      const safe = resolveBodyOverlap(entities, p, this.radius, this.motion.height);
      if (safe) p.set(safe.x, safe.y, safe.z);
      else if (!blocked(this.lastSafePosition.x, this.lastSafePosition.y, this.lastSafePosition.z, this.motion.height)) p.copy(this.lastSafePosition);
      else { this.rollback(); return; }
      this.motion.velocity = 0;
    }
    if (!blocked(p.x, p.y, p.z, this.motion.height) && this.motion.grounded) this.lastSafePosition.copy(p);
    const scaleY = this.spawn.size[1] * (this.motion.crouched ? .48 : 1); this.player.scale.y += (scaleY - this.player.scale.y) * Math.min(1, dt * 16);
    if (p.y < -15) { this.rollback(); return; }
    const moving = Math.hypot(p.x - before.x, p.z - before.z) > .001;
    if (moving) { const angle = Math.atan2(-dx, -dz), diff = Math.atan2(Math.sin(angle - this.player.rotation.y), Math.cos(angle - this.player.rotation.y)); this.player.rotation.y += diff * Math.min(1, dt * 12); }
    this.noise = clamp(this.noise + dt * (moving && running ? 33 : silent ? -30 : -19), 0, 100);
    this.player.userData.animation?.limbs.forEach((m, i) => m.rotation.x = moving ? Math.sin(this.time * (running ? 14 : 8)) * .4 * (i % 2 ? -1 : 1) : m.rotation.x * .85);
    this.player.userData.animation?.wings.forEach((m, i) => m.rotation.y = Math.sin(this.time * 9) * .55 * (i ? -1 : 1));
  }
  actorSnapshot() {
    return new Map([...this.actors].map(([id, actor]) => [id, { health: actor.health, position: actor.root.position.clone(), rotation: actor.root.rotation.clone() }]));
  }
  damageActor(id, amount = 1) {
    const actor = this.actors.get(id); if (!actor?.alive || amount <= 0) return false;
    if (actor.entity.character.invulnerable || actor.entity.character.role === 'cache') { this.toast(`${actor.entity.name} está invulnerável.`); return false; }
    actor.health = Math.max(0, actor.health - amount);
    if (!actor.health) {
      actor.alive = false; actor.root.visible = false; actor.label.classList.add('hidden');
      const enemy = this.enemies.find(e => e.entity.id === id); if (enemy) enemy.active = false;
      this.toast(`${actor.entity.name}: 0 HP — processo encerrado no teste.`);
    } else this.toast(`${actor.entity.name}: ${actor.health} / ${actor.maxHealth} HP.`);
    this.findInteraction(); this.updateActorLabels(); return true;
  }
  testPulse() {
    if (this.paused || this.pulseCooldown > 0) return;
    this.updateActorLabels(); if (!this.targetActor) return this.toast('Aproxime-se de um personagem para testar sua vida.');
    this.pulseCooldown = .25; this.damageActor(this.targetActor.entity.id, 1);
  }
  updateNPCs(dt) {
    for (const actor of this.actors.values()) {
      const { entity: e, root } = actor, ch = e.character;
      if (!actor.alive || ch.role === 'enemy') continue;
      const before = root.position.clone(), distance = root.position.distanceTo(this.player.position);
      const seesPlayer = distance < ch.range && this.lineOfSight(root.position.clone().add(new THREE.Vector3(0, 1.1, 0)), this.player.position.clone().add(new THREE.Vector3(0, 1.1, 0)));
      let desired = null;
      if (ch.role === 'npc' && ch.movement === 'follow' && seesPlayer && distance > 1.8) desired = this.player.position;
      if (ch.role === 'npc' && ch.movement === 'wander') {
        actor.wait -= dt;
        if (actor.wait <= 0) {
          const angle = this.time * .71 + actor.phase, radius = ch.wanderRadius * (.45 + .45 * Math.abs(Math.sin(this.time + actor.phase)));
          actor.target.set(actor.home.x + Math.cos(angle) * radius, root.position.y, actor.home.z + Math.sin(angle) * radius); actor.wait = 4;
        }
        if (root.position.distanceTo(actor.target) > .3) desired = actor.target;
      }
      if (desired) {
        const dir = desired.clone().sub(root.position); dir.y = 0;
        if (dir.length() > .01) {
          dir.setLength(Math.min(dir.length(), ch.speed * dt));
          const nx = root.position.x + dir.x, nz = root.position.z + dir.z;
          const entities = this.activeEntities(), ground = groundAt(entities, nx, nz, root.position.y);
          if (Number.isFinite(ground) && Math.abs(ground - root.position.y) < .43 && !isBlocked(entities, nx, ground, nz, .3)) root.position.set(nx, ground, nz);
          else if (ch.movement === 'wander') actor.wait = 0;
        }
      }
      const moving = root.position.distanceTo(before) > .001;
      if (moving || seesPlayer && ch.role === 'npc' && ch.movement !== 'wander') {
        const direction = moving ? root.position.clone().sub(before) : this.player.position.clone().sub(root.position);
        const angle = Math.atan2(-direction.x, -direction.z), diff = Math.atan2(Math.sin(angle - root.rotation.y), Math.cos(angle - root.rotation.y)); root.rotation.y += diff * Math.min(1, dt * 5);
      }
      const model = root.children[0];
      if (model) {
        model.position.y = ch.idleAnimation ? Math.sin(this.time * 2.1 + actor.phase) * .018 : 0;
        model.userData.animation?.limbs.forEach((limb, i) => limb.rotation.x = moving ? Math.sin(this.time * 8) * .35 * (i % 2 ? -1 : 1) : ch.idleAnimation ? Math.sin(this.time * 1.6 + actor.phase + i) * .035 : 0);
        model.userData.animation?.wings.forEach((wing, i) => wing.rotation.y = ch.idleAnimation ? Math.sin(this.time * 5) * .25 * (i ? -1 : 1) : 0);
      }
    }
  }
  updateActorLabels() {
    const layer = document.getElementById('actorLabels'), info = document.getElementById('runtimeActorInfo');
    const width = layer.clientWidth, height = layer.clientHeight; this.camera.updateMatrixWorld();
    this.targetActor = null; let closest = 6;
    for (const actor of this.actors.values()) {
      const distance = actor.root.position.distanceTo(this.player.position);
      const world = actor.root.position.clone().add(new THREE.Vector3(0, actor.labelHeight, 0)), projected = world.clone().project(this.camera);
      const seen = actor.alive && distance < 18 && projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 1.1 && Math.abs(projected.y) < 1.1 && this.lineOfSight(this.camera.position, world);
      actor.label.classList.toggle('hidden', !seen);
      if (seen) {
        actor.label.style.left = `${(projected.x * .5 + .5) * width}px`; actor.label.style.top = `${(-projected.y * .5 + .5) * height}px`;
        actor.value.textContent = `${actor.health} / ${actor.maxHealth} HP${actor.entity.character.invulnerable || actor.entity.character.role === 'cache' ? ' · INVULNERÁVEL' : ''}`;
        actor.fill.style.width = `${actor.health / actor.maxHealth * 100}%`; actor.label.classList.toggle('hostile', actor.entity.character.role === 'enemy');
      }
      if (actor.alive && distance < closest && this.lineOfSight(this.player.position.clone().add(new THREE.Vector3(0, 1.1, 0)), actor.root.position.clone().add(new THREE.Vector3(0, 1.1, 0)))) { closest = distance; this.targetActor = actor; }
    }
    info.classList.toggle('hidden', !this.targetActor || this.paused);
    if (this.targetActor) info.textContent = `${this.targetActor.entity.name} · ${this.targetActor.health}/${this.targetActor.maxHealth} HP · P: dano de teste (1 HP)`;
  }
  updateEnemies(dt) {
    for (const enemy of this.enemies) {
      const { entity: e, root } = enemy, p = this.player.position;
      if (!this.actors.get(e.id)?.alive) continue;
      const dist = Math.hypot(root.position.x - p.x, root.position.z - p.z);
      const eye = root.position.clone().add(new THREE.Vector3(0, 1, 0)), target = p.clone().add(new THREE.Vector3(0, 1, 0));
      enemy.cooldown = Math.max(0, enemy.cooldown - dt);
      if (e.character.model === 'sysadmin') {
        const core = root.position.clone().add(new THREE.Vector3(0, 3.2 * e.size[1], 0));
        if (dist < e.character.range && this.lineOfSight(core, target)) {
          const angle = Math.atan2(-(p.x - root.position.x), -(p.z - root.position.z));
          root.rotation.y += Math.atan2(Math.sin(angle - root.rotation.y), Math.cos(angle - root.rotation.y)) * Math.min(1, dt * 4);
        }
        const direction = new THREE.Vector3(); this.camera.getWorldDirection(direction);
        const watchers = this.entities.some(o => o.visible && (o.type === 'screen' || o.type === 'window' && o.window.watcher && !this.windows.get(o.id)?.closed) && !this.disabled.has(o.id));
        const watched = dist < e.character.range && direction.dot(core.clone().sub(this.camera.position).normalize()) > .93 && this.lineOfSight(this.camera.position, core) && watchers;
        enemy.looking = watched ? enemy.looking + dt : Math.max(0, enemy.looking - dt * 2);
        if (enemy.looking > 3.2) { this.damage(`${e.name} — evite encarar o núcleo ciano.`, e.character.damage); enemy.looking = 0; }
        continue;
      }
      const flying = e.character.model === 'eros';
      const visible = this.lineOfSight(eye, target);
      if (!enemy.active && enemy.cooldown <= 0 && dist < e.character.range && (this.noise > 45 || !flying && dist < 7 && visible)) { enemy.active = true; enemy.last.copy(p); enemy.attack = 0; }
      if (enemy.active && dist < e.character.range && visible) enemy.last.copy(p);
      const desired = enemy.active ? enemy.last.clone() : new THREE.Vector3(e.position[0] + Math.sin(this.time * .5) * 2, e.position[1], e.position[2] + Math.cos(this.time * .5) * 2);
      if (flying) desired.y = enemy.active ? p.y + 3.1 : e.position[1];
      else desired.y = root.position.y;
      if (enemy.active && dist < 1.6 && visible) {
        enemy.attack += dt;
        if (flying && enemy.attack < .9) { if (enemy.attack < dt * 1.5) this.toast(`${e.name} — uma sombra parou sobre você. Saia debaixo!`); }
        else if (enemy.attack > (flying ? 1.1 : .6)) {
          if (Math.abs(p.y - enemy.last.y) < 2 && dist < 1.5) this.damage(`${e.name} atacou seu processo. Procure cobertura ou caminhe em silêncio.`, e.character.damage);
          enemy.cooldown = 4; enemy.active = false; enemy.attack = 0;
        }
      } else enemy.attack = 0;
      if (enemy.active && this.noise < 8 && !visible) enemy.active = false;
      const delta = desired.sub(root.position), speed = e.character.speed * (enemy.active ? 1 : .4);
      if (delta.length() > .05) {
        delta.setLength(Math.min(delta.length(), speed * dt));
        const entities = this.activeEntities();
        if (!isBlocked(entities, root.position.x + delta.x, root.position.y, root.position.z, .2)) root.position.x += delta.x;
        if (!isBlocked(entities, root.position.x, root.position.y, root.position.z + delta.z, .2)) root.position.z += delta.z;
        if (flying) root.position.y += delta.y;
        else { const ground = groundAt(entities, root.position.x, root.position.z, root.position.y); if (Number.isFinite(ground)) root.position.y = ground; }
        root.rotation.y = Math.atan2(-delta.x, -delta.z);
      }
      root.children[0]?.userData.animation?.wings.forEach((w, i) => w.rotation.y = Math.sin(this.time * 10) * .55 * (i ? -1 : 1));
    }
  }
  update(dt) {
    if (this.paused) return;
    this.time += dt; this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.pulseCooldown = Math.max(0, this.pulseCooldown - dt);
    this.updateWindows(dt); this.move(dt); this.updateEnemies(dt); this.updateNPCs(dt); this.cameraUpdate(dt); this.findInteraction(); this.updateActorLabels(); this.updateHud();
    this.damageOpacity = Math.max(0, this.damageOpacity - dt * 2); document.getElementById('runtimeDamage').style.opacity = this.damageOpacity;
    if (this.bannerTime > 0) { this.bannerTime -= dt; if (this.bannerTime <= 0) document.getElementById('runtimeBanner').classList.add('hidden'); }
    for (const e of this.entities.filter(e => ['disk', 'item'].includes(e.type) && !this.collected.has(e.id))) { const r = this.roots.get(e.id); r.rotation.y = e.rotation + this.time * .6; r.position.y = e.position[1] + Math.sin(this.time * 2) * .08; }
  }
}
