const { test, expect } = require('@playwright/test');

test('texturas: pisos contínuos e faces estreitas proporcionais nos cantos', async ({ page }, testInfo) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/editor.html?test'); await page.waitForFunction(() => window.__ENGINE_TEST__);
  const result = await page.evaluate(async () => {
    const THREE = await import('three'), { createEntity, buildEntity, newProject, updateEntityUV } = await import('/palace-engine.js');
    const p = newProject(), fa = createEntity('floor'), fb = createEntity('floor'); fb.position = [4, 0, 0]; fb.rotation = Math.PI / 2;
    const wa = createEntity('wall'), wb = createEntity('wall'); wa.position = [0, 0, -2]; wb.position = [2.2, 0, -.2]; wb.rotation = Math.PI / 2;
    const roots = [fa, fb, wa, wb].map(e => buildEntity(e, p)); roots.forEach(r => r.updateMatrixWorld(true));
    function rayUV(root, from, direction) { return new THREE.Raycaster(new THREE.Vector3(...from), new THREE.Vector3(...direction)).intersectObject(root, true)[0].uv.toArray(); }
    const floorA = rayUV(roots[0], [2 - .00001, 5, .3], [0, -1, 0]), floorB = rayUV(roots[1], [2 + .00001, 5, .3], [0, -1, 0]);
    const cornerA = rayUV(roots[2], [3, 1, -2], [-1, 0, 0]), cornerB = rayUV(roots[3], [1, 1, -2], [1, 0, 0]);
    const geometry = roots[2].children[0].geometry, uv = geometry.attributes.uv, normal = geometry.attributes.normal;
    const cap = []; for (let i = 0; i < uv.count; i++) if (normal.getX(i) > .99) cap.push(uv.getX(i));
    const capWidth = Math.max(...cap) - Math.min(...cap);
    const areas = [];
    for (const r of roots) { const g = r.children[0].geometry, u = g.attributes.uv, index = g.index.array; for (let i = 0; i < index.length; i += 3) { const [a,b,c] = [...index.slice(i, i + 3)]; areas.push(Math.abs((u.getX(b)-u.getX(a))*(u.getY(c)-u.getY(a))-(u.getX(c)-u.getX(a))*(u.getY(b)-u.getY(a)))/2); } }
    fb.position = [4.25, 0, 0]; roots[1].position.fromArray(fb.position); updateEntityUV(roots[1], fb);
    const movedUV = rayUV(roots[1], [3, 5, .3], [0, -1, 0]);
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128; const ctx = canvas.getContext('2d');
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { ctx.fillStyle = (x + y) % 2 ? '#a9c487' : '#49663d'; ctx.fillRect(x * 16, y * 16, 16, 16); }
    const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter;
    roots.forEach(r => r.children[0].material = new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }));
    fb.position = [4, 0, 0]; roots[1].position.fromArray(fb.position); updateEntityUV(roots[1], fb);
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#111d16'); roots.forEach(r => scene.add(r));
    const camera = new THREE.PerspectiveCamera(45, 1, .1, 100); camera.position.set(10, 9, 12); camera.lookAt(1, 1, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setSize(512, 512); renderer.render(scene, camera); renderer.domElement.id = 'world-texture-check'; renderer.domElement.style.cssText = 'position:fixed;left:0;top:0;z-index:1000;width:512px;height:512px;'; document.body.append(renderer.domElement);
    return { floorA, floorB, cornerA, cornerB, capWidth, areas, movedUV };
  });
  expect(result.floorA[0]).toBeCloseTo(result.floorB[0], 4); expect(result.floorA[1]).toBeCloseTo(result.floorB[1], 4);
  expect(result.cornerA[0]).toBeCloseTo(result.cornerB[0], 5); expect(result.cornerA[1]).toBeCloseTo(result.cornerB[1], 5);
  expect(result.capWidth).toBeCloseTo(.4 / 3, 5); expect(result.areas.every(a => a > .0001)).toBe(true);
  expect(result.movedUV[0]).toBeCloseTo(1, 5); expect(result.movedUV[1]).toBeCloseTo(-.1, 5);
  await page.locator('#world-texture-check').screenshot({ path: testInfo.outputPath('corners-uv-corrected.png') });
  expect(errors).toEqual([]);
});
