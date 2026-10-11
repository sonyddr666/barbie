const { test, expect } = require('@playwright/test');

async function open(page) {
  const errors = []; page.on('pageerror', e => { errors.push(e.message); console.log(e.message); });
  await page.goto('/editor.html?test'); await page.waitForFunction(() => window.__ENGINE_TEST__); return errors;
}

test('geração: dez algoritmos, seis setores, semente e conectividade independente', async ({ page }) => {
  const errors = await open(page);
  const results = await page.evaluate(async () => {
    const { generatePalace, GENERATOR_STYLES, GENERATOR_LAYOUTS } = await import('/palace-generator.js');
    const result = [];
    for (const style of GENERATOR_STYLES) for (const layout of GENERATOR_LAYOUTS) {
      const p = generatePalace({ style: style.key, layout: layout.key, width: 7, depth: 7, seed: 'VERIFY-1998', loops: 0, difficulty: 'none', density: 20 }), m = p.generation, seen = new Set([m.start]), q = [m.start], w = m.width, area = w * m.depth;
      for (let i = 0; i < q.length; i++) { const node = q[i], level = Math.floor(node / area), cell = node % area, x = cell % w, y = Math.floor(cell / w), mask = m.cells[level][cell]; const steps = [[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]]; for (const [dx,dy,bit] of steps) { const xx = x+dx, yy = y+dy; if (!(mask&bit) && xx>=0 && xx<w && yy>=0 && yy<m.depth) { const n = level*area+yy*w+xx; if (!seen.has(n)) { seen.add(n);q.push(n); } } } }
      result.push({ style: style.key, layout: layout.key, reached: seen.size, count: area, exit: seen.has(m.exit), disks: m.disks.every(n => seen.has(n)), spawn: p.entities.filter(e => e.type === 'spawn').length, objectCount: p.entities.length, fingerprint: m.cells[0].join(',') });
    }
    const cfg = { style: 'buffer', layout: 'dfs', width: 11, depth: 9, seed: 'SAME-MAP', difficulty: 'none' }, a = generatePalace(cfg), b = generatePalace(cfg), c = generatePalace({ ...cfg, seed: 'OTHER-MAP' });
    return { result, same: JSON.stringify(a) === JSON.stringify(b), different: JSON.stringify(a.generation.cells) !== JSON.stringify(c.generation.cells) };
  });
  expect(results.result).toHaveLength(60); expect(results.same).toBe(true); expect(results.different).toBe(true);
  for (const r of results.result) { expect(r.reached, `${r.style}/${r.layout}`).toBe(r.count); expect(r.exit).toBe(true); expect(r.disks).toBe(true); expect(r.spawn).toBe(1); expect(r.objectCount).toBeLessThanOrEqual(1500); }
  expect(new Set(results.result.filter(r => r.style === 'buffer').map(r => r.fingerprint)).size).toBeGreaterThanOrEqual(8);
  expect(errors).toEqual([]);
});

test('gerador no editor: tamanhos, prévia, geração, desfazer e JSON persistente', async ({ page }, testInfo) => {
  const errors = await open(page); const before = await page.evaluate(() => window.__ENGINE_TEST__.project());
  await page.locator('#generateMapButton').click(); await expect(page.locator('#generatorModal')).toBeVisible();
  await page.locator('#genStyle').selectOption('yellow'); await page.locator('#genLayout').selectOption('rooms'); await page.locator('#genSize').selectOption('small');
  await page.locator('#genSeed').fill('SALAS-1998'); await page.locator('#genDifficulty').selectOption('none');
  await page.locator('#genPreview').click(); await expect(page.locator('#genStats')).toContainText('49 / 49'); await expect(page.locator('#genStats')).toContainText('35 × 35 m');
  await page.screenshot({ path: testInfo.outputPath('generator-preview.png') });
  await page.locator('#genApply').click(); await expect(page.locator('#generatorModal')).toBeHidden();
  let p = await page.evaluate(() => window.__ENGINE_TEST__.project()); expect(p.generation.config.seed).toBe('SALAS-1998'); expect(p.entities.filter(e => e.type === 'disk')).toHaveLength(3);
  await page.locator('#undoButton').click(); expect((await page.evaluate(() => window.__ENGINE_TEST__.project())).entities).toEqual(before.entities);
  await page.locator('#redoButton').click(); p = await page.evaluate(() => window.__ENGINE_TEST__.project()); expect(p.generation.config.seed).toBe('SALAS-1998');
  await page.locator('#saveProject').click(); await expect(page.locator('#saveState')).toContainText('Salvo no navegador');
  await page.reload(); await page.waitForFunction(() => window.__ENGINE_TEST__); p = await page.evaluate(() => window.__ENGINE_TEST__.project()); expect(p.generation.stats.reachable).toBe(49);
  await page.locator('#playButton').click(); await expect(page.locator('body')).toHaveClass('playing');
  const view = await page.evaluate(() => window.__ENGINE_TEST__.runtime()); expect(Math.hypot(...view.camera.map((v, i) => v - view.position[i]))).toBeGreaterThan(4.5);
  await page.screenshot({ path: testInfo.outputPath('generated-yellow-game.png') });
  for (const disk of p.entities.filter(e => e.type === 'disk')) { await page.evaluate(pos => window.__ENGINE_TEST__.teleport(...pos), disk.position); await page.keyboard.press('e'); }
  await expect(page.locator('#runtimeDisks')).toHaveText('3 / 3');
  const exit = p.entities.find(e => e.type === 'exit'); await page.evaluate(pos => window.__ENGINE_TEST__.teleport(pos[0], pos[1], pos[2] + 1.5), exit.position); await page.keyboard.press('e'); expect((await page.evaluate(() => window.__ENGINE_TEST__.runtime())).won).toBe(true);
  await page.keyboard.press('Escape'); expect(errors).toEqual([]);
});

test('mapas grandes e andares: rota vertical jogável sem atravessar tetos', async ({ page }) => {
  const errors = await open(page);
  const p = await page.evaluate(async () => { const { generatePalace } = await import('/palace-generator.js'); const p = generatePalace({ style: 'palace', layout: 'hotel', width: 7, depth: 7, levels: 3, difficulty: 'none', npcs: false, density: 0, seed: 'STAIRS' }); window.__ENGINE_TEST__.load(p); return p; });
  expect(p.generation.stats.reachable).toBe(147); expect(p.generation.links).toHaveLength(2); expect(p.entities.filter(e => e.name.startsWith('Escadaria'))).toHaveLength(2);
  expect(Math.floor(p.generation.exit / 49)).toBe(2); expect(new Set(p.generation.disks.map(n => Math.floor(n / 49))).size).toBe(3);
  await page.locator('#playButton').click();
  const ramp = p.entities.find(e => e.name.startsWith('Escadaria'));
  await page.evaluate(ramp => { const t = window.__ENGINE_TEST__; t.teleport(ramp.position[0], ramp.position[1], ramp.position[2] + ramp.size[2]/2 + 1.1); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' })); for (let i = 0; i < 140; i++) t.step(.04); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' })); }, ramp);
  const state = await page.evaluate(() => window.__ENGINE_TEST__.runtime()); expect(state.position[1]).toBeCloseTo(8, 1); expect(state.grounded).toBe(true);
  await page.keyboard.press('Escape');
  const sizes = await page.evaluate(async () => { const { generatePalace } = await import('/palace-generator.js'); return ['dfs','prim','rooms','rings','open'].map(layout => { const p = generatePalace({ width: 23, depth: 23, layout, style: 'buffer', density: 0, difficulty: 'none', seed: 'LARGE' }); return { count: p.entities.length, reached: p.generation.stats.reachable }; }); });
  for (const s of sizes) { expect(s.reached).toBe(529); expect(s.count).toBeLessThan(1500); }
  await page.locator('#playButton').click();
  const second = p.entities.filter(e => e.name.startsWith('Escadaria'))[1];
  await page.evaluate(ramp => { const t = window.__ENGINE_TEST__; t.teleport(ramp.position[0], ramp.position[1], ramp.position[2] + ramp.size[2]/2 + 1.1); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' })); for (let i = 0; i < 140; i++) t.step(.04); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' })); }, second);
  expect((await page.evaluate(() => window.__ENGINE_TEST__.runtime())).position[1]).toBeCloseTo(16, 1); await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});

test('rotas geradas: corredores físicos livres, plataformas conectadas e limites claros', async ({ page }) => {
  const errors = await open(page);
  const result = await page.evaluate(async () => {
    const { generatePalace } = await import('/palace-generator.js'), { isBlocked, groundAt, validateProject } = await import('/palace-engine.js');
    const samples = [];
    for (const style of ['buffer','yellow','archive','shrine','palace','ghost']) {
      const p = generatePalace({ style, layout: style === 'ghost' ? 'braided' : 'rooms', width: 11, depth: 9, density: 80, difficulty: 'none', seed: 'PHYSICAL-ROUTE' }), g = p.generation, cs = g.config.cellSize, ox = -g.width*cs/2, oz = -g.depth*cs/2;
      let blocked = 0, unsupported = 0;
      // The terminal intentionally occupies the goal cell: the player interacts from its front.
      const navigationSolids = p.entities.filter(e => e.type !== 'exit');
      for (let i = 1; i < g.route.length; i++) {
        const a = g.route[i-1], b = g.route[i], ax = ox+(a%g.width+.5)*cs, az = oz+(Math.floor(a/g.width)+.5)*cs, bx = ox+(b%g.width+.5)*cs, bz = oz+(Math.floor(b/g.width)+.5)*cs;
        for (let s = 0; s <= 20; s++) { const x = ax+(bx-ax)*s/20, z = az+(bz-az)*s/20, y = groundAt(p.entities,x,z,.1,.62); if (!Number.isFinite(y)) unsupported++; else if (isBlocked(navigationSolids,x,y,z,.62,2.7)) blocked++; }
      }
      const parsed = validateProject(p); samples.push({ style, blocked, unsupported, persisted: parsed.generation.config.seed === 'PHYSICAL-ROUTE', lights: p.entities.some(e => e.type === 'light'), items: p.entities.some(e => e.type === 'item') });
    }
    let limit = ''; try { generatePalace({ style: 'ghost', width: 30, depth: 30, levels: 3, seed: 'OVER-LIMIT' }); } catch (e) { limit = e.message; }
    return { samples, limit };
  });
  for (const s of result.samples) { expect(s.blocked, s.style).toBe(0); expect(s.unsupported, s.style).toBe(0); expect(s.persisted).toBe(true); expect(s.lights).toBe(true); expect(s.items).toBe(true); }
  expect(result.limit).toContain('1.490'); expect(errors).toEqual([]);
});
