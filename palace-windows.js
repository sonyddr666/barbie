import * as THREE from 'three';

export const WINDOW_ACTIONS = { close: 'Fechar', noise: 'Fechar + alerta / ruído', silence: 'Fechar + silenciar inimigos', ignore: 'Ignorar / manter janela', heal: 'Recuperar integridade', checkpoint: 'Salvar checkpoint', pause: 'Pausar / retomar progresso', message: 'Mostrar resposta' };
export const WINDOW_PRESETS = [
  ['error', 'Erro / 1 botão', '×'], ['warning', 'Aviso / 1 botão', '⚠'], ['confirm', 'Confirmação / 2 botões', '?'], ['choice', 'Escolha / 3 botões', '≡'],
  ['info', 'Informação', 'i'], ['portrait', 'Mensagem / Coelhinha', '♡'], ['eye', 'Imagem / Watcher', '◉'], ['lips', 'Imagem / Echo', '◡'], ['image', 'Imagem personalizada', '▧'],
  ['progress', 'Barra de progresso', '▰'], ['properties', 'Propriedades / abas', '▤'], ['explorer', 'Explorador / arquivos', '⊞'], ['terminal', 'Terminal', '>_'], ['bsod', 'Erro fatal / BSOD', '▣'],
].map(([key, label, icon]) => ({ key, label, icon, size: ['image', 'eye', 'lips'].includes(key) ? [2.8, 2.2, .12] : ['properties', 'explorer', 'terminal', 'bsod'].includes(key) ? [3.8, 2.6, .12] : [3.2, 1.45, .12] }));
const button = (label, action = 'close', close = true) => ({ label, action, close });
export function windowPreset(key = 'warning') {
  const base = { preset: key, theme: 'classic', title: 'System warning', text: 'Memory corrupted.', content: 'text', icon: 'warning', titleBar: true, close: true, minimize: false, maximize: false, menuBar: false, menus: ['Arquivo', 'Editar', 'Exibir', 'Ajuda'], statusBar: false, status: 'The Palace / process online', tabs: ['Geral', 'Memória', 'Permissões'], tabTexts: ['Arquivo preservado no servidor.', 'BUFFER_ADDRESS_01\nINTEGRITY: UNKNOWN', 'Acesso somente para processos ativos.'], rows: ['COB_01.EXE', 'BUFFER_01.DAT', 'CACHE_008.LOG'], fields: ['Nome=COB_01.EXE', 'Endereço=BUFFER_01'], buttons: [button('OK', 'noise')], progress: 37, progressSpeed: 0, response: 'Processo atualizado.', heal: 2, mount: 'floating', facing: 'camera', bob: .08, watcher: false, imageFit: 'contain', titleColor: '#000080', bodyColor: '#c0c0c0', textColor: '#101010' };
  const definitions = {
    error: { title: 'System error', text: 'An unhandled exception has occurred.\nThe process cannot continue.', icon: 'error' },
    warning: {}, confirm: { title: 'Restore original file?', text: 'Deseja restaurar este fragmento de memória?', icon: 'question', buttons: [button('OK', 'noise'), button('Cancelar', 'silence')] },
    choice: { title: 'Process not responding', text: 'Este processo não está respondendo. Escolha como continuar.', buttons: [button('OK', 'noise'), button('Cancelar', 'silence'), button('Ignorar', 'ignore', false)] },
    info: { title: 'COB-01 / message', text: "I don't feel so well...", icon: 'info', buttons: [button('Fechar')] },
    portrait: { title: 'COB_01.EXE', content: 'portrait', text: "I don't feel so well...", icon: 'none', buttons: [button('OK', 'close')] },
    eye: { title: 'Watcher.exe', content: 'image', text: '', icon: 'none', buttons: [], minimize: true, maximize: true, mount: 'wall', facing: 'fixed', bob: 0, watcher: true, imageFit: 'cover' },
    lips: { title: 'Echo Node', content: 'image', text: '', icon: 'none', buttons: [], minimize: true, maximize: true, mount: 'wall', facing: 'fixed', bob: 0, imageFit: 'cover' },
    image: { title: 'Memory viewer', content: 'image', text: '', icon: 'none', buttons: [], minimize: true, maximize: true },
    progress: { title: 'DEFRAG.EXE', content: 'progress', text: 'Reorganizando os setores de memória...', icon: 'none', statusBar: true, buttons: [button('Pausar', 'pause', false), button('Cancelar')], progressSpeed: 4 },
    properties: { title: 'Propriedades de COB_01.EXE', content: 'properties', text: 'Registro de processo', icon: 'none', statusBar: true, buttons: [button('OK'), button('Cancelar'), button('Aplicar', 'message', false)] },
    explorer: { title: 'Arquivo Morto / Explorer', content: 'explorer', text: 'Arquivos preservados', icon: 'folder', menuBar: true, statusBar: true, minimize: true, maximize: true, buttons: [], mount: 'wall', facing: 'fixed', bob: 0 },
    terminal: { title: 'C:\\PALACE\\SYSTEM.EXE', content: 'terminal', text: '> SERVER 1998 ONLINE\n> READING MEMORY BUFFER...\n> COB_01.EXE: ADDRESS NOT FOUND\n> _', icon: 'none', minimize: true, maximize: true, buttons: [], bodyColor: '#08130f', textColor: '#9ad9a9' },
    bsod: { title: 'FATAL EXCEPTION', content: 'bsod', text: 'A fatal exception has occurred.\n\n*** STOP: 0x0000007E\nMEMORY_DUMP_COMPLETE\n\nThe Palace\nNUCLEUS_TERMINAL.EXE', icon: 'none', titleBar: false, close: false, buttons: [], bodyColor: '#0835a6', textColor: '#ffffff', mount: 'wall', facing: 'fixed', bob: 0 },
  };
  return structuredClone({ ...base, ...(definitions[key] || definitions.warning) });
}
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const text = (v, fallback = '', length = 4000) => String(v ?? fallback).slice(0, length);
const num = (v, fallback, min, max) => Number.isFinite(Number(v)) ? clamp(Number(v), min, max) : fallback;
const color = (v, fallback) => /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
export function normalizeWindow(value = {}) {
  const key = WINDOW_PRESETS.some(p => p.key === value.preset) ? value.preset : 'warning', base = windowPreset(key), v = { ...base, ...value };
  if (v.content === 'portrait') return { ...normalizeWindow({ ...v, content: 'text' }), content: 'portrait' };
  const lines = (input, fallback, count = 20) => Array.isArray(input) ? input.slice(0, count).map(s => text(s, '', 200)) : fallback;
  return { ...base, preset: key, theme: ['classic', 'xp'].includes(v.theme) ? v.theme : 'classic', content: ['text', 'image', 'progress', 'properties', 'explorer', 'terminal', 'bsod', 'input'].includes(v.content) ? v.content : 'text', icon: ['error', 'warning', 'info', 'question', 'folder', 'none'].includes(v.icon) ? v.icon : 'none', title: text(v.title, base.title, 120), text: text(v.text), titleBar: !!v.titleBar, close: !!v.close, minimize: !!v.minimize, maximize: !!v.maximize, menuBar: !!v.menuBar, statusBar: !!v.statusBar, status: text(v.status, '', 160), menus: lines(v.menus, base.menus, 6), tabs: lines(v.tabs, base.tabs, 6), tabTexts: lines(v.tabTexts, base.tabTexts, 6), rows: lines(v.rows, base.rows, 30), fields: lines(v.fields, base.fields, 8), buttons: Array.isArray(v.buttons) ? v.buttons.slice(0, 3).map(b => ({ label: text(b.label, 'OK', 40), action: WINDOW_ACTIONS[b.action] ? b.action : 'close', close: b.close !== false })) : base.buttons, progress: num(v.progress, 37, 0, 100), progressSpeed: num(v.progressSpeed, 0, 0, 25), response: text(v.response), heal: num(v.heal, 2, 0, 10000), mount: ['wall', 'floating'].includes(v.mount) ? v.mount : 'floating', facing: ['fixed', 'camera', 'player'].includes(v.facing) ? v.facing : 'camera', bob: num(v.bob, .08, 0, .5), watcher: !!v.watcher, imageFit: ['contain', 'cover', 'stretch'].includes(v.imageFit) ? v.imageFit : 'contain', titleColor: color(v.titleColor, base.titleColor), bodyColor: color(v.bodyColor, base.bodyColor), textColor: color(v.textColor, base.textColor) };
}
export function windowState(config) { return { closed: false, minimized: false, maximized: false, tab: 0, progress: config.progress, progressPaused: false, fields: [...config.fields] }; }
export function applyWindowControl(config, state, control) {
  if (control.action === 'close' && config.close) return { effect: 'close', close: true };
  if (control.action === 'minimize' && config.minimize) { state.minimized = !state.minimized; state.openMenu = null; }
  if (control.action === 'maximize' && config.maximize) { state.maximized = !state.maximized; state.minimized = false; state.openMenu = null; }
  if (control.action === 'tab') state.tab = clamp(control.index || 0, 0, Math.max(0, config.tabs.length - 1));
  if (control.action === 'field' && control.value !== undefined && state.fields[control.index] !== undefined) state.fields[control.index] = state.fields[control.index].split('=')[0] + '=' + text(control.value, '', 160);
  if (control.action === 'button') {
    const b = config.buttons[control.index]; if (!b) return null;
    if (b.action === 'pause') state.progressPaused = !state.progressPaused;
    return { effect: b.action, close: b.action === 'close' || b.close };
  }
  if (control.action === 'menu') { state.openMenu = state.openMenu === control.index ? null : control.index; return null; }
  if (control.action === 'about') { state.openMenu = null; return { effect: 'message', text: config.response || config.title, close: false }; }
  if (control.action === 'row') return { effect: 'message', text: config.rows[control.index], close: false };
  return null;
}
function bevel(ctx, x, y, w, h, pressed = false) {
  ctx.lineWidth = 2; ctx.strokeStyle = pressed ? '#535353' : '#fff'; ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();
  ctx.strokeStyle = pressed ? '#fff' : '#454545'; ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.stroke();
}
function wrap(ctx, value, x, y, width, maxY, line = 23) {
  for (const paragraph of String(value).split('\n')) {
    let current = '';
    for (const word of paragraph.split(' ')) {
      const candidate = current ? current + ' ' + word : word;
      if (ctx.measureText(candidate).width > width && current) { if (y > maxY) return; ctx.fillText(current, x, y); y += line; current = word; } else current = candidate;
    }
    if (y > maxY) return; ctx.fillText(current, x, y); y += line;
  }
}
function icon(ctx, kind, x, y) {
  if (kind === 'none') return;
  ctx.save(); ctx.lineWidth = 3;
  if (kind === 'warning') { ctx.fillStyle = '#ffdb39'; ctx.strokeStyle = '#191919'; ctx.beginPath(); ctx.moveTo(x + 22, y); ctx.lineTo(x + 45, y + 43); ctx.lineTo(x, y + 43); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#111'; ctx.font = 'bold 31px Arial'; ctx.fillText('!', x + 18, y + 35); }
  else if (kind === 'folder') { ctx.fillStyle = '#edca61'; ctx.fillRect(x, y + 8, 42, 31); ctx.fillRect(x + 3, y, 19, 12); ctx.strokeStyle = '#705c29'; ctx.strokeRect(x, y + 8, 42, 31); }
  else { ctx.fillStyle = kind === 'error' ? '#c92936' : '#246fc9'; ctx.beginPath(); ctx.arc(x + 22, y + 23, 22, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = 'bold 30px Arial'; ctx.fillText(kind === 'error' ? '×' : kind === 'question' ? '?' : 'i', x + (kind === 'error' ? 9 : 15), y + 34); }
  ctx.restore();
}
export function drawWindow(canvas, config, state = windowState(config), image = null, aspect = 1.6) {
  const W = 640, fullH = clamp(Math.round(W / aspect), 200, 720), headerH = config.theme === 'xp' ? 40 : 34;
  canvas.width = W; canvas.height = state.minimized ? headerH + 8 : fullH;
  const H = canvas.height, ctx = canvas.getContext('2d'), regions = [], add = (x, y, w, h, action, index) => regions.push({ x, y, w, h, action, index });
  ctx.fillStyle = config.bodyColor; if (config.theme === 'xp') { ctx.beginPath(); ctx.roundRect(0, 0, W, H, 9); ctx.fill(); } else ctx.fillRect(0, 0, W, H); bevel(ctx, 1, 1, W - 2, H - 2);
  let top = 7;
  if (config.titleBar || state.minimized) {
    const gradient = ctx.createLinearGradient(0, 0, W, 0); gradient.addColorStop(0, config.titleColor); gradient.addColorStop(1, config.theme === 'xp' ? '#4d96ed' : '#16769b'); ctx.fillStyle = gradient; ctx.fillRect(5, 5, W - 10, headerH);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Tahoma,Arial'; const count = Number(config.close) + Number(config.minimize) + Number(config.maximize);
    ctx.save(); ctx.beginPath(); ctx.rect(14, 7, W - 35 - count * 29, headerH); ctx.clip(); ctx.fillText(config.title, 14, 5 + headerH * .67); ctx.restore();
    let x = W - 32;
    for (const action of ['close', 'maximize', 'minimize']) if (config[action]) {
      ctx.fillStyle = config.theme === 'xp' ? action === 'close' ? '#c54a36' : '#2566c9' : '#c0c0c0'; ctx.fillRect(x, 10, 24, headerH - 10); bevel(ctx, x, 10, 24, headerH - 10);
      ctx.strokeStyle = config.theme === 'xp' ? '#fff' : '#111'; ctx.lineWidth = 2; const cy = 10 + (headerH - 10) / 2;
      if (action === 'close') { ctx.beginPath(); ctx.moveTo(x + 7, cy - 5); ctx.lineTo(x + 17, cy + 5); ctx.moveTo(x + 17, cy - 5); ctx.lineTo(x + 7, cy + 5); ctx.stroke(); }
      else if (action === 'minimize' && !state.minimized) { ctx.beginPath(); ctx.moveTo(x + 6, cy + 6); ctx.lineTo(x + 18, cy + 6); ctx.stroke(); }
      else { if (state.maximized || action === 'minimize') ctx.strokeRect(x + 9, cy - 7, 10, 9); ctx.strokeRect(x + 5, cy - 4, 12, 10); }
      add(x, 10, 24, headerH - 10, action); x -= 29;
    }
    top = headerH + 13;
  }
  if (state.minimized) return { regions, ratio: H / fullH };
  if (config.menuBar) { ctx.fillStyle = config.textColor; ctx.font = '14px Tahoma,Arial'; let x = 16; config.menus.forEach((menu, i) => { const w = ctx.measureText(menu).width + 22; ctx.fillText(menu, x, top + 16); add(x - 4, top, w, 25, 'menu', i); x += w; }); top += 29; }
  let bottom = H - 15;
  if (config.statusBar) { ctx.fillStyle = config.bodyColor; ctx.fillRect(7, H - 29, W - 14, 23); bevel(ctx, 7, H - 29, W - 14, 23, true); ctx.fillStyle = config.textColor; ctx.font = '12px Tahoma,Arial'; ctx.fillText(config.status, 15, H - 12); bottom -= 30; }
  if (config.buttons.length) {
    const buttonW = Math.min(155, (W - 70) / config.buttons.length), gap = 12, total = config.buttons.length * buttonW + (config.buttons.length - 1) * gap;
    config.buttons.forEach((b, i) => { const x = (W - total) / 2 + i * (buttonW + gap), y = bottom - 37; ctx.fillStyle = config.theme === 'xp' ? '#eeede7' : '#c0c0c0'; ctx.fillRect(x, y, buttonW, 31); bevel(ctx, x, y, buttonW, 31); ctx.fillStyle = '#111'; ctx.font = '14px Tahoma,Arial'; const label = b.action === 'pause' && state.progressPaused ? 'Retomar' : b.label; ctx.fillText(label, x + Math.max(6, (buttonW - ctx.measureText(label).width) / 2), y + 21); add(x, y, buttonW, 31, 'button', i); }); bottom -= 54;
  }
  const content = config.content;
  ctx.fillStyle = config.textColor; ctx.font = '16px Tahoma,Arial';
  if (content === 'portrait') {
    const x = 28, y = top + 23;
    if (image?.naturalWidth) ctx.drawImage(image, x, y, 78, 78);
    else { ctx.fillStyle = '#f0e7dc'; ctx.beginPath(); ctx.ellipse(x + 40, y + 49, 32, 27, 0, 0, 7); ctx.fill(); ctx.fillRect(x + 18, y, 13, 35); ctx.fillRect(x + 49, y, 13, 35); ctx.fillStyle = '#d792b0'; ctx.fillRect(x + 21, y + 5, 6, 23); ctx.fillRect(x + 52, y + 5, 6, 23); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x + 28, y + 48, 8, 0, 7); ctx.arc(x + 52, y + 48, 8, 0, 7); ctx.fill(); }
    ctx.fillStyle = config.textColor; wrap(ctx, config.text, 125, y + 35, W - 150, bottom - 5);
  } else if (content === 'image') {
    const rect = { x: 13, y: top + 3, w: W - 26, h: Math.max(30, bottom - top - 5) }; ctx.fillStyle = '#09110e'; ctx.fillRect(rect.x, rect.y, rect.w, rect.h); bevel(ctx, rect.x, rect.y, rect.w, rect.h, true);
    if (image?.naturalWidth || image?.width) {
      const iw = image.naturalWidth || image.width, ih = image.naturalHeight || image.height, scale = config.imageFit === 'cover' ? Math.max(rect.w / iw, rect.h / ih) : Math.min(rect.w / iw, rect.h / ih);
      ctx.save(); ctx.beginPath(); ctx.rect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4); ctx.clip(); ctx.imageSmoothingEnabled = false;
      if (config.imageFit === 'stretch') ctx.drawImage(image, rect.x, rect.y, rect.w, rect.h); else ctx.drawImage(image, rect.x + (rect.w - iw * scale) / 2, rect.y + (rect.h - ih * scale) / 2, iw * scale, ih * scale); ctx.restore();
    } else { ctx.fillStyle = '#8eb9ac'; ctx.font = '16px monospace'; ctx.fillText('IMPORTE UMA IMAGEM NO MATERIAL', 35, top + 45); }
  } else if (content === 'progress') {
    wrap(ctx, config.text, 26, top + 35, W - 52, bottom - 90); const y = Math.max(top + 65, bottom - 75), pct = state.progress ?? config.progress;
    ctx.fillStyle = '#eee'; ctx.fillRect(26, y, W - 52, 28); bevel(ctx, 26, y, W - 52, 28, true); ctx.fillStyle = config.theme === 'xp' ? '#4aa042' : '#000080'; ctx.fillRect(30, y + 4, (W - 60) * pct / 100, 20); ctx.fillStyle = config.textColor; ctx.fillText(`${Math.round(pct)}%${state.progressPaused ? ' / pausado' : ''}`, 26, y + 54);
  } else if (content === 'properties' || content === 'input') {
    if (content === 'properties') { let x = 15; config.tabs.forEach((tab, i) => { const w = Math.max(85, ctx.measureText(tab).width + 24); ctx.fillStyle = i === state.tab ? '#efefea' : '#adada9'; ctx.fillRect(x, top, w, 27); bevel(ctx, x, top, w, 27); ctx.fillStyle = '#111'; ctx.font = '14px Tahoma,Arial'; ctx.fillText(tab, x + 10, top + 19); add(x, top, w, 27, 'tab', i); x += w + 2; }); top += 40; wrap(ctx, config.tabTexts[state.tab] || config.text, 26, top + 16, W - 52, top + 45, 20); top += 57; }
    else { wrap(ctx, config.text, 26, top + 24, W - 52, top + 45); top += 60; }
    (state.fields || config.fields).forEach((field, i) => { const [label, ...value] = field.split('='); if (top + 26 > bottom) return; ctx.fillStyle = '#111'; ctx.font = '14px Tahoma,Arial'; ctx.fillText(label, 25, top + 19); ctx.fillStyle = '#fff'; ctx.fillRect(190, top, W - 215, 28); bevel(ctx, 190, top, W - 215, 28, true); ctx.fillStyle = '#111'; ctx.fillText(value.join('='), 199, top + 19); add(190, top, W - 215, 28, 'field', i); top += 40; });
  } else if (content === 'explorer') {
    ctx.fillStyle = '#eee'; ctx.fillRect(13, top, W - 26, bottom - top); bevel(ctx, 13, top, W - 26, bottom - top, true); ctx.fillStyle = '#d7d8d3'; ctx.fillRect(16, top + 3, 165, bottom - top - 6); ctx.fillStyle = '#222'; ctx.font = '14px Tahoma,Arial'; ['▸ Meu computador', '  ▸ C: / PALACE', '    ▸ ARCHIVE', '    ▸ CACHE'].forEach((v, i) => ctx.fillText(v, 23, top + 28 + i * 27));
    config.rows.forEach((row, i) => { const y = top + 25 + i * 27; if (y < bottom - 10) { ctx.fillStyle = '#2c4684'; ctx.fillText('▧', 198, y); ctx.fillStyle = '#151515'; ctx.fillText(row, 222, y); add(190, y - 20, W - 210, 26, 'row', i); } });
  } else if (content === 'terminal' || content === 'bsod') {
    ctx.fillStyle = config.bodyColor; ctx.fillRect(8, top, W - 16, bottom - top); ctx.fillStyle = config.textColor; ctx.font = '16px Consolas,monospace'; wrap(ctx, config.text, 22, top + 25, W - 44, bottom, 24);
  } else { icon(ctx, config.icon, 27, top + 28); ctx.fillStyle = config.textColor; const left = config.icon === 'none' ? 26 : 92; wrap(ctx, config.text, left, top + 49, W - left - 27, bottom - 6); }
  if (state.openMenu !== null && state.openMenu !== undefined && config.menuBar) {
    const anchor = regions.find(r => r.action === 'menu' && r.index === state.openMenu);
    if (anchor) {
      const entries = [...(config.close ? [['Fechar janela', 'close']] : []), ...(config.minimize ? [['Minimizar', 'minimize']] : []), ...(config.maximize ? [['Maximizar / restaurar', 'maximize']] : []), ['Sobre o processo', 'about']];
      const x = Math.min(anchor.x, W - 220), y = anchor.y + anchor.h; ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x, y, 212, entries.length * 28 + 8); bevel(ctx, x, y, 212, entries.length * 28 + 8);
      ctx.fillStyle = '#111'; ctx.font = '14px Tahoma,Arial'; entries.forEach(([label, action], i) => { ctx.fillText(label, x + 10, y + 23 + i * 28); add(x + 3, y + 3 + i * 28, 206, 27, action); });
    }
  }
  return { regions, ratio: 1 };
}

export function buildSystemWindow(entity, imageSource = null) {
  const root = new THREE.Group(), config = entity.window, canvas = document.createElement('canvas'), state = windowState(config);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.magFilter = THREE.NearestFilter;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: entity.material.opacity < 1, opacity: entity.material.opacity, alphaTest: .01, toneMapped: false, color: entity.material.color })); face.position.z = -.52; face.rotation.y = Math.PI; face.userData.windowFace = true;
  const back = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#343849', roughness: .7, transparent: entity.material.opacity < 1, opacity: entity.material.opacity })); back.castShadow = true; root.add(back, face);
  const data = { canvas, texture, face, back, state, layout: null, image: null, imageSource, disposed: false }; root.userData.systemWindow = data;
  data.repaint = newState => { data.state = newState; data.layout = drawWindow(canvas, config, newState, data.image, entity.size[0] / entity.size[1]); texture.needsUpdate = true; };
  data.repaint(state);
  if (imageSource) { const image = new Image(); image.onload = () => { if (data.disposed) return; data.image = image; data.repaint(data.state); }; image.src = imageSource; }
  return root;
}
export function orientSystemWindow(root, entity, camera, time = 0, state = root.userData.systemWindow.state, target = null) {
  const w = entity.window, ratio = root.userData.systemWindow.layout.ratio, scale = state.maximized ? 1.6 : 1;
  root.visible = entity.visible && !state.closed; root.position.fromArray(entity.position); root.scale.set(entity.size[0] * scale, entity.size[1] * scale * ratio, entity.size[2]); root.rotation.set(0, entity.rotation, 0);
  if (w.mount === 'floating') root.position.y += Math.sin(time * 1.5 + entity.position[0]) * w.bob;
  if (w.facing !== 'fixed') { const point = w.facing === 'player' && target ? target : camera.position; root.rotation.y = Math.atan2(-(point.x - root.position.x), -(point.z - root.position.z)); }
  if (state.minimized) root.position.y += entity.size[1] * scale * (1 - ratio) / 2;
  root.updateMatrixWorld(true);
}
export function windowControlAt(root, hit) {
  const data = root.userData.systemWindow; if (!hit?.object.userData.windowFace || !data) return null;
  const x = hit.uv.x * data.canvas.width, y = (1 - hit.uv.y) * data.canvas.height;
  return [...data.layout.regions].reverse().find(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) || null;
}

// Both editor preview and gameplay use the same painted controls and hit regions.
export class WindowPanel {
  constructor({ parent, onControl, onDismiss }) {
    this.onControl = onControl; this.onDismiss = onDismiss; this.isOpen = false;
    this.element = document.createElement('section'); this.element.className = 'system-window-panel hidden'; this.element.setAttribute('role', 'dialog'); this.element.setAttribute('aria-modal', 'true'); this.element.setAttribute('aria-label', 'Janela de Windows');
    this.element.innerHTML = '<div class="system-window-card"><div class="system-window-help"><span>CONTROLES INTERATIVOS / WINDOWS</span><button class="window-dismiss">Voltar ao jogo / ESC</button></div><canvas class="system-window-canvas"></canvas><div class="system-window-fields"></div><div class="system-window-accessible"></div></div>';
    parent.append(this.element); this.element.querySelector('.window-dismiss').onclick = () => this.close();
    this.element.querySelector('canvas').onclick = event => { const c = event.currentTarget, rect = c.getBoundingClientRect(), x = (event.clientX - rect.left) / rect.width * c.width, y = (event.clientY - rect.top) / rect.height * c.height; const region = [...this.root.userData.systemWindow.layout.regions].reverse().find(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h); if (region) this.onControl(region); };
  }
  open(root, entity) { this.root = root; this.entity = entity; this.isOpen = true; this.element.classList.remove('hidden'); this.render(); this.element.querySelector('.window-dismiss').focus(); }
  render() {
    if (!this.isOpen) return; const data = this.root.userData.systemWindow, canvas = this.element.querySelector('canvas'); canvas.width = data.canvas.width; canvas.height = data.canvas.height; canvas.getContext('2d').drawImage(data.canvas, 0, 0); this.element.dataset.theme = this.entity.window.theme;
    this.element.querySelector('.system-window-card').classList.toggle('maximized', data.state.maximized);
    const accessible = this.element.querySelector('.system-window-accessible'); accessible.replaceChildren();
    const labels = { close: 'Fechar janela', minimize: data.state.minimized ? 'Restaurar janela' : 'Minimizar', maximize: data.state.maximized ? 'Restaurar tamanho' : 'Maximizar', about: 'Sobre o processo' };
    for (const region of data.layout.regions.filter(r => ['close', 'minimize', 'maximize', 'button', 'tab', 'menu', 'about'].includes(r.action))) {
      const b = document.createElement('button'); b.textContent = labels[region.action] || (region.action === 'menu' ? this.entity.window.menus[region.index] : region.action === 'tab' ? this.entity.window.tabs[region.index] : this.entity.window.buttons[region.index].action === 'pause' && data.state.progressPaused ? 'Retomar' : this.entity.window.buttons[region.index].label); b.onclick = () => this.onControl(region); accessible.append(b);
    }
    const fields = this.element.querySelector('.system-window-fields'); fields.replaceChildren();
    if (!data.state.minimized && ['properties', 'input'].includes(this.entity.window.content)) data.state.fields.forEach((field, index) => { const [name, ...value] = field.split('='), label = document.createElement('label'), input = document.createElement('input'); label.textContent = name; input.value = value.join('='); input.onchange = () => this.onControl({ action: 'field', index, value: input.value }); label.append(input); fields.append(label); });
  }
  close(silent = false) { if (!this.isOpen) return; this.isOpen = false; this.element.classList.add('hidden'); if (!silent) this.onDismiss?.(); }
  dispose() { this.close(true); this.element.remove(); }
}
