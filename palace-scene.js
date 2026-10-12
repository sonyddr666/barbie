import * as THREE from 'three';

export function createPalaceScene(container) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(55, 1, .1, 500);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.domElement.tabIndex = 0; container.prepend(renderer.domElement);
  const ambient = new THREE.HemisphereLight('#c6ddbf', '#182c23', 1.6); scene.add(ambient);
  const sun = new THREE.DirectionalLight('#c9d9bc', 2); sun.position.set(12, 35, 18); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, far: 120 }); sun.shadow.bias = -.001; scene.add(sun);
  return { scene, camera, renderer, ambient, sun };
}
export function applyPalaceEnvironment(context, environment, container) {
  context.scene.background = new THREE.Color(environment.background); context.scene.fog = new THREE.FogExp2(environment.fog, environment.fogDensity); context.ambient.intensity = environment.ambient;
  context.renderer.setPixelRatio(environment.pixelated ? .9 : Math.min(devicePixelRatio, 1.5)); container.classList.toggle('pixelated', environment.pixelated);
}
