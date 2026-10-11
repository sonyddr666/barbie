const { test, expect } = require('@playwright/test');

test('rampa: textura bidimensional contínua em ambos os triângulos e nas laterais', async ({ page }, testInfo) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/editor.html?test'); await page.waitForFunction(() => window.__ENGINE_TEST__);
  const result = await page.evaluate(async () => {
    const THREE = await import('three');
    const { createEntity, newProject, buildEntity } = await import('/palace-engine.js');
    const project = newProject(), ramp = createEntity('ramp'); ramp.size = [4, 2, 6]; ramp.rotation = Math.PI / 3; ramp.material.mapping = 'local';
    const root = buildEntity(ramp, project), geometry = root.children[0].geometry;
    root.updateMatrixWorld(true);
    const uv = geometry.getAttribute('uv'), position = geometry.getAttribute('position'), areas = [];
    for (let i = 0; i < uv.count; i += 3) {
      const ax = uv.getX(i), ay = uv.getY(i), bx = uv.getX(i + 1), by = uv.getY(i + 1), cx = uv.getX(i + 2), cy = uv.getY(i + 2);
      areas.push(Math.abs((bx - ax) * (cy - ay) - (cx - ax) * (by - ay)) / 2);
    }
    const samples = [];
    for (const [x, z] of [[-.35, .3], [.35, -.3], [-.35, -.3], [.35, .3], [0, 0]]) {
      const point = root.localToWorld(new THREE.Vector3(x, 3, z));
      const ray = new THREE.Raycaster(point, new THREE.Vector3(0, -1, 0));
      const hit = ray.intersectObject(root, true)[0]; samples.push({ actual: hit.uv.toArray(), expected: [x + .5, .5 - z] });
    }
    // A checker pattern makes streaking and diagonal seams visible in the actual WebGL render.
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128; const ctx = canvas.getContext('2d');
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { ctx.fillStyle = (x + y) % 2 ? '#a9c487' : '#49663d'; ctx.fillRect(x * 16, y * 16, 16, 16); }
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter;
    root.children[0].material = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }); root.rotation.y = 0;
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#111d16'); scene.add(root);
    const camera = new THREE.PerspectiveCamera(45, 1, .1, 100); camera.position.set(7, 7, 8); camera.lookAt(0, 1, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setSize(512, 512); renderer.render(scene, camera);
    renderer.domElement.id = 'ramp-texture-check'; renderer.domElement.style.cssText = 'position:fixed;left:0;top:0;z-index:1000;width:512px;height:512px;'; document.body.append(renderer.domElement);
    return { areas, samples, vertices: position.count };
  });
  expect(result.areas.every(a => a > .1)).toBe(true);
  for (const sample of result.samples) { expect(sample.actual[0]).toBeCloseTo(sample.expected[0], 5); expect(sample.actual[1]).toBeCloseTo(sample.expected[1], 5); }
  await page.locator('#ramp-texture-check').screenshot({ path: testInfo.outputPath('ramp-uv-corrected.png') });
  expect(errors).toEqual([]);
});
