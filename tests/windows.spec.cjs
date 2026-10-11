const { test, expect } = require('@playwright/test');

async function open(page) {
  const errors = []; page.on('pageerror', e => { errors.push(e.message); console.log(e.message); });
  await page.goto('/editor.html?test'); await page.waitForFunction(() => window.__ENGINE_TEST__); return errors;
}

test('Windows: modelos, edição, botões, XP, prévia, cópia e exportação', async ({ page }, testInfo) => {
  const errors = await open(page);
  await page.locator('#newProject').click(); await page.getByRole('button', { name: 'Substituir projeto' }).click();
  await page.locator('#createWindowButton').click(); await expect(page.locator('.window-menu-preview button')).toHaveCount(14);
  await page.locator('.window-menu-preview button').filter({ hasText: 'Confirmação / 2 botões' }).click();
  const viewport = await page.locator('#viewport').boundingBox(); await page.mouse.click(viewport.x + viewport.width / 2, viewport.y + viewport.height / 2);
  await page.locator('#selectTool').click(); await expect(page.locator('#windowButtonCount')).toHaveValue('2');
  await page.locator('#windowTheme').selectOption('xp');
  for (const [id, value] of [['windowTitle', 'Recuperar memória?'], ['windowText', 'Esta janela foi editada no Palace.'], ['windowStatus', 'Arquivo pronto para restauração']]) { await page.locator('#' + id).fill(value); await page.locator('#' + id).press('Tab'); }
  await page.locator('#windowMinimize').check(); await page.locator('#windowMaximize').check(); await page.locator('#windowStatusBar').check();
  await page.locator('input[data-window-button="0"]').fill('Autorizar'); await page.locator('input[data-window-button="0"]').press('Tab');
  const id = await page.evaluate(() => window.__ENGINE_TEST__.selected());
  await page.locator('#previewWindowButton').click();
  await expect(page.locator('.system-window-panel:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name: 'Maximizar', exact: true }).click(); await expect(page.locator('.system-window-card.maximized')).toBeVisible();
  await page.getByRole('button', { name: 'Restaurar tamanho', exact: true }).click(); await page.getByRole('button', { name: 'Minimizar', exact: true }).click();
  await page.getByRole('button', { name: 'Restaurar janela', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('windows-xp-confirm.png') });
  await page.keyboard.press('Escape');
  await page.locator('#viewport>canvas').focus(); await page.keyboard.press('Control+c'); await page.keyboard.press('Control+v');
  let p = await page.evaluate(() => window.__ENGINE_TEST__.project()); expect(p.entities.at(-1).window).toEqual(p.entities.find(e => e.id === id).window);
  await page.locator('#saveProject').click(); await expect(page.locator('#saveState')).toContainText('Salvo no navegador');
  const downloadPromise = page.waitForEvent('download'); await page.locator('#exportProject').click(); const stream = await (await downloadPromise).createReadStream(), chunks = []; for await (const chunk of stream) chunks.push(chunk);
  const exported = JSON.parse(Buffer.concat(chunks).toString()); expect(exported.entities[0].window.buttons[0].label).toBe('Autorizar'); expect(exported.entities[0].window.theme).toBe('xp');
  await page.reload(); await page.waitForFunction(() => window.__ENGINE_TEST__); p = await page.evaluate(() => window.__ENGINE_TEST__.project());
  expect(p.entities.find(e => e.id === id).window.title).toBe('Recuperar memória?'); expect(p.entities.find(e => e.id === id).window.minimize).toBe(true);
  const rendering = await page.evaluate(async () => {
    const { WINDOW_PRESETS, drawWindow, windowPreset, normalizeWindow } = await import('/palace-windows.js');
    return WINDOW_PRESETS.map(p => { const c = document.createElement('canvas'), config = normalizeWindow(windowPreset(p.key)), layout = drawWindow(c, config); return { key: p.key, content: config.content, width: c.width, height: c.height, regions: layout.regions.length }; });
  });
  expect(rendering.every(r => r.width === 640 && r.height > 150)).toBe(true); expect(rendering.find(r => r.key === 'portrait').content).toBe('portrait');
  expect(errors).toEqual([]);
});

test('Windows no jogo: imagem, câmera, maximizar, minimizar, fechar, ações e checkpoint', async ({ page }, testInfo) => {
  const errors = await open(page);
  await page.locator('#newProject').click(); await page.getByRole('button', { name: 'Substituir projeto' }).click();
  const ids = await page.evaluate(async () => {
    const { configureWindow } = await import('/palace-engine.js'), t = window.__ENGINE_TEST__;
    const floor = t.place('floor', [0, 0, 0]); t.place('spawn', [0, 0, 6]); t.place('capsule', [5, 0, 7]);
    const image = t.place('window', [0, 1.6, 3]), cancel = t.place('window', [6, 1.6, 3]), noise = t.place('window', [-6, 1.6, 3]), p = t.project(); p.entities.find(e => e.id === floor).size = [24, .3, 24];
    configureWindow(p.entities.find(e => e.id === image), 'image'); const w = p.entities.find(e => e.id === image); w.window.minimize = true; w.window.maximize = true; w.window.bob = 0; w.collision = true;
    const c = document.createElement('canvas'); c.width = c.height = 32; const ctx = c.getContext('2d'); ctx.fillStyle = '#4285cb'; ctx.fillRect(0, 0, 32, 32); ctx.fillStyle = '#d7c772'; ctx.fillRect(8, 8, 16, 16); p.assets.picture = { name: 'Imagem da janela', data: c.toDataURL() }; w.material.preset = 'custom'; w.material.texture = 'picture';
    configureWindow(p.entities.find(e => e.id === cancel), 'confirm'); configureWindow(p.entities.find(e => e.id === noise), 'error');
    t.load(p); return { image, cancel, noise };
  });
  await page.locator('#playButton').click();
  await page.evaluate(() => { window.__ENGINE_TEST__.teleport(0, 0, 4.8); window.__ENGINE_TEST__.step(.02); });
  await page.keyboard.press('e'); await expect(page.locator('.system-window-panel:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name: 'Maximizar', exact: true }).click();
  let state = await page.evaluate(() => window.__ENGINE_TEST__.runtime()); expect(state.windows.find(w => w.id === ids.image).maximized).toBe(true);
  await page.getByRole('button', { name: 'Restaurar tamanho', exact: true }).click(); await page.getByRole('button', { name: 'Minimizar', exact: true }).click();
  state = await page.evaluate(() => window.__ENGINE_TEST__.runtime()); expect(state.windows.find(w => w.id === ids.image).minimized).toBe(true); expect(state.windows.find(w => w.id === ids.image).size[1]).toBeLessThan(.4);
  await page.keyboard.press('e'); await page.getByRole('button', { name: 'Restaurar janela', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('windows-image.png') }); await page.keyboard.press('Escape');
  await page.evaluate(() => window.__ENGINE_TEST__.teleport(5, 0, 7)); await page.keyboard.press('e');
  await page.evaluate(() => { window.__ENGINE_TEST__.teleport(0, 0, 4.8); window.__ENGINE_TEST__.step(.02); document.exitPointerLock(); });
  const point = await page.evaluate(id => window.__ENGINE_TEST__.windowPoint(id, 'close'), ids.image); await page.mouse.click(point.x, point.y);
  state = await page.evaluate(() => window.__ENGINE_TEST__.runtime()); expect(state.windows.find(w => w.id === ids.image).closed).toBe(true); expect(state.windows.find(w => w.id === ids.image).visible).toBe(false);
  await page.evaluate(() => { const t = window.__ENGINE_TEST__; window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' })); for (let i = 0; i < 18; i++) t.step(.04); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' })); });
  expect((await page.evaluate(() => window.__ENGINE_TEST__.runtime())).position[2]).toBeLessThan(3);
  await page.evaluate(() => window.__ENGINE_TEST__.teleport(6, 0, 4.8)); await page.keyboard.press('e'); await page.getByRole('button', { name: 'Cancelar', exact: true }).click(); expect((await page.evaluate(() => window.__ENGINE_TEST__.runtime())).noise).toBeLessThan(5);
  await page.evaluate(() => window.__ENGINE_TEST__.teleport(-6, 0, 4.8)); await page.keyboard.press('e'); await page.getByRole('button', { name: 'OK', exact: true }).click(); expect((await page.evaluate(() => window.__ENGINE_TEST__.runtime())).noise).toBeGreaterThan(80);
  for (let i = 0; i < 6; i++) await page.evaluate(() => window.__ENGINE_TEST__.damage());
  state = await page.evaluate(() => window.__ENGINE_TEST__.runtime()); expect(state.windows.find(w => w.id === ids.image).closed).toBe(false);
  await page.keyboard.press('Escape'); expect(errors).toEqual([]);
});

test('Windows: janela de imagem colocada na parede e billboard independente da câmera', async ({ page }) => {
  const errors = await open(page);
  await page.locator('#newProject').click(); await page.getByRole('button', { name: 'Substituir projeto' }).click();
  const values = await page.evaluate(async () => {
    const THREE = await import('three'), { createEntity, configureWindow, newProject, buildEntity } = await import('/palace-engine.js'), { orientSystemWindow, windowState } = await import('/palace-windows.js');
    const e = createEntity('window'); configureWindow(e, 'eye'); e.position = [2, 2, 0]; e.rotation = -.7;
    const root = buildEntity(e, newProject()), camera = new THREE.PerspectiveCamera(); camera.position.set(-3, 4, 6); orientSystemWindow(root, e, camera, 4, windowState(e.window)); const fixed = root.rotation.y;
    e.window.mount = 'floating'; e.window.facing = 'camera'; orientSystemWindow(root, e, camera, 4, windowState(e.window)); const first = root.rotation.y;
    camera.position.set(6, 4, -3); orientSystemWindow(root, e, camera, 4, windowState(e.window)); return { fixed, first, second: root.rotation.y };
  });
  expect(values.fixed).toBeCloseTo(-.7); expect(values.first).not.toBeCloseTo(values.second);
  await page.evaluate(() => window.__ENGINE_TEST__.place('wall', [0, 0, 0])); await page.locator('#focusButton').click();
  await page.locator('#createWindowButton').click(); await page.locator('.window-menu-preview button').filter({ hasText: 'Imagem / Watcher' }).click();
  await expect(page.locator('#placementHint')).toContainText('Imagem / Watcher');
  const viewport = await page.locator('#viewport').boundingBox(); await page.mouse.click(viewport.x + viewport.width / 2, viewport.y + viewport.height / 2);
  const windowEntity = (await page.evaluate(() => window.__ENGINE_TEST__.project())).entities.find(e => e.type === 'window');
  expect(windowEntity.window.mount).toBe('wall'); expect(windowEntity.window.facing).toBe('fixed'); expect(windowEntity.position[2]).toBeGreaterThan(.2); expect(Math.abs(windowEntity.rotation)).toBeCloseTo(Math.PI, 3);
  expect(errors).toEqual([]);
});

test('Windows: abas e campos reais, menus e progresso pausável', async ({ page }, testInfo) => {
  const errors = await open(page);
  await page.locator('#newProject').click(); await page.getByRole('button', { name: 'Substituir projeto' }).click();
  const ids = await page.evaluate(async () => {
    const { configureWindow } = await import('/palace-engine.js'), t = window.__ENGINE_TEST__;
    const floor = t.place('floor', [0, 0, 0]); t.place('spawn', [0, 0, 6]); const properties = t.place('window', [0, 1.6, 3]), progress = t.place('window', [6, 1.6, 3]), p = t.project(); p.entities.find(e => e.id === floor).size = [24, .3, 24];
    configureWindow(p.entities.find(e => e.id === properties), 'properties'); const w = p.entities.find(e => e.id === properties); w.window.theme = 'xp'; w.window.menuBar = true; w.window.minimize = true; w.window.maximize = true;
    configureWindow(p.entities.find(e => e.id === progress), 'progress'); t.load(p); return { properties, progress };
  });
  await page.locator('#playButton').click(); await page.evaluate(() => window.__ENGINE_TEST__.teleport(0, 0, 4.8)); await page.keyboard.press('e');
  await page.getByRole('button', { name: 'Memória', exact: true }).click();
  let state = await page.evaluate(() => window.__ENGINE_TEST__.runtime()); expect(state.windows.find(w => w.id === ids.properties).tab).toBe(1);
  await page.locator('.system-window-fields input').first().fill('COB_TEST.EXE'); await page.locator('.system-window-fields input').first().press('Tab');
  state = await page.evaluate(() => window.__ENGINE_TEST__.runtime()); expect(state.windows.find(w => w.id === ids.properties).fields[0]).toContain('COB_TEST.EXE');
  await page.getByRole('button', { name: 'Arquivo', exact: true }).click(); await expect(page.getByRole('button', { name: 'Sobre o processo', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sobre o processo', exact: true }).click(); await page.screenshot({ path: testInfo.outputPath('windows-properties-xp.png') });
  await page.keyboard.press('Escape'); await page.evaluate(() => { window.__ENGINE_TEST__.teleport(6, 0, 4.8); window.__ENGINE_TEST__.step(.02); }); await page.keyboard.press('e');
  await page.getByRole('button', { name: 'Pausar', exact: true }).click(); await page.keyboard.press('Escape');
  const before = (await page.evaluate(() => window.__ENGINE_TEST__.runtime())).windows.find(w => w.id === ids.progress).progress;
  await page.evaluate(() => { for (let i = 0; i < 20; i++) window.__ENGINE_TEST__.step(.04); });
  expect((await page.evaluate(() => window.__ENGINE_TEST__.runtime())).windows.find(w => w.id === ids.progress).progress).toBe(before);
  await page.keyboard.press('e'); await page.getByRole('button', { name: 'Retomar', exact: true }).click(); await page.keyboard.press('Escape');
  await page.evaluate(() => { for (let i = 0; i < 20; i++) window.__ENGINE_TEST__.step(.04); });
  expect((await page.evaluate(() => window.__ENGINE_TEST__.runtime())).windows.find(w => w.id === ids.progress).progress).toBeGreaterThan(before);
  await page.keyboard.press('Escape'); expect(errors).toEqual([]);
});
