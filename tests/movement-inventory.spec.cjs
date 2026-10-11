const { test, expect } = require('@playwright/test');

async function open(page, engine = true) {
  const errors = []; page.on('pageerror', e => { errors.push(e.message); console.log(e.message); });
  await page.goto(engine ? '/editor.html?test' : '/?test');
  await page.waitForFunction(engine ? () => window.__ENGINE_TEST__ : () => window.__PALACE_TEST__);
  return errors;
}

test('movimento: pulo único, aterrissagem em caixa, teto e passagem agachada', async ({ page }) => {
  const errors = await open(page);
  await page.locator('#newProject').click(); await page.getByRole('button', { name: 'Substituir projeto' }).click();
  await page.evaluate(() => {
    const t = window.__ENGINE_TEST__, floor = t.place('floor', [0, 0, 0]); t.place('spawn', [0, 0, 6]);
    const low = t.place('wall', [0, 1.5, 0]), ceiling = t.place('wall', [-5, 3.1, 0]), box = t.place('box', [4, 0, 0]), p = t.project();
    p.entities.find(e => e.id === floor).size = [24, .3, 24]; p.entities.find(e => e.id === low).size = [6, .4, 3];
    p.entities.find(e => e.id === ceiling).size = [3, .4, 4]; p.entities.find(e => e.id === box).size = [2, 1, 2]; t.load(p);
  });
  await page.locator('#playButton').click();
  const apex = await page.evaluate(() => {
    const t = window.__ENGINE_TEST__; t.teleport(4, 0, 3); t.step(.016);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
    let max = 0; for (let i = 0; i < 35; i++) { if (i === 7) { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })); } t.step(.02); max = Math.max(max, t.runtime().position[1]); } return max;
  });
  expect(apex).toBeGreaterThan(1.5); expect(apex).toBeLessThan(2.1);
  await page.evaluate(() => {
    const t = window.__ENGINE_TEST__; t.teleport(4, 0, 3); t.step(.016);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    for (let i = 0; i < 21; i++) t.step(.04); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' })); for (let i = 0; i < 20; i++) t.step(.04);
  });
  let state = await page.evaluate(() => window.__ENGINE_TEST__.runtime()); expect(state.position[1]).toBeCloseTo(1, 1); expect(state.grounded).toBe(true);
  const ceilingApex = await page.evaluate(() => { const t = window.__ENGINE_TEST__; t.teleport(-5, 0, 0); t.step(.016); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })); let max = 0; for (let i = 0; i < 60; i++) { t.step(.02); max = Math.max(max, t.runtime().position[1]); } return max; });
  expect(ceilingApex).toBeLessThan(.6);
  await page.evaluate(() => { const t = window.__ENGINE_TEST__; t.teleport(0, 0, 2.5); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' })); for (let i = 0; i < 25; i++) t.step(.04); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' })); });
  expect((await page.evaluate(() => window.__ENGINE_TEST__.runtime())).position[2]).toBeGreaterThan(1.7);
  await page.evaluate(() => { const t = window.__ENGINE_TEST__; window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ControlLeft' })); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' })); for (let i = 0; i < 25; i++) t.step(.04); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ControlLeft' })); t.step(.04); });
  state = await page.evaluate(() => window.__ENGINE_TEST__.runtime()); expect(state.position[2]).toBeLessThan(.5); expect(state.crouched).toBe(true);
  await page.evaluate(() => { const t = window.__ENGINE_TEST__; window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' })); for (let i = 0; i < 45; i++) t.step(.04); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' })); });
  expect((await page.evaluate(() => window.__ENGINE_TEST__.runtime())).crouched).toBe(false);
  await page.keyboard.press('Escape'); expect(errors).toEqual([]);
});

test('inventário: pegar, agrupar, usar cura, listar, checkpoint e caixa removida', async ({ page }, testInfo) => {
  const errors = await open(page);
  await page.locator('#newProject').click(); await page.getByRole('button', { name: 'Substituir projeto' }).click();
  const ids = await page.evaluate(() => {
    const t = window.__ENGINE_TEST__, floor = t.place('floor', [0, 0, 0]); t.place('spawn', [0, 0, 6]); t.place('capsule', [5, 0, 6]);
    const key = t.place('item', [-3, 0, 5]), heal = t.place('item', [0, 0, 3]), heal2 = t.place('item', [0, 0, 0]), box = t.place('box', [3, 0, 4]);
    const disk = t.place('disk', [-6, 0, 3]), exit = t.place('exit', [-6, 0, 0]), p = t.project(); p.entities.find(e => e.id === floor).size = [24, .3, 24];
    Object.assign(p.entities.find(e => e.id === key).pickup, { name: 'Chave A', itemId: 'key-a', kind: 'key' });
    for (const id of [heal, heal2]) Object.assign(p.entities.find(e => e.id === id).pickup, { name: 'Cápsula portátil', itemId: 'capsule', kind: 'heal', quantity: id === heal ? 2 : 1, heal: 2 });
    Object.assign(p.entities.find(e => e.id === box).pickup, { enabled: true, name: 'Caixa de peças', itemId: 'parts', quantity: 3 }); t.load(p); return { key, heal, heal2, box, disk, exit };
  });
  await page.locator('#playButton').click();
  for (const pos of [[-3, 0, 5], [0, 0, 3]]) { await page.evaluate(pos => window.__ENGINE_TEST__.teleport(...pos), pos); await page.keyboard.press('e'); }
  await expect(page.locator('#runtimeDisks')).toHaveText('0 / 1');
  await page.evaluate(() => window.__ENGINE_TEST__.teleport(0, 0, 0)); await page.keyboard.press('e'); await page.keyboard.press('e');
  let state = await page.evaluate(() => window.__ENGINE_TEST__.runtime()); expect(state.inventory.find(i => i.kind === 'heal').quantity).toBe(3); expect(state.collected.filter(i => i === ids.heal2)).toHaveLength(1);
  await page.keyboard.press('i'); await expect(page.locator('.inventory-panel')).toBeVisible();
  await page.locator('.inventory-filter').selectOption('heal'); await page.locator('.inventory-use').click();
  expect((await page.evaluate(() => window.__ENGINE_TEST__.runtime())).inventory.find(i => i.kind === 'heal').quantity).toBe(3);
  await page.keyboard.press('Escape'); await expect(page.locator('body')).toHaveClass('playing');
  await page.evaluate(() => { window.__ENGINE_TEST__.damage(); window.__ENGINE_TEST__.damage(); });
  await page.keyboard.press('i'); await page.locator('.inventory-use').click();
  state = await page.evaluate(() => window.__ENGINE_TEST__.runtime()); expect(state.health).toBe(6); expect(state.inventory.find(i => i.kind === 'heal').quantity).toBe(2);
  await page.locator('.inventory-filter').selectOption('all'); await page.screenshot({ path: testInfo.outputPath('inventory.png') });
  await page.keyboard.press('Escape'); await page.evaluate(() => window.__ENGINE_TEST__.teleport(5, 0, 6)); await page.keyboard.press('e');
  await page.evaluate(() => window.__ENGINE_TEST__.teleport(1.9, 0, 4)); await page.keyboard.press('e');
  state = await page.evaluate(() => window.__ENGINE_TEST__.runtime()); expect(state.inventory.find(i => i.code === 'parts').quantity).toBe(3);
  await page.evaluate(() => { const t = window.__ENGINE_TEST__; window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' })); for (let i = 0; i < 15; i++) t.step(.04); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD' })); });
  expect((await page.evaluate(() => window.__ENGINE_TEST__.runtime())).position[0]).toBeGreaterThan(3.5);
  for (let i = 0; i < 6; i++) await page.evaluate(() => window.__ENGINE_TEST__.damage());
  state = await page.evaluate(() => window.__ENGINE_TEST__.runtime()); expect(state.inventory.some(i => i.code === 'parts')).toBe(false); expect(state.inventory.find(i => i.kind === 'heal').quantity).toBe(2); expect(state.collected).not.toContain(ids.box);
  await page.evaluate(() => window.__ENGINE_TEST__.teleport(-6, 0, 1.3)); await page.keyboard.press('e');
  expect((await page.evaluate(() => window.__ENGINE_TEST__.runtime())).won).toBe(false);
  await page.evaluate(() => window.__ENGINE_TEST__.teleport(-6, 0, 3)); await page.keyboard.press('e'); await expect(page.locator('#runtimeDisks')).toHaveText('1 / 1');
  await page.keyboard.press('i'); await page.locator('.inventory-filter').selectOption('disk'); await expect(page.locator('.inventory-item')).toHaveCount(1);
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); expect(errors).toEqual([]);
});

test('jogo principal: pular, agachar e guardar cura, chave e registro no backup', async ({ page }) => {
  const errors = await open(page, false); await page.locator('#play').click();
  const apex = await page.evaluate(() => { const t = window.__PALACE_TEST__; t.teleport(0, 0, 5); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })); let max = 0; for (let i = 0; i < 35; i++) { t.step(.02); max = Math.max(max, t.state().player[1]); } return max; });
  expect(apex).toBeGreaterThan(1.5);
  await page.keyboard.press('c'); await page.evaluate(() => window.__PALACE_TEST__.step(.04)); expect((await page.evaluate(() => window.__PALACE_TEST__.state())).crouched).toBe(true);
  await page.keyboard.press('c');
  for (const pos of [[2, 0, 3], [-20, 0, 2], [20, 0, 2]]) { await page.evaluate(pos => window.__PALACE_TEST__.teleport(...pos), pos); await page.keyboard.press('e'); }
  await page.keyboard.press('i'); await expect(page.locator('.inventory-panel')).toBeVisible(); await expect(page.locator('.inventory-item')).toHaveCount(3);
  await page.locator('.inventory-filter').selectOption('note'); await expect(page.locator('.inventory-details')).toContainText('Cada cápsula');
  await page.keyboard.press('Escape'); await page.evaluate(() => window.__PALACE_TEST__.teleport(3.8, 0, 8.5)); await page.keyboard.press('e');
  await page.reload(); await page.waitForFunction(() => window.__PALACE_TEST__); await page.locator('#play').click();
  const state = await page.evaluate(() => window.__PALACE_TEST__.state()); expect(state.inventory).toHaveLength(3); expect(state.picked).toHaveLength(3);
  expect(errors).toEqual([]);
});

test('editor: configurar item pela interface, copiar e recuperar as propriedades', async ({ page }) => {
  const errors = await open(page);
  await page.locator('#viewTop').click(); await page.locator('.palette-item[data-type="item"][data-kind="heal"]').click();
  const viewport = await page.locator('#viewport').boundingBox(); await page.mouse.click(viewport.x + viewport.width / 2, viewport.y + viewport.height / 2);
  await expect(page.locator('#pickupKind')).toHaveValue('heal');
  for (const [id, value] of [['pickupName', 'Cápsula do laboratório'], ['pickupId', 'cura-lab'], ['pickupQuantity', '3'], ['pickupHeal', '4'], ['pickupDescription', 'Três doses de dados preservados.']]) { await page.locator('#' + id).fill(value); await page.locator('#' + id).press('Tab'); }
  const selected = await page.evaluate(() => window.__ENGINE_TEST__.selected());
  await page.locator('#viewport>canvas').focus(); await page.keyboard.press('Control+c'); await page.keyboard.press('Control+v');
  let p = await page.evaluate(() => window.__ENGINE_TEST__.project());
  expect(p.entities.at(-1).pickup).toEqual(p.entities.find(e => e.id === selected).pickup);
  await page.locator('#saveProject').click(); await expect(page.locator('#saveState')).toContainText('Salvo no navegador');
  await page.reload(); await page.waitForFunction(() => window.__ENGINE_TEST__); p = await page.evaluate(() => window.__ENGINE_TEST__.project());
  expect(p.entities.find(e => e.id === selected).pickup).toMatchObject({ enabled: true, name: 'Cápsula do laboratório', itemId: 'cura-lab', quantity: 3, heal: 4, kind: 'heal' });
  expect(errors).toEqual([]);
});
