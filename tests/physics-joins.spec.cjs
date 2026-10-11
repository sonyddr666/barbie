const { test, expect } = require('@playwright/test');

test('rampa sólida: subir pela base, bloquear lados e fundo, teto e recuperação de bloco', async ({ page }) => {
  const errors = []; page.on('pageerror', e => { errors.push(e.message); console.log(e.message); });
  await page.goto('/editor.html?test'); await page.waitForFunction(() => window.__ENGINE_TEST__);
  await page.locator('#newProject').click(); await page.getByRole('button', { name: 'Substituir projeto' }).click();
  await page.evaluate(() => {
    const t = window.__ENGINE_TEST__, floor = t.place('floor', [0, 0, 0]); t.place('spawn', [0, 0, 6]);
    const ramp = t.place('ramp', [0, 0, 0]), upper = t.place('floor', [0, 3, -6]), overhead = t.place('ramp', [8, 3, 0]), block = t.place('box', [12, 0, 10]);
    const p = t.project(); p.entities.find(e => e.id === floor).size = [40, .3, 40]; p.entities.find(e => e.id === ramp).size = [4, 3, 8];
    p.entities.find(e => e.id === upper).size = [4, .3, 4]; p.entities.find(e => e.id === overhead).size = [4, 2, 8]; p.entities.find(e => e.id === block).size = [2, 2, 2];
    delete p.collisionVersion; p.entities.filter(e => ['floor', 'ramp'].includes(e.type)).forEach(e => e.collision = false); t.load(p);
  });
  const project = await page.evaluate(() => window.__ENGINE_TEST__.project()); expect(project.collisionVersion).toBe(2); expect(project.entities.filter(e => e.type === 'ramp').every(e => e.collision)).toBe(true);
  await page.locator('#playButton').click();
  await page.evaluate(() => { const t = window.__ENGINE_TEST__; window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' })); for (let i = 0; i < 96; i++) t.step(.04); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' })); });
  let state = await page.evaluate(() => window.__ENGINE_TEST__.runtime()); expect(state.position[1]).toBeCloseTo(3, 1); expect(state.position[2]).toBeLessThan(-4.2);
  await page.evaluate(() => { const t = window.__ENGINE_TEST__; t.teleport(3, 0, 0); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' })); for (let i = 0; i < 40; i++) t.step(.04); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA' })); });
  state = await page.evaluate(() => window.__ENGINE_TEST__.runtime()); expect(state.position[0]).toBeGreaterThan(2.55); expect(state.position[1]).toBe(0);
  await page.evaluate(() => { const t = window.__ENGINE_TEST__; t.teleport(0, 0, -5); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' })); for (let i = 0; i < 30; i++) t.step(.04); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyS' })); });
  expect((await page.evaluate(() => window.__ENGINE_TEST__.runtime())).position[2]).toBeLessThan(-4.5);
  const apex = await page.evaluate(() => { const t = window.__ENGINE_TEST__; t.teleport(8, 0, 0); t.step(.02); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })); let max = 0; for (let i = 0; i < 60; i++) { t.step(.02); max = Math.max(max, t.runtime().position[1]); } return max; });
  expect(apex).toBeLessThan(.5);
  await page.evaluate(() => { window.__ENGINE_TEST__.teleport(12, 0, 10); window.__ENGINE_TEST__.step(.04); });
  state = await page.evaluate(() => window.__ENGINE_TEST__.runtime());
  expect(await page.evaluate(async state => { const { isBlocked } = await import('/palace-engine.js'); return isBlocked(window.__ENGINE_TEST__.project().entities, ...state.position, state.radius, state.height); }, state)).toBe(false);
  expect(Math.hypot(state.position[0] - 12, state.position[2] - 10)).toBeGreaterThan(1);
  await page.keyboard.press('Escape'); expect(errors).toEqual([]);
});

test('conexões: pisos, canto em L e topo da rampa alinhados com histórico', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/editor.html?test'); await page.waitForFunction(() => window.__ENGINE_TEST__);
  const cases = await page.evaluate(async () => {
    const { createEntity } = await import('/palace-engine.js'), { snapConnection } = await import('/palace-connections.js');
    const a = createEntity('floor'), b = createEntity('floor'); b.position = [4.3, 0, .05];
    const w1 = createEntity('wall'), w2 = createEntity('wall'); w2.rotation = Math.PI / 2; w2.position = [2.3, 0, 2.1];
    const ramp = createEntity('ramp'), upper = createEntity('floor'); ramp.size = [4, 3, 8]; ramp.position = [0, 0, .2]; upper.position = [0, 3, -6.2];
    return { floor: snapConnection(b, [a], 1), corner: snapConnection(w2, [w1], 1), ramp: snapConnection(ramp, [upper], 1) };
  });
  expect(cases.floor.position[0]).toBeCloseTo(4); expect(cases.floor.position[2]).toBeCloseTo(0);
  expect(cases.corner.position[0]).toBeCloseTo(2.2); expect(cases.corner.position[2]).toBeCloseTo(1.8);
  expect(cases.ramp.position[2]).toBeCloseTo(-.2);
  await page.locator('#newProject').click(); await page.getByRole('button', { name: 'Substituir projeto' }).click();
  const id = await page.evaluate(() => { const t = window.__ENGINE_TEST__; t.place('floor', [0, 0, 0]); return t.place('floor', [4.3, 0, .05]); });
  await page.locator('#connectButton').click();
  let entity = (await page.evaluate(() => window.__ENGINE_TEST__.project())).entities.find(e => e.id === id);
  expect(entity.position[0]).toBeCloseTo(4); expect(entity.position[2]).toBeCloseTo(0);
  await page.locator('#undoButton').click(); entity = (await page.evaluate(() => window.__ENGINE_TEST__.project())).entities.find(e => e.id === id); expect(entity.position[0]).toBeCloseTo(4.3);
  await page.locator('#redoButton').click(); entity = (await page.evaluate(() => window.__ENGINE_TEST__.project())).entities.find(e => e.id === id); expect(entity.position[0]).toBeCloseTo(4);
  expect(errors).toEqual([]);
});
