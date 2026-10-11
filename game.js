import * as THREE from './node_modules/three/build/three.module.js';
import { PlayerMotion } from './player-motion.js';
import { Inventory, InventoryPanel } from './inventory.js';

const $ = id => document.getElementById(id);
const clamp = THREE.MathUtils.clamp;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0b1918');
scene.fog = new THREE.FogExp2('#122724', .027);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, .08, 110);
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' }); }
catch { $('loading').textContent = 'Não foi possível iniciar o 3D. Ative a aceleração de hardware do navegador.'; throw new Error('WebGL indisponível'); }
renderer.setPixelRatio(Math.min(devicePixelRatio, 1) * .85);
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('game').append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xb5d3bf, 0x17231c, 1.35));
const overhead = new THREE.DirectionalLight(0xb4d7cb, 2.4);
overhead.position.set(5, 18, 10);
overhead.castShadow = true;
overhead.shadow.mapSize.set(1024, 1024);
overhead.shadow.camera.left = -32; overhead.shadow.camera.right = 32;
overhead.shadow.camera.top = 20; overhead.shadow.camera.bottom = -48;
overhead.shadow.camera.far = 80; overhead.shadow.bias = -.001;
scene.add(overhead);

// The whole sector is handmade: walkable volumes, height-aware collision and a real upper route.
const solids = [], cameraSolids = [], surfaces = [], interactables = [], lights = [], floppies = [], monitors = [];
const rng = (() => { let s = 981998; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; })();
function texture(draw, size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d'); draw(ctx, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function grit(ctx, s, n = 1500, color = '#07130c') {
  ctx.fillStyle = color; ctx.globalAlpha = .22;
  for (let i = 0; i < n; i++) ctx.fillRect(rng() * s, rng() * s, 1 + rng() * 3, 1 + rng() * 3);
  ctx.globalAlpha = 1;
}
const brickTex = texture((c, s) => {
  c.fillStyle = '#26362b'; c.fillRect(0, 0, s, s);
  for (let y = 0; y < s; y += 16) for (let x = -32; x < s; x += 32) {
    c.fillStyle = ['#4b6050', '#3c5142', '#56634a'][Math.floor(rng() * 3)];
    c.fillRect(x + (y % 32 ? 16 : 0), y, 30, 14);
    c.fillStyle = '#6f766055'; c.fillRect(x + (y % 32 ? 16 : 0), y, 30, 1);
  }
  grit(c, s);
});
const tileTex = texture((c, s) => {
  c.fillStyle = '#273936'; c.fillRect(0, 0, s, s);
  for (let y = 0; y < s; y += 32) for (let x = 0; x < s; x += 32) {
    c.fillStyle = rng() > .5 ? '#667b6c' : '#425950'; c.fillRect(x + 1, y + 1, 30, 30);
    c.strokeStyle = '#97a48655'; c.strokeRect(x + 2, y + 2, 28, 28);
  }
  grit(c, s, 1300);
});
const yellowTex = texture((c, s) => {
  c.fillStyle = '#a58b4d'; c.fillRect(0, 0, s, s);
  for (let y = 0; y < s; y += 16) for (let x = 0; x < s; x += 16) {
    c.fillStyle = '#776b3b'; c.beginPath(); c.ellipse(x + 8, y + 8, 3, 5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#c8b074'; c.fillRect(x + 7, y + 5, 2, 5);
  }
  grit(c, s, 800, '#393b23');
});
const dressTex = texture((c, s) => {
  c.fillStyle = '#d681a1'; c.fillRect(0, 0, s, s);
  for (let i = 0; i < s; i += 16) {
    c.fillStyle = '#f9ced680'; c.fillRect(i, 0, 8, s); c.fillRect(0, i, s, 8);
    c.fillStyle = '#ab4f7540'; c.fillRect(i + 11, 0, 2, s); c.fillRect(0, i + 11, s, 2);
  }
  grit(c, s, 500, '#eccbd2');
});
function mapped(tex, rx, ry, extra = {}) {
  const t = tex.clone(); t.repeat.set(rx, ry);
  return new THREE.MeshStandardMaterial({ map: t, roughness: .85, ...extra });
}
const metal = new THREE.MeshStandardMaterial({ color: '#384c44', roughness: .66, metalness: .55 });
const dark = new THREE.MeshStandardMaterial({ color: '#0d1a17', roughness: .8 });
const cream = new THREE.MeshStandardMaterial({ color: '#e8e6d8', roughness: .9, flatShading: true });
const rose = new THREE.MeshStandardMaterial({ color: '#d581a6', roughness: .95, flatShading: true });
const black = new THREE.MeshStandardMaterial({ color: '#090c0c', roughness: .6 });
function mesh(geo, mat, x = 0, y = 0, z = 0, parent = scene) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function box(x, y, z, w, h, d, mat = metal, collide = false, parent = scene) {
  const m = mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
  if (collide) {
    solids.push({ x1: x - w / 2, x2: x + w / 2, z1: z - d / 2, z2: z + d / 2, y1: y - h / 2, y2: y + h / 2, mesh: m, active: true });
    cameraSolids.push(m);
  }
  return m;
}
function wall(x, z, w, d, h = 7, tex = brickTex, y = 0) {
  return box(x, y + h / 2, z, w, h, d, mapped(tex, Math.max(w, d) / 3, h / 3), true);
}
function surface(x1, x2, z1, z2, y = 0, name = '', ramp = null) {
  surfaces.push({ x1, x2, z1, z2, y, name, ramp });
  const mat = mapped(tileTex, (x2 - x1) / 3, (z2 - z1) / 3, { roughness: .28, metalness: .32 });
  if (!ramp) cameraSolids.push(box((x1 + x2) / 2, y - .17, (z1 + z2) / 2, x2 - x1, .3, z2 - z1, mat));
  else {
    const length = Math.hypot(z2 - z1, ramp.top - ramp.bottom);
    const m = mesh(new THREE.BoxGeometry(x2 - x1, .2, length), mat, (x1 + x2) / 2, (ramp.top + ramp.bottom) / 2 - .1, (z1 + z2) / 2);
    m.rotation.x = Math.atan2(ramp.top - ramp.bottom, z2 - z1);
    for (let i = 0; i < 13; i++) {
      const z = z2 - (i + .5) / 13 * (z2 - z1), yy = (i + .5) / 13 * ramp.top;
      box((x1 + x2) / 2, yy + .02, z, x2 - x1, .035, .08, metal);
    }
  }
}
surface(-12, 12, -12, 14, 0, 'ÁTRIO DE BUFFER');
surface(-5, 5, -35, -12, 0, 'CORREDORES SUBMERSOS');
surface(-28, -12, -8, 8, 0, 'SALAS AMARELAS');
surface(12, 29, -8, 8, 0, 'ARQUIVO MORTO');
surface(-28, -24, -24, -8, 0, 'COSTURA DE MEMÓRIA');
surface(-34, -24, -24, -16, 0, 'CACHE ESQUECIDO');
surface(-8, 8, -44, -35, 0, 'TERMINAL DE EJEÇÃO');
surface(-11.5, -7, 4, 12, 0, 'ESCADARIA DE BUFFER', { top: 3.2, bottom: 0 });
surface(-12, -7, -12, 4, 3.2, 'PASSARELA SUPERIOR');
surface(-7, 12, -12, -8, 3.2, 'PASSARELA SUPERIOR');
surface(8, 12, -8, 12, 3.2, 'PASSARELA SUPERIOR');
wall(0, 14.3, 24.6, .6);
wall(-12.3, -8.15, .6, 8.3); wall(-12.3, 9.15, .6, 10.3);
wall(12.3, -8.15, .6, 8.3); wall(12.3, 9.15, .6, 10.3);
wall(-8.6, -12.3, 7.4, .6); wall(8.6, -12.3, 7.4, .6);
wall(-5.3, -23.5, .6, 22.4); wall(5.3, -23.5, .6, 22.4);
wall(-28.3, 0, .6, 16.6, 5, yellowTex); wall(-20, 8.3, 16, .6, 5, yellowTex);
wall(-18, -8.3, 12, .6, 5, yellowTex);
wall(29.3, 0, .6, 16.6); wall(20.5, -8.3, 17, .6); wall(20.5, 8.3, 17, .6);
wall(-28.3, -12, .6, 8); wall(-23.7, -16, .6, 16);
wall(-29, -24.3, 10.6, .6); wall(-34.3, -20, .6, 8.6); wall(-31.3, -15.7, 6, .6);
wall(-8.3, -39.5, .6, 9.6); wall(8.3, -39.5, .6, 9.6); wall(0, -44.3, 16, .6);
wall(-6.7, -35.3, 3.4, .6); wall(6.7, -35.3, 3.4, .6);
const gate = wall(0, -35.3, 10, .65, 5.2);
const gateSolid = solids.at(-1);
const falseWall = box(-26, 2.5, -8.3, 4, 5, .3, mapped(yellowTex, 1.35, 1.7));
falseWall.material.transparent = true; falseWall.material.opacity = .92;

function railing(x1, z1, x2, z2, y) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  const g = new THREE.Group(); scene.add(g); g.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
  g.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
  box(0, 1, 0, len, .09, .09, metal, false, g); box(0, .5, 0, len, .06, .06, metal, false, g);
  for (let i = 0; i <= len / 1.5; i++) box(-len / 2 + i * 1.5, .5, 0, .07, 1, .07, metal, false, g);
  if (Math.abs(x2 - x1) < .1) box(x1, y + .5, (z1 + z2) / 2, .16, 1, len, new THREE.MeshBasicMaterial({ visible: false }), true);
  else if (Math.abs(z2 - z1) < .1) box((x1 + x2) / 2, y + .5, z1, len, 1, .16, new THREE.MeshBasicMaterial({ visible: false }), true);
}
railing(-7, -8, -7, 4, 3.2); railing(-7, -8, 8, -8, 3.2); railing(8, -8, 8, 12, 3.2); railing(8, 12, 12, 12, 3.2);
for (const x of [-10, 10]) for (const z of [-10, 10]) {
  box(x, 3.6, z, .8, 7.2, .8, mapped(brickTex, .3, 2.4), true);
  box(x, 7.1, z, 1.3, .3, 1.3, metal);
}
for (const z of [-16, -24, -32]) {
  box(0, 6.8, z, 11, .4, .4, metal);
  for (const x of [-4.6, 4.6]) {
    const p = mesh(new THREE.CylinderGeometry(.18, .18, 6.4, 8), metal, x, 3.2, z);
    p.castShadow = false;
  }
}
function light(x, y, z, color, intensity = 18, distance = 12) {
  const l = new THREE.PointLight(color, intensity, distance, 2); l.position.set(x, y, z); scene.add(l); lights.push(l); return l;
}
function lamp(x, y, z, color = '#a9f0d4', length = 2.5) {
  box(x, y + .08, z, length + .2, .16, .42, dark);
  const m = new THREE.MeshBasicMaterial({ color }); box(x, y, z, length, .07, .24, m);
  return light(x, y - .3, z, color, 22, 13);
}
for (const z of [9, -1, -10, -18, -27, -33]) lamp(0, 6.4, z);
lamp(-20, 4.8, 0, '#ffdd8d', 4); lamp(-30, 4.5, -20, '#e3adcf');
lamp(21, 6, 0, '#d091c4', 3); lamp(0, 6, -40, '#76dce5', 4);
lamp(10, 6.3, 4, '#f4c58c', 2);

// Labels and screens are texture objects within the world, not HUD stickers.
function label(text, x, y, z, { color = '#b8d4b6', bg = '#11201b', width = 4, height = .7, rotation = 0 } = {}) {
  const t = texture((c, s) => {
    c.fillStyle = bg; c.fillRect(0, 0, s, s);
    c.strokeStyle = color; c.strokeRect(4, 39, s - 8, 50);
    c.fillStyle = color; c.font = `bold ${Math.min(15, 185 / text.length)}px monospace`; c.textAlign = 'center'; c.fillText(text, s / 2, 69);
  }, 256);
  const m = mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }), x, y, z);
  m.rotation.y = rotation; m.castShadow = false; return m;
}
label('THE PALACE', 0, 5.4, -12.65, { width: 7, height: 2 });
label('01 / BUFFER', 0, 2.8, 13.96, { width: 4, height: 1.2, rotation: Math.PI });
label('ARCHIVE →', 11.94, 2.6, 5.8, { rotation: -Math.PI / 2, width: 3, height: 1 });
label('← YELLOW ROOMS', -11.94, 2.6, 5.8, { rotation: Math.PI / 2, width: 3, height: 1 });
label('COB_01.EXE / EXIT', 0, 4.3, -34.94, { color: '#ffcf86', width: 5, height: 1.4 });
label('404', 4.94, 2, -29, { rotation: -Math.PI / 2, color: '#db9cc3', width: 1.8, height: 1.5 });
const eyeTex = texture((c, s) => {
  c.fillStyle = '#27182d'; c.fillRect(0, 0, s, s);
  c.fillStyle = '#bb7197'; c.beginPath(); c.moveTo(8, 64); c.quadraticCurveTo(64, 8, 120, 64); c.quadraticCurveTo(64, 120, 8, 64); c.fill();
  c.fillStyle = '#ece2cf'; c.beginPath(); c.ellipse(64, 64, 48, 23, 0, 0, 7); c.fill();
  c.fillStyle = '#358db0'; c.beginPath(); c.arc(64, 64, 24, 0, 7); c.fill();
  for (let i = 0; i < 80; i++) { const a = i / 80 * Math.PI * 2; c.strokeStyle = i % 2 ? '#092d50' : '#7bc9c2'; c.beginPath(); c.moveTo(64 + Math.cos(a) * 11, 64 + Math.sin(a) * 11); c.lineTo(64 + Math.cos(a) * 23, 64 + Math.sin(a) * 23); c.stroke(); }
  c.fillStyle = '#080b18'; c.beginPath(); c.arc(64, 64, 12, 0, 7); c.fill(); c.fillStyle = '#fff'; c.fillRect(57, 53, 7, 7); grit(c, s, 350);
});
const lipsTex = texture((c, s) => {
  c.fillStyle = '#1e1d34'; c.fillRect(0, 0, s, s); c.fillStyle = '#e667a0';
  c.beginPath(); c.moveTo(10, 65); c.bezierCurveTo(45, 25, 54, 52, 64, 45); c.bezierCurveTo(88, 30, 99, 52, 118, 65); c.bezierCurveTo(83, 109, 44, 96, 10, 65); c.fill();
  c.fillStyle = '#1a101b'; c.beginPath(); c.ellipse(64, 66, 40, 7, 0, 0, 7); c.fill(); grit(c, s, 600, '#c1afbc');
});
const teethTex = texture((c, s) => {
  c.fillStyle = '#926961'; c.fillRect(0, 0, s, s); grit(c, s, 1500, '#ab1938');
  c.fillStyle = '#551a26'; c.beginPath(); c.ellipse(64, 64, 57, 40, 0, 0, 7); c.fill();
  c.fillStyle = '#0d0b12'; c.fillRect(14, 42, 100, 47);
  for (let i = 0; i < 8; i++) { c.fillStyle = i % 3 ? '#ddc4a7' : '#b59780'; c.fillRect(16 + i * 12, 39, 10, 21 + rng() * 4); c.fillRect(16 + i * 12, 66, 10, 20); }
});
function monitor(x, y, z, kind = 'eye', rot = 0, active = true) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot; scene.add(g);
  box(0, 0, 0, 1.25, 1, .48, dark, false, g);
  box(0, .35, .25, 1.13, .15, .02, new THREE.MeshBasicMaterial({ color: '#293d82' }), false, g);
  const face = mesh(new THREE.PlaneGeometry(1.05, .7), new THREE.MeshBasicMaterial({ map: kind === 'eye' ? eyeTex : lipsTex, color: active ? '#ccdfe4' : '#22352c' }), 0, -.04, .255, g);
  label('•', x, y, z);
  const obj = { group: g, face, kind, enabled: active, pos: new THREE.Vector3(x, y - .6, z) }; monitors.push(obj);
  if (kind === 'eye' && active) interactables.push({ pos: obj.pos, radius: 2.4, text: 'Desligar Watcher', action: () => {
    obj.enabled = false; face.material.color.set('#20342b'); audio.blip(110, .2); state.noise = Math.max(0, state.noise - 25); toast('WATCHER OFFLINE — a vigilância perdeu um olho.');
  }, available: () => obj.enabled });
  return obj;
}
monitor(-4.95, 2.6, -18, 'eye', Math.PI / 2);
monitor(4.95, 2.6, -25, 'eye', -Math.PI / 2);
monitor(-27.9, 2.5, 1, 'eye', Math.PI / 2);
monitor(-18, 2.5, -7.92, 'lips');
monitor(28.94, 2.5, -3, 'lips', -Math.PI / 2);
monitor(12, 4.9, -7, 'eye', -Math.PI / 2);

// Wet patches and reflected light streaks: inexpensive, animated, deliberately low resolution.
const waterTex = texture((c, s) => {
  c.fillStyle = '#5c8c81'; c.fillRect(0, 0, s, s);
  for (let i = 0; i < 170; i++) { c.fillStyle = rng() > .5 ? '#b8d1a655' : '#132c2855'; c.fillRect(rng() * s, rng() * s, 3 + rng() * 28, 1); }
});
waterTex.repeat.set(5, 9);
const waterMat = new THREE.MeshStandardMaterial({ map: waterTex, color: '#678f86', roughness: .08, metalness: .7, transparent: true, opacity: .37, depthWrite: false });
const water = mesh(new THREE.PlaneGeometry(12.5, 25.5), waterMat, .3, .025, .7); water.rotation.x = -Math.PI / 2; water.castShadow = false;
const glints = [];
for (let i = 0; i < 120; i++) {
  const m = mesh(new THREE.PlaneGeometry(.08 + rng() * .6, .04 + rng() * .18), new THREE.MeshBasicMaterial({ color: i % 4 === 0 ? '#b67a9e' : '#a0d1c2', transparent: true, opacity: .25, depthWrite: false }), (rng() - .5) * 10, .034, -29 + rng() * 42);
  m.rotation.x = -Math.PI / 2; m.castShadow = false; glints.push(m);
}
function crate(x, z, w = 1.5, h = 1.5, y = 0) {
  const mat = new THREE.MeshStandardMaterial({ color: '#665944', roughness: 1 });
  box(x, y + h / 2, z, w, h, w, mat, true);
  for (const yy of [.15, h - .15]) box(x, y + yy, z + w / 2 + .02, w, .09, .06, metal);
}
crate(-5.8, 1, 1.5, 1.2); crate(4.7, -5, 1.8, 1.8); crate(3.2, -20, 1.2, 1.2); crate(-3.1, -28, 1.3, 1.7);
crate(-18, 5, 2, 1.2); crate(24, 5, 1.6, 1.3); crate(10.6, -5, 1, 1, 3.2);
for (let x = 16; x < 28; x += 4) {
  box(x, 2.1, -6.6, 2.7, 4.2, 1, dark, true);
  for (let y = .55; y < 4.1; y += .7) {
    box(x, y, -6.04, 2.7, .08, .15, metal);
    for (let k = 0; k < 8; k++) box(x - 1.15 + k * .3, y + .23, -6.35, .19, .37 + rng() * .15, .4, new THREE.MeshStandardMaterial({ color: ['#6b7054', '#83545b', '#657f78', '#9a885c'][k % 4] }));
  }
}
for (let i = 0; i < 6; i++) {
  const x = -14 - (i % 3) * 4.8, z = i < 3 ? -4.8 : 4.8;
  box(x, 2.5, z, .65, 5, 1.5, mapped(yellowTex, .3, 2), true);
}
// Hanging cables bend rather than floating abstract ornaments.
for (let i = 0; i < 12; i++) {
  const x = -11 + i * 2, z = -11 + rng() * 18;
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x, 7.5, z), new THREE.Vector3(x + 1, 5 + rng(), z + 2), new THREE.Vector3(x + 3, 7.5, z + 4)]);
  mesh(new THREE.TubeGeometry(curve, 12, .035, 4, false), black);
}

function heartShape() {
  const s = new THREE.Shape(); s.moveTo(0, -.35); s.bezierCurveTo(-.65, .08, -.45, .7, 0, .4); s.bezierCurveTo(.45, .7, .65, .08, 0, -.35); return s;
}
function bunnyModel() {
  const g = new THREE.Group();
  const dress = mapped(dressTex, 2, 1);
  mesh(new THREE.CylinderGeometry(.28, .57, .8, 8), dress, 0, .85, 0, g);
  mesh(new THREE.SphereGeometry(.58, 12, 8), cream, 0, 1.7, 0, g).scale.set(1.07, .97, .9);
  const ears = [];
  for (const sign of [-1, 1]) {
    const ear = mesh(new THREE.CapsuleGeometry(.13, .46, 3, 6), cream, sign * .23, 2.34, 0, g); ear.rotation.z = -sign * .08; ears.push(ear);
    mesh(new THREE.CapsuleGeometry(.07, .36, 3, 6), rose, sign * .23, 2.34, -.105, g);
    mesh(new THREE.SphereGeometry(.14, 10, 8), black, sign * .21, 1.72, -.475, g).scale.set(1, 1.2, .5);
    mesh(new THREE.SphereGeometry(.025, 6, 4), cream, sign * .21 - .035, 1.77, -.54, g);
    mesh(new THREE.SphereGeometry(.09, 8, 4), rose, sign * .39, 1.53, -.4, g).scale.set(1.25, .58, .2);
  }
  mesh(new THREE.SphereGeometry(.037, 6, 4), black, 0, 1.53, -.515, g);
  const arms = [], legs = [];
  for (const sign of [-1, 1]) {
    const a = mesh(new THREE.CapsuleGeometry(.085, .33, 3, 6), cream, sign * .43, 1.06, 0, g); a.rotation.z = sign * .2; arms.push(a);
    const l = new THREE.Group(); l.position.set(sign * .2, .38, 0); g.add(l);
    mesh(new THREE.CapsuleGeometry(.1, .22, 3, 6), cream, 0, -.08, 0, l);
    mesh(new THREE.SphereGeometry(.14, 8, 6), cream, 0, -.28, -.06, l).scale.set(1, .65, 1.4); legs.push(l);
  }
  mesh(new THREE.ShapeGeometry(heartShape()), new THREE.MeshStandardMaterial({ color: '#853d5b', side: THREE.DoubleSide }), 0, 1.08, -.31, g).scale.setScalar(.18);
  mesh(new THREE.SphereGeometry(.13, 8, 6), cream, 0, .66, .48, g);
  return { group: g, arms, legs, ears };
}
const bunny = bunnyModel(); scene.add(bunny.group);
const player = bunny.group;
const playerLight = new THREE.PointLight('#f7dbca', 3.4, 5); playerLight.position.set(0, 1.8, 0); player.add(playerLight);

function npc(x, z, type) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const mat = new THREE.MeshStandardMaterial({ color: type === 'kone' ? '#398b89' : '#9f344c', roughness: .95, flatShading: true });
  mesh(new THREE.CylinderGeometry(.18, .8, 1.5, 4), mat, 0, 1.1, 0, g).rotation.y = Math.PI / 4;
  for (const sign of [-1, 1]) {
    mesh(new THREE.CapsuleGeometry(.1, .25, 2, 5), dark, sign * .3, .24, 0, g);
    mesh(new THREE.SphereGeometry(.13, 6, 4), dark, sign * .65, 1, 0, g);
  }
  if (type === 'kone') {
    const hood = mesh(new THREE.ConeGeometry(.9, 1, 4), mat, 0, 2.3, 0, g); hood.rotation.y = Math.PI / 4;
    mesh(new THREE.PlaneGeometry(.84, .58), new THREE.MeshBasicMaterial({ map: eyeTex }), 0, 2.22, .52, g);
  } else {
    const mats = [new THREE.MeshStandardMaterial({ map: eyeTex }), mat, mat, mat, new THREE.MeshStandardMaterial({ map: teethTex }), mat];
    mesh(new THREE.BoxGeometry(1.04, 1.04, 1.04), mats, 0, 2.12, 0, g);
  }
  return g;
}
const kone = npc(-5.4, 5.2, 'kone'); kone.rotation.y = -.35;
const boxjaw = npc(15.5, 2, 'box'); boxjaw.rotation.y = -.8;
label('K-ONE', -5.4, 3.3, 5.2, { color: '#9edde0', width: 1.5, height: .6 });
label('BOX-JAW', 15.5, 3.3, 2, { color: '#e1b0bc', width: 1.8, height: .6 });

function capsule(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const shell = mesh(new THREE.CapsuleGeometry(.5, 1.1, 4, 12), new THREE.MeshPhysicalMaterial({ color: '#bae5cc', transparent: true, opacity: .25, roughness: .2, metalness: .2, depthWrite: false }), 0, 1.3, 0, g); shell.castShadow = false;
  mesh(new THREE.CylinderGeometry(.38, .38, .7, 12), new THREE.MeshStandardMaterial({ color: '#72baac', emissive: '#22745e', emissiveIntensity: .8 }), 0, .87, 0, g);
  mesh(new THREE.SphereGeometry(.39, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), rose, 0, 1.6, 0, g);
  const play = new THREE.Shape(); play.moveTo(-.16, -.2); play.lineTo(.2, 0); play.lineTo(-.16, .2); play.closePath();
  mesh(new THREE.ShapeGeometry(play), new THREE.MeshBasicMaterial({ color: '#ffca7e', side: THREE.DoubleSide }), 0, 1.35, .51, g);
  box(0, .1, 0, 1.4, .2, 1.4, metal, false, g);
  light(x, 1.3, z, '#a3e0ba', 8, 6);
  return g;
}
const checkpointProp = capsule(4.8, 8.5);
label('HYPER-SLEEP / SAVE', 4.8, 2.9, 8.5, { width: 2.8, height: .7, color: '#ffd071' });
const archiveCapsule = capsule(25, 1.5);
const cacheBunny = bunnyModel(); cacheBunny.group.position.set(25, .25, 1.5); cacheBunny.group.scale.setScalar(.65); scene.add(cacheBunny.group);
cacheBunny.group.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = .4; o.material.color.set('#81c5ba'); } });

function floppy(id, x, y, z, name) {
  const g = new THREE.Group(); g.position.set(x, y + 1, z); scene.add(g);
  const diskMat = new THREE.MeshStandardMaterial({ color: '#d9b46c', emissive: '#8c6021', emissiveIntensity: .4, metalness: .25, roughness: .5 });
  box(0, 0, 0, .65, .7, .1, diskMat, false, g); box(0, .18, .06, .4, .25, .015, metal, false, g);
  box(0, -.17, .06, .5, .2, .015, cream, false, g); box(.2, .22, .08, .09, .17, .02, dark, false, g);
  const halo = mesh(new THREE.TorusGeometry(.55, .013, 4, 24), new THREE.MeshBasicMaterial({ color: '#d7ae67' }), 0, 0, 0, g); halo.rotation.x = Math.PI / 2;
  const obj = { id, group: g, baseY: y + 1, pos: new THREE.Vector3(x, y, z), name }; floppies.push(obj);
  interactables.push({ pos: obj.pos, radius: 1.9, text: `Recuperar ${name}`, available: () => !state.disks.includes(id), action: () => {
    state.disks.push(id); g.visible = false; state.noise = Math.min(100, state.noise + 18); audio.collect();
    inventory.add({ id: 'disk:' + id, name, kind: 'disk', quantity: 1, description: 'Fragmento necessário para restaurar COB_01.EXE.', heal: 0 });
    toast(`MEMÓRIA RECUPERADA — ${state.disks.length} / 3`); updateHud();
    if (state.disks.length === 3) { openGate(); toast('TRÊS FRAGMENTOS REUNIDOS — o terminal de ejeção está acessível.'); }
  } });
}
floppy('yellow', -22, 0, -2, 'BUFFER_01.DAT');
floppy('balcony', 10, 3.2, 5.5, 'BUFFER_02.DAT');
floppy('cache', -31, 0, -20.5, 'COB_01.CACHE');

const worldItems = [];
function collectible(id, x, z, item) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const mat = new THREE.MeshStandardMaterial({ color: item.kind === 'heal' ? '#8ac9a9' : item.kind === 'key' ? '#d7bc79' : '#d2c4a1', roughness: .65, emissive: '#10211a' });
  if (item.kind === 'heal') {
    mesh(new THREE.CapsuleGeometry(.16, .4, 3, 8), mat, 0, .65, 0, g);
    mesh(new THREE.SphereGeometry(.165, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), rose, 0, .85, 0, g);
  } else if (item.kind === 'key') {
    mesh(new THREE.TorusGeometry(.17, .045, 5, 12), mat, 0, .8, 0, g);
    box(0, .45, 0, .08, .5, .08, mat, false, g); box(.08, .25, 0, .23, .07, .1, mat, false, g);
  } else {
    box(0, .65, 0, .6, .72, .04, mat, false, g);
    for (let y = .48; y < .86; y += .1) box(0, y, -.025, .38, .018, .01, dark, false, g);
  }
  const obj = { id, group: g, pos: new THREE.Vector3(x, 0, z), item }; worldItems.push(obj);
  interactables.push({ pos: obj.pos, radius: 1.9, text: 'Pegar ' + item.name, available: () => !state.picked.includes(id), action: () => {
    state.picked.push(id); g.visible = false; inventory.add(item); audio.collect(); toast(item.name + ' guardado. I abre o inventário.');
  } });
}
collectible('heal-buffer', 2, 3, { id: 'hyper-sleep', name: 'Hyper-Sleep portátil', kind: 'heal', quantity: 2, heal: 2, description: 'Recupera um coração de integridade. Use pelo inventário.' });
collectible('key-buffer', -20, 2, { id: 'buffer-key', name: 'Chave de buffer', kind: 'key', quantity: 1, heal: 0, description: 'Uma chave preservada nos registros do Palace.' });
collectible('note-archive', 20, 2, { id: 'archive-note', name: 'Registro da tentativa 008', kind: 'note', quantity: 1, heal: 0, description: '“Cada cápsula guarda outra versão de você. Não sabemos qual delas atravessou a saída.”' });

// Eros is a mesh with hinged wings, sound-driven pursuit and telegraphed dives.
const eros = new THREE.Group(); scene.add(eros);
const batMat = new THREE.MeshStandardMaterial({ color: '#b0447e', roughness: .92, flatShading: true });
mesh(new THREE.SphereGeometry(.7, 10, 8), batMat, 0, 0, 0, eros);
mesh(new THREE.ConeGeometry(.42, .9, 6), batMat, 0, -.65, 0, eros);
for (const sign of [-1, 1]) {
  mesh(new THREE.SphereGeometry(.19, 8, 6), black, sign * .25, .03, -.59, eros).scale.set(1, .85, .4);
  const horn = mesh(new THREE.ConeGeometry(.13, .65, 5), batMat, sign * .45, .76, 0, eros); horn.rotation.z = -sign * .4;
}
mesh(new THREE.PlaneGeometry(.85, .28), new THREE.MeshBasicMaterial({ map: teethTex }), 0, -.28, -.68, eros).rotation.y = Math.PI;
const batHeart = mesh(new THREE.ShapeGeometry(heartShape()), new THREE.MeshBasicMaterial({ color: '#ffb5d6', side: THREE.DoubleSide }), 0, .32, -.66, eros); batHeart.scale.setScalar(.3); batHeart.rotation.y = Math.PI;
const wings = [];
for (const sign of [-1, 1]) {
  const wing = new THREE.Group(); wing.position.x = sign * .5; eros.add(wing);
  const s = new THREE.Shape(); s.moveTo(0, .1); s.lineTo(sign * 1.65, 1.15); s.lineTo(sign * 1.45, -.5); s.quadraticCurveTo(sign * .9, -.15, sign * .75, -.6); s.quadraticCurveTo(sign * .4, -.28, 0, -.3);
  mesh(new THREE.ShapeGeometry(s), new THREE.MeshStandardMaterial({ color: '#9e3b6d', side: THREE.DoubleSide, roughness: .85 }), 0, 0, 0, wing);
  wings.push(wing);
}
const batShadow = mesh(new THREE.CircleGeometry(1.1, 12), new THREE.MeshBasicMaterial({ color: '#611237', transparent: true, opacity: .18, depthWrite: false }), 0, .05, 0); batShadow.rotation.x = -Math.PI / 2; batShadow.castShadow = false;
const batLight = new THREE.PointLight('#d4669a', 5, 7); eros.add(batLight);
const sys = new THREE.Group(); sys.position.set(0, 0, -31.5); scene.add(sys);
mesh(new THREE.CapsuleGeometry(.25, 2.8, 3, 6), black, 0, 3.4, 0, sys);
mesh(new THREE.SphereGeometry(.28, 8, 6), black, 0, 5.2, 0, sys);
for (const sign of [-1, 1]) {
  const arm = mesh(new THREE.CylinderGeometry(.055, .08, 2.8, 5), black, sign * .55, 2.8, 0, sys); arm.rotation.z = sign * .14;
  mesh(new THREE.CylinderGeometry(.08, .1, 2.3, 5), black, sign * .16, 1.2, 0, sys);
}
const sysCore = mesh(new THREE.SphereGeometry(.2, 8, 6), new THREE.MeshBasicMaterial({ color: '#a7efe4' }), 0, 3.5, .26, sys); sysCore.scale.set(.8, 2.4, .4);
light(0, 3.5, -31, '#86e0d7', 12, 8);
box(0, .5, -40.8, 1.5, 1, .8, metal, true);
monitor(0, 1.5, -40.8, 'lips', 0, false);
label('RESTORE COB_01.EXE', 0, 2.8, -43.94, { color: '#a5e9d8', width: 6, height: 1.5 });

const initialSave = { x: 0, y: 0, z: 10, disks: [], gate: false, secret: false, picked: [], inventory: [] };
let saved;
try { const parsed = JSON.parse(localStorage.getItem('hyper-sleep-save-v1')); if (parsed && Array.isArray(parsed.disks) && parsed.disks.every(x => ['yellow', 'balcony', 'cache'].includes(x))) saved = { ...initialSave, ...parsed, x: 3, y: 0, z: 8.5 }; } catch { /* storage can be unavailable in private sessions */ }
const state = { started: false, paused: true, dialog: false, inventoryOpen: false, won: false, health: 6, noise: 0, disks: [], picked: [], checkpoint: { ...initialSave }, secret: false, invulnerable: 0, alert: 0, gate: false, time: 0, sysExposure: 0, deaths: 0 };
let yaw = 0, pitch = .18, walkTime = 0, velocityY = 0, footTime = 0, toastTime = 0, subtitleTime = 0, gateLift = 0, near = null;
const keys = new Set();
const motion = new PlayerMotion({ height: 2.7 });
const inventory = new Inventory();
const inventoryPanel = new InventoryPanel({ inventory, onClose: () => { state.inventoryOpen = false; captureMouse(); }, onUse: item => {
  if (state.health >= 6) return toast('Integridade completa — a cápsula foi preservada.');
  if (item.kind === 'heal' && inventory.consume(item.id)) { state.health = Math.min(6, state.health + item.heal); updateHud(); audio.collect(); toast('Cápsula usada — integridade recuperada.'); }
} });
function toggleInventory() {
  if (inventoryPanel.isOpen) { inventoryPanel.close(); return; }
  if (!state.started || state.paused || state.dialog) return;
  state.inventoryOpen = true; releaseMouse(); motion.jumpBuffer = 0; inventoryPanel.open(); $('hint').classList.add('hidden');
}
const bat = { mode: 'patrol', timer: 0, cooldown: 6, target: new THREE.Vector3(), lastKnown: new THREE.Vector3(), patrol: 0 };
eros.position.set(0, 5, -4);
player.position.set(0, 0, 10);
camera.position.set(0, 3.5, 13.5);
const patrolPoints = [new THREE.Vector3(3, 5.3, -5), new THREE.Vector3(-2, 5.5, -20), new THREE.Vector3(2, 5.2, -29), new THREE.Vector3(-3, 5.4, 2)];

const audio = {
  ctx: null, hum: null, humGain: null,
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.hum = this.ctx.createOscillator(); this.hum.type = 'sine'; this.hum.frequency.value = 60;
      this.humGain = this.ctx.createGain(); this.humGain.gain.value = .013;
      this.hum.connect(this.humGain).connect(this.ctx.destination); this.hum.start();
    }
    this.ctx.resume().catch(() => {});
  },
  blip(freq = 440, duration = .12, type = 'sine', volume = .04) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), now = this.ctx.currentTime;
    o.type = type; o.frequency.setValueAtTime(freq, now); o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * .5), now + duration);
    g.gain.setValueAtTime(volume, now); g.gain.exponentialRampToValueAtTime(.0001, now + duration);
    o.connect(g).connect(this.ctx.destination); o.start(); o.stop(now + duration + .02);
  },
  collect() { [330, 440, 660].forEach((f, i) => setTimeout(() => this.blip(f, .22, 'triangle'), i * 85)); },
  error() { this.blip(155, .45, 'sawtooth', .065); },
  modem() { [420, 870, 620, 1300, 380].forEach((f, i) => setTimeout(() => this.blip(f, .1, 'square', .015), i * 100)); }
};
function toast(text, duration = 4) { $('toast').textContent = text; $('toast').classList.add('show'); toastTime = duration; }
function subtitle(text, duration = 4) { $('subtitle').textContent = text; subtitleTime = duration; }
function updateHud() {
  $('hearts').innerHTML = [0, 1, 2].map(i => `<span class="heart ${state.health >= (i + 1) * 2 ? '' : state.health === i * 2 + 1 ? 'half' : 'empty'}">♥</span>`).join('');
  $('hearts').setAttribute('aria-label', `${state.health / 2} de 3 corações`);
  $('integrity').textContent = state.health <= 2 ? 'INTEGRIDADE CRÍTICA' : state.health < 6 ? 'ARQUIVO DANIFICADO' : 'INTEGRIDADE ESTÁVEL';
  $('count').textContent = `${state.disks.length} / 3`;
  $('objective').textContent = state.disks.length === 3 ? 'Siga pelo corredor norte. Restaure COB_01.EXE.' : state.secret ? 'Explore as salas amarelas e a passarela. A costura esconde o terceiro arquivo.' : 'Procure K-One perto da água.';
}
function openGate() {
  state.gate = true; gateSolid.active = false;
  audio.blip(90, .7, 'triangle');
}
function releaseMouse() { keys.clear(); if (document.pointerLockElement) document.exitPointerLock(); }
function captureMouse() {
  try { const p = renderer.domElement.requestPointerLock(); if (p?.catch) p.catch(() => toast('Você também pode arrastar com o mouse para girar a câmera.')); } catch { /* drag camera remains available */ }
}
function dialog(title, text, choices, portrait = '◈') {
  state.dialog = true; releaseMouse(); $('dialogTitle').textContent = title; $('dialogText').textContent = text; $('portrait').textContent = portrait;
  $('dialogButtons').replaceChildren();
  for (const choice of choices) {
    const b = document.createElement('button'); b.textContent = choice.label;
    b.onclick = () => { $('dialog').classList.add('hidden'); state.dialog = false; choice.action?.(); if (!state.paused) captureMouse(); };
    $('dialogButtons').append(b);
  }
  $('dialog').classList.remove('hidden'); $('dialogButtons').firstElementChild?.focus();
}
interactables.push({ pos: new THREE.Vector3(-5.4, 0, 5.2), radius: 2.8, text: 'Ouvir K-One', action: () => {
  audio.modem(); state.secret = true; updateHud();
  dialog('K-ONE // INVALID GEOMETRY', 'Biiip... A sala amarela tem uma parede que o servidor esqueceu de fechar. Procure a costura rosa no fundo, à esquerda. A passarela também conserva um arquivo. Eu apenas observo.', [{ label: 'Entendi' }], '◉');
} });
interactables.push({ pos: new THREE.Vector3(15.5, 0, 2), radius: 2.7, text: 'Consultar Box-Jaw', action: () => {
  audio.blip(170, .15, 'square'); dialog('BOX-JAW // MEMORY ARCHIVE', 'Cada cápsula guarda uma versão de você. Salve depois de recuperar arquivos: um rollback volta ao último backup. Eros escuta passos e alertas. Ande devagar ou se esconda atrás de caixas. O corredor norte leva ao terminal.', [{ label: 'Fechar registro' }], '▣');
} });
interactables.push({ pos: new THREE.Vector3(4.8, 0, 8.5), radius: 2.4, text: 'Restaurar integridade e salvar backup', action: () => {
  state.health = 6; state.noise = 0; state.invulnerable = 4;
  state.checkpoint = { x: 3, y: 0, z: 8.5, disks: [...state.disks], gate: state.gate, secret: state.secret, picked: [...state.picked], inventory: inventory.snapshot() };
  let persistent = true; try { localStorage.setItem('hyper-sleep-save-v1', JSON.stringify(state.checkpoint)); } catch { persistent = false; }
  audio.collect(); updateHud(); toast(persistent ? 'BACKUP SALVO — integridade restaurada. Uma cópia sua ficou aqui.' : 'BACKUP EM MEMÓRIA — integridade restaurada nesta sessão.');
} });
interactables.push({ pos: new THREE.Vector3(25, 0, 1.5), radius: 2.3, text: 'Examinar Cob-01.cache', action: () => {
  dialog('COB_01.CACHE // ATTEMPT 008', 'O registro está parado no mesmo instante há anos. A etiqueta diz: “Restauração concluída”. Mas a Coelhinha ainda está aqui. Quantas versões suas este lugar guardou?', [{ label: 'Continuar' }], '♡');
} });
interactables.push({ pos: new THREE.Vector3(0, 0, -39.2), radius: 2.2, text: 'Restaurar COB_01.EXE', available: () => state.disks.length === 3, action: () => {
  dialog('RESTORE ORIGINAL FILE?', 'Os três fragmentos foram reconstruídos. COB_01.EXE está pronto. Você pode sair do setor agora ou continuar explorando o Palace.', [
    { label: 'Restaurar arquivo', action: win }, { label: 'Continuar explorando' }
  ], '♡');
} });
const popup = new THREE.Group(); popup.position.set(1.2, 1.5, -22); scene.add(popup);
const popupTex = texture((c, s) => {
  c.fillStyle = '#bec4b9'; c.fillRect(0, 0, s, s); c.fillStyle = '#243e87'; c.fillRect(3, 3, s - 6, 22);
  c.fillStyle = '#fff'; c.font = '10px monospace'; c.fillText('SYSTEM WARNING', 8, 18);
  c.fillStyle = '#30322d'; c.font = '12px monospace'; c.fillText('Memory corrupted.', 8, 67);
  c.strokeRect(38, 84, 52, 23); c.fillText('OK', 56, 101);
});
box(0, 0, 0, 2.4, 1.65, .12, metal, false, popup);
mesh(new THREE.PlaneGeometry(2.36, 1.6), new THREE.MeshBasicMaterial({ map: popupTex, side: THREE.DoubleSide }), 0, 0, .07, popup);
let popupClosed = false;
interactables.push({ pos: new THREE.Vector3(1.2, 0, -22), radius: 2.5, text: 'Responder ao erro de memória', available: () => !popupClosed, action: () => {
  dialog('SYSTEM WARNING', 'Este processo não está respondendo. “OK” encerra o erro com um alerta sonoro. “Cancelar” silencia temporariamente o setor. “Ignorar” deixa a janela aberta.', [
    { label: 'OK', action: () => { popupClosed = true; popup.visible = false; state.noise = 100; bat.cooldown = 0; audio.error(); toast('ALERTA DE SISTEMA — Eros ouviu você.'); } },
    { label: 'Cancelar', action: () => { popupClosed = true; popup.visible = false; state.noise = 0; bat.cooldown = 8; bat.mode = 'patrol'; toast('PROCESSO SUSPENSO — alguns segundos de silêncio.'); } },
    { label: 'Ignorar' }
  ], '⚠');
} });

function resetToCheckpoint() {
  const cp = state.checkpoint; player.position.set(cp.x, cp.y, cp.z); velocityY = 0; motion.reset(); player.scale.y = 1;
  state.health = 6; state.noise = 0; state.invulnerable = 5; state.sysExposure = 0; state.disks = [...cp.disks]; state.secret = cp.secret;
  state.gate = cp.gate; gateSolid.active = !state.gate; gateLift = state.gate ? 5.5 : 0; gate.position.y = 2.6 + gateLift;
  floppies.forEach(d => d.group.visible = !state.disks.includes(d.id));
  state.picked = Array.isArray(cp.picked) ? cp.picked.filter(id => worldItems.some(o => o.id === id)) : [];
  worldItems.forEach(o => o.group.visible = !state.picked.includes(o.id)); inventory.restore(cp.inventory);
  for (const [id, item] of inventory.items) if (item.kind === 'disk') inventory.items.delete(id);
  for (const d of floppies.filter(d => state.disks.includes(d.id))) inventory.add({ id: 'disk:' + d.id, name: d.name, kind: 'disk', quantity: 1, description: 'Fragmento necessário para restaurar COB_01.EXE.', heal: 0 });
  popupClosed = false; popup.visible = true;
  bat.mode = 'patrol'; bat.cooldown = 8; eros.position.set(0, 5, -16);
  yaw = 0; pitch = .18; player.rotation.y = 0; cameraUpdate(1);
  updateHud();
}
function damage(reason) {
  if (state.invulnerable > 0 || state.won) return;
  state.health = Math.max(0, state.health - 1); state.invulnerable = 2.5; audio.error(); updateHud();
  $('damage').style.opacity = '1'; subtitle("I don't feel so well...", 3); toast(reason, 2.5);
  if (!state.health) {
    state.deaths++; dialog('PROCESS LOST // ROLLBACK AVAILABLE', 'Cob-01 perdeu a integridade. O Palace ainda tem seu último backup. Os arquivos obtidos depois dele ficaram na memória perdida.', [{ label: 'Carregar backup', action: () => { resetToCheckpoint(); toast('ROLLBACK CONCLUÍDO — tentativa ' + (state.deaths + 1)); } }], '↶');
  }
}
function win() {
  state.won = true; audio.collect(); state.paused = true; releaseMouse();
  $('overlay').classList.remove('hidden'); $('menuDescription').innerHTML = 'COB_01.EXE successfully restored.<br>Por um instante, seu reflexo continua no vidro do monitor.<br>Você escapou... ou o Palace só mudou de endereço?';
  $('play').innerHTML = 'VOLTAR AO PALACE <span>↗</span>';
  $('continueInfo').textContent = 'SETOR CONCLUÍDO / você pode continuar explorando.';
}
function start() {
  audio.init();
  if (!state.started) {
    state.started = true;
    if (saved) { state.checkpoint = saved; resetToCheckpoint(); }
    else toast('Você despertou no Buffer. Fale com K-One e encontre três disquetes.', 6);
  }
  state.paused = false; $('overlay').classList.add('hidden');
  for (const id of ['hud', 'mission', 'bottom']) $(id).classList.remove('hidden');
  updateHud(); cameraUpdate(1); captureMouse();
}
$('play').onclick = start;
if (saved) { $('play').innerHTML = 'CARREGAR BACKUP <span>↗</span>'; $('continueInfo').textContent = `Backup encontrado: ${saved.disks.length} / 3 fragmentos.`; }
function pause() {
  if (!state.started || state.paused || state.dialog || state.inventoryOpen) return;
  state.paused = true; releaseMouse(); $('overlay').classList.remove('hidden');
  $('menuDescription').innerHTML = 'PROCESSO PAUSADO.<br>Seu endereço de memória está estável.<br>Retome quando estiver pronto.';
  $('play').innerHTML = 'RETOMAR PROCESSO <span>↗</span>';
}
addEventListener('keydown', e => {
  const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
  if (state.inventoryOpen) {
    if (e.code === 'Escape' || e.code === 'KeyI' && !typing) { e.preventDefault(); if (!e.repeat) inventoryPanel.close(); }
    return;
  }
  if (!typing && !e.repeat && (e.code === 'KeyI' || e.code === 'Tab') && state.started && !state.paused && !state.dialog) { e.preventDefault(); toggleInventory(); return; }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ControlLeft', 'ControlRight'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.repeat) return;
  if (e.code === 'Space' && state.started && !state.paused && !state.dialog) motion.requestJump();
  if (e.code === 'KeyC' && state.started && !state.paused && !state.dialog) motion.toggleCrouch();
  if (e.code === 'Escape') { if (state.dialog) { $('dialogButtons').lastElementChild?.click(); } else if (state.paused && state.started) start(); else pause(); }
  if (e.code === 'KeyM' && state.started && !state.paused && !state.dialog) $('mapPanel').classList.toggle('hidden');
  if (e.code === 'KeyE' && state.started && !state.paused && !state.dialog && near) near.action();
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && state.started && !state.dialog && !state.inventoryOpen && !state.paused) pause(); });
let dragging = false, dragX = 0, dragY = 0;
renderer.domElement.addEventListener('pointerdown', e => {
  if (state.paused || state.dialog || state.inventoryOpen) return;
  dragging = true; dragX = e.clientX; dragY = e.clientY;
  if (!document.pointerLockElement) renderer.domElement.setPointerCapture(e.pointerId);
});
addEventListener('pointerup', () => dragging = false);
addEventListener('mousemove', e => {
  if (state.paused || state.dialog || state.inventoryOpen) return;
  let dx = 0, dy = 0;
  if (document.pointerLockElement) { dx = e.movementX; dy = e.movementY; }
  else if (dragging) { dx = e.clientX - dragX; dy = e.clientY - dragY; dragX = e.clientX; dragY = e.clientY; }
  yaw -= dx * .0025; pitch = clamp(pitch + dy * .002, -.15, .72);
});

const ray = new THREE.Raycaster();
function blocked(x, y, z, height = motion.height) {
  const r = .29;
  return solids.some(s => s.active && y + height > s.y1 + .025 && y < s.y2 - .08 && x + r > s.x1 && x - r < s.x2 && z + r > s.z1 && z - r < s.z2)
    || surfaces.some(s => !s.ramp && y < s.y - .3 - .025 && y + height > s.y - .3 + .025 && x + r > s.x1 && x - r < s.x2 && z + r > s.z1 && z - r < s.z2);
}
function surfaceAt(x, z, y) {
  let best = null, h = -Infinity;
  for (const s of surfaces) if (x >= s.x1 && x <= s.x2 && z >= s.z1 && z <= s.z2) {
    const sy = s.ramp ? s.ramp.top * (s.z2 - z) / (s.z2 - s.z1) : s.y;
    if (sy <= y + .38 && sy > h) { h = sy; best = s; }
  }
  for (const s of solids) if (s.active && s.mesh.material.visible !== false && x >= s.x1 && x <= s.x2 && z >= s.z1 && z <= s.z2 && s.y2 <= y + .38 && s.y2 > h) { h = s.y2; best = { name: 'OBJETO DE BUFFER' }; }
  return best ? { height: h, surface: best } : null;
}
function lineOfSight(from, to) {
  const dir = to.clone().sub(from), distance = dir.length();
  ray.set(from, dir.normalize()); ray.far = distance;
  const hits = ray.intersectObjects(cameraSolids.filter(m => m.visible && m.material.visible !== false && !(m === gate && state.gate)), false);
  return !hits.some(h => h.distance < distance - .25);
}
function movePlayer(dt) {
  motion.stance(player.position, keys.has('ControlLeft') || keys.has('ControlRight'), blocked);
  let f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  let r = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  const len = Math.hypot(f, r); if (len) { f /= len; r /= len; }
  const silent = motion.crouched;
  const running = !silent && (keys.has('ShiftLeft') || keys.has('ShiftRight'));
  const speed = silent ? 1.65 : running ? 5.8 : 3.1;
  const dx = (-Math.sin(yaw) * f + Math.cos(yaw) * r) * speed * dt;
  const dz = (-Math.cos(yaw) * f - Math.sin(yaw) * r) * speed * dt;
  const before = player.position.clone();
  motion.velocity = velocityY;
  motion.step(dt, { position: player.position, dx, dz, blocked, ground: (x, z, y) => surfaceAt(x, z, y)?.height ?? -Infinity }); velocityY = motion.velocity;
  player.scale.y += ((motion.crouched ? .48 : 1) - player.scale.y) * Math.min(1, dt * 16);
  const floor = surfaceAt(player.position.x, player.position.z, player.position.y);
  if (player.position.y < -5) { resetToCheckpoint(); toast('ENDEREÇO INVÁLIDO — rollback para o checkpoint.'); return; }
  const moving = Math.hypot(player.position.x - before.x, player.position.z - before.z) > .001;
  if (moving) {
    const target = Math.atan2(-dx, -dz), diff = Math.atan2(Math.sin(target - player.rotation.y), Math.cos(target - player.rotation.y));
    player.rotation.y += diff * Math.min(1, dt * 12);
    walkTime += dt * (running ? 14 : silent ? 5 : 8);
    footTime -= dt;
    if (footTime <= 0) { audio.blip(85 + Math.random() * 40, .045, 'triangle', silent ? .004 : .013); footTime = running ? .23 : silent ? .65 : .4; }
    if (running) state.noise = Math.min(100, state.noise + dt * 31);
    else state.noise = Math.max(0, state.noise - dt * (silent ? 28 : 10));
  } else state.noise = Math.max(0, state.noise - dt * 22);
  bunny.arms.forEach((m, i) => m.rotation.x = moving ? Math.sin(walkTime) * .5 * (i ? -1 : 1) : THREE.MathUtils.lerp(m.rotation.x, 0, dt * 8));
  bunny.legs.forEach((m, i) => m.rotation.x = moving ? Math.sin(walkTime) * .38 * (i ? 1 : -1) : THREE.MathUtils.lerp(m.rotation.x, 0, dt * 8));
  bunny.ears.forEach((m, i) => m.rotation.z = (i ? -.08 : .08) + Math.sin(state.time * 2) * .015);
  const zone = floor?.surface.name || 'MEMÓRIA NÃO ALOCADA'; $('zone').textContent = zone;
  if (player.position.x < -24 && player.position.z < -8 && !state.secret) { state.secret = true; updateHud(); toast('COSTURA ATRAVESSADA — você encontrou a memória esquecida.'); }
  falseWall.material.opacity = state.secret ? .32 + Math.sin(state.time * 3) * .12 : .92;
}
function cameraUpdate(dt) {
  const target = player.position.clone().add(new THREE.Vector3(0, motion.crouched ? .8 : 1.45, 0));
  const distance = 5.6;
  const offset = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch) * distance, 1.15 + Math.sin(pitch) * distance, Math.cos(yaw) * Math.cos(pitch) * distance);
  ray.set(target, offset.clone().normalize()); ray.far = offset.length();
  const hits = ray.intersectObjects(cameraSolids.filter(m => m.material.visible !== false && !(m === gate && state.gate)), false);
  if (hits.length) offset.setLength(Math.max(.5, hits[0].distance - .25));
  const desired = target.clone().add(offset);
  if (hits.length && camera.position.distanceTo(target) > offset.length() + .05) camera.position.copy(desired);
  else camera.position.lerp(desired, 1 - Math.exp(-dt * 12));
  camera.lookAt(target);
  player.visible = camera.position.distanceTo(target) > 1.1;
}
function updateEros(dt) {
  bat.cooldown = Math.max(0, bat.cooldown - dt);
  const dist = Math.hypot(eros.position.x - player.position.x, eros.position.z - player.position.z);
  const canHear = state.noise > 46 && dist < 25 && player.position.x > -12 && player.position.x < 12 && player.position.z > -35;
  if (canHear && bat.cooldown <= 0 && bat.mode === 'patrol' && !state.won) {
    bat.mode = 'hunt'; bat.timer = 0; toast('ASAS NO TETO — pare de correr e procure cobertura.', 3); audio.blip(240, .5, 'triangle', .05);
  }
  if (bat.mode === 'patrol') {
    const dest = patrolPoints[bat.patrol];
    if (eros.position.distanceTo(dest) < .7) bat.patrol = (bat.patrol + 1) % patrolPoints.length;
    bat.target.copy(dest);
  } else if (bat.mode === 'hunt') {
    bat.timer += dt;
    if (canHear || (dist < 13 && lineOfSight(eros.position, player.position.clone().add(new THREE.Vector3(0, 1, 0))))) bat.lastKnown.copy(player.position);
    bat.target.set(bat.lastKnown.x, Math.max(5, bat.lastKnown.y + 3.2), bat.lastKnown.z);
    if (dist < 1.7 && bat.timer > 1.6) { bat.mode = 'windup'; bat.timer = 1.1; bat.lastKnown.copy(player.position); subtitle('Uma sombra parou sobre você.', 1.2); audio.blip(370, .5, 'sawtooth', .02); }
    if (bat.timer > 8 && state.noise < 15) { bat.mode = 'patrol'; bat.cooldown = 4; }
  } else if (bat.mode === 'windup') {
    bat.timer -= dt; bat.target.set(bat.lastKnown.x, bat.lastKnown.y + 4, bat.lastKnown.z);
    if (bat.timer <= 0) { bat.mode = 'dive'; bat.timer = .65; }
  } else if (bat.mode === 'dive') {
    bat.timer -= dt; bat.target.copy(bat.lastKnown).add(new THREE.Vector3(0, .9, 0));
    if (eros.position.distanceTo(player.position.clone().add(new THREE.Vector3(0, 1, 0))) < 1.25) damage('EROS — seu processo foi marcado.');
    if (bat.timer <= 0) { bat.mode = 'recover'; bat.timer = 2; bat.cooldown = 5; }
  } else {
    bat.timer -= dt; bat.target.set(eros.position.x, 5.5, eros.position.z);
    if (bat.timer <= 0) { bat.mode = 'patrol'; state.noise = Math.min(state.noise, 35); }
  }
  const delta = bat.target.clone().sub(eros.position), speed = bat.mode === 'dive' ? 13 : bat.mode === 'patrol' ? 2.3 : 5.5;
  if (delta.length() > .04) { delta.setLength(Math.min(delta.length(), speed * dt)); eros.position.add(delta); if (Math.abs(delta.x) + Math.abs(delta.z) > .005) eros.rotation.y = Math.atan2(-delta.x, -delta.z); }
  wings.forEach((w, i) => w.rotation.y = Math.sin(state.time * (bat.mode === 'patrol' ? 8 : 15)) * .55 * (i ? -1 : 1));
  const ground = surfaceAt(eros.position.x, eros.position.z, 4);
  batShadow.position.set(eros.position.x, (ground?.height || 0) + .06, eros.position.z);
  batShadow.material.opacity = bat.mode === 'windup' ? .4 : .12;
  batShadow.scale.setScalar(bat.mode === 'windup' ? 1 + Math.sin(state.time * 18) * .1 : 1.4);
  $('noiseState').textContent = bat.mode !== 'patrol' ? 'DETECTADO' : state.noise > 45 ? 'ALTO' : state.noise > 15 ? 'AUDÍVEL' : 'SILENCIOSO';
  $('noiseState').style.color = bat.mode !== 'patrol' ? '#ed96be' : '';
  $('noiseBar').style.width = `${state.noise}%`; $('noiseBar').style.background = state.noise > 45 ? '#ed96be' : '#8bd6cf';
}
function updateSys(dt) {
  if (state.gate || state.won) { sys.position.y = THREE.MathUtils.lerp(sys.position.y, -7, dt * 2); return; }
  const distance = player.position.distanceTo(sys.position), target = sys.position.clone().add(new THREE.Vector3(0, 3.5, 0));
  const watchers = monitors.filter(m => m.enabled && m.kind === 'eye').length;
  const viewDirection = new THREE.Vector3(); camera.getWorldDirection(viewDirection);
  const looking = viewDirection.dot(target.sub(camera.position).normalize()) > .96;
  if (distance < 13 && looking && watchers > 0 && lineOfSight(camera.position, sys.position.clone().add(new THREE.Vector3(0, 3.5, 0)))) {
    state.sysExposure += dt;
    if (state.sysExposure > 3.5) { damage('SYSADMIN — a vigilância está corrompendo sua imagem.'); state.sysExposure = 0; }
  } else state.sysExposure = Math.max(0, state.sysExposure - dt * 2);
  $('crt').style.backgroundColor = state.sysExposure > .5 ? `rgba(139,195,185,${Math.min(.13, state.sysExposure * .035)})` : 'transparent';
  sysCore.scale.y = 2.4 + Math.sin(state.time * 2) * .15;
}
function nearestInteraction() {
  near = null; let closest = Infinity;
  for (const obj of interactables) {
    if (obj.available && !obj.available()) continue;
    const d = player.position.distanceTo(obj.pos);
    if (d < obj.radius && d < closest && lineOfSight(player.position.clone().add(new THREE.Vector3(0, 1.1, 0)), obj.pos.clone().add(new THREE.Vector3(0, 1.1, 0)))) { closest = d; near = obj; }
  }
  $('hint').classList.toggle('hidden', !near || state.dialog || state.paused);
  if (near) $('hint').lastElementChild.textContent = near.text;
}
function drawMap() {
  if ($('mapPanel').classList.contains('hidden')) return;
  const c = $('map').getContext('2d'), scale = 4.9, ox = 192, oz = 305;
  c.clearRect(0, 0, 360, 420); c.fillStyle = '#0b1a15'; c.fillRect(0, 0, 360, 420);
  c.strokeStyle = '#233a2b'; c.lineWidth = .5;
  for (let i = 0; i < 360; i += 20) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 420); c.stroke(); }
  for (let i = 0; i < 420; i += 20) { c.beginPath(); c.moveTo(0, i); c.lineTo(360, i); c.stroke(); }
  for (const s of surfaces.filter(s => s.y === 0 && !s.ramp && (state.secret || s.x1 > -29 && s.z1 >= -44 && s.name !== 'COSTURA DE MEMÓRIA'))) {
    c.fillStyle = '#294438'; c.strokeStyle = '#6d9b78'; c.lineWidth = 1;
    c.fillRect(ox + s.x1 * scale, oz + s.z1 * scale, (s.x2 - s.x1) * scale, (s.z2 - s.z1) * scale);
    c.strokeRect(ox + s.x1 * scale, oz + s.z1 * scale, (s.x2 - s.x1) * scale, (s.z2 - s.z1) * scale);
  }
  c.font = '9px monospace'; c.fillStyle = '#9aaf93'; c.fillText('EXIT', ox - 12, oz - 39 * scale); c.fillText('PALACE', ox - 18, oz);
  for (const d of floppies) if (!state.disks.includes(d.id) && (d.id !== 'cache' || state.secret)) { c.fillStyle = '#ffd071'; c.fillRect(ox + d.pos.x * scale - 3, oz + d.pos.z * scale - 3, 6, 6); }
  c.fillStyle = '#8bd6cf'; c.beginPath(); c.arc(ox + 4.8 * scale, oz + 8.5 * scale, 4, 0, 7); c.fill();
  c.save(); c.translate(ox + player.position.x * scale, oz + player.position.z * scale); c.rotate(-player.rotation.y);
  c.fillStyle = '#ed96be'; c.beginPath(); c.moveTo(0, -6); c.lineTo(-4, 4); c.lineTo(4, 4); c.closePath(); c.fill(); c.restore();
}
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), .04);
  if (state.started && !state.paused && !state.dialog && !state.inventoryOpen) {
    state.time += dt; state.invulnerable = Math.max(0, state.invulnerable - dt);
    movePlayer(dt); cameraUpdate(dt); updateEros(dt); updateSys(dt); nearestInteraction(); drawMap();
    if (state.gate && gateLift < 5.5) { gateLift = Math.min(5.5, gateLift + dt * 2); gate.position.y = 2.6 + gateLift; }
    for (const d of floppies) { d.group.rotation.y += dt * .65; d.group.position.y = d.baseY + Math.sin(state.time * 2 + d.pos.x) * .13; }
    for (const o of worldItems) { o.group.rotation.y = state.time * .45; o.group.position.y = Math.sin(state.time * 2) * .05; }
    checkpointProp.children[0].position.y = 1.3 + Math.sin(state.time * 2) * .05;
    cacheBunny.group.rotation.y = Math.sin(state.time * .3) * .3;
    waterTex.offset.y = state.time * .01;
    glints.forEach((m, i) => m.material.opacity = .12 + Math.sin(state.time * 2.5 + i) * .08);
    if (toastTime > 0) { toastTime -= dt; if (toastTime <= 0) $('toast').classList.remove('show'); }
    if (subtitleTime > 0) { subtitleTime -= dt; if (subtitleTime <= 0) $('subtitle').textContent = ''; }
    $('damage').style.opacity = String(Math.max(0, parseFloat($('damage').style.opacity || '0') - dt * 1.8));
    if (audio.humGain) audio.humGain.gain.value = .013 + (bat.mode === 'patrol' ? 0 : .008);
  } else {
    $('hint').classList.add('hidden');
    if (audio.humGain) audio.humGain.gain.value = .004;
  }
  renderer.render(scene, camera);
}
updateHud(); camera.lookAt(0, 1.5, 10); $('loading').classList.add('hidden'); animate();
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

// Explicit opt-in diagnostics for browser verification; absent in normal play.
if (new URLSearchParams(location.search).has('test')) window.__PALACE_TEST__ = {
  state: () => ({ ...state, yaw, pitch, player: player.position.toArray(), inventory: inventory.snapshot(), crouched: motion.crouched, grounded: motion.grounded, near: near?.text, bat: bat.mode, zone: $('zone').textContent }),
  teleport: (x, y, z) => { player.position.set(x, y, z); velocityY = 0; motion.reset(); yaw = 0; pitch = .18; state.invulnerable = 20; cameraUpdate(1); nearestInteraction(); },
  interact: () => near?.action(),
  step: dt => { movePlayer(dt); cameraUpdate(dt); nearestInteraction(); },
  damage: () => { state.invulnerable = 0; damage('TEST'); },
  bat: () => ({ position: eros.position.toArray(), mode: bat.mode }),
  scene: () => ({ objects: scene.children.length, triangles: renderer.info.render.triangles, calls: renderer.info.render.calls }),
  dismiss: () => $('dialogButtons').firstElementChild?.click(),
  start,
};
