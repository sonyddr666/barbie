const { test, expect } = require('@playwright/test');

test('atlas 4×4: recortes exatos, aplicação, biblioteca, histórico e JSON jogável', async ({ page }, testInfo) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/editor.html?test'); await page.waitForFunction(() => window.__ENGINE_TEST__);
  const fixture = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = c.height = 1254; const ctx = c.getContext('2d'), colors = [];
    for (let i = 0; i < 16; i++) {
      const r = 30 + i * 11, g = 220 - i * 9, b = 40 + i * 7; colors.push([r, g, b, 255]);
      const x1 = Math.round(i % 4 * c.width / 4), x2 = Math.round((i % 4 + 1) * c.width / 4), y1 = Math.round(Math.floor(i / 4) * c.height / 4), y2 = Math.round((Math.floor(i / 4) + 1) * c.height / 4);
      ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
    }
    return { png: c.toDataURL('image/png').split(',')[1], colors };
  });
  const before = await page.evaluate(() => window.__ENGINE_TEST__.project());
  await page.locator('#atlasFile').setInputFiles({ name: 'hyper-sleep-atlas.png', mimeType: 'image/png', buffer: Buffer.from(fixture.png, 'base64') });
  await expect(page.locator('#atlasCount')).toHaveText('16 / 16');
  await expect(page.locator('#texturesTab')).toBeVisible();
  const p = await page.evaluate(() => window.__ENGINE_TEST__.project());
  const keys = ['brick', 'tile', 'yellow', 'concrete', 'metal', 'wood', 'carpet', 'water', 'plaid', 'teal', 'red', 'fur', 'eye', 'teeth', 'lips', 'static'];
  expect(Object.keys(p.atlas)).toEqual(keys);
  const pixels = await page.evaluate(async keys => {
    const p = window.__ENGINE_TEST__.project(), result = [];
    for (const key of keys) {
      const image = new Image(); await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = p.assets[p.atlas[key]].data; });
      const c = document.createElement('canvas'); c.width = c.height = 256; const ctx = c.getContext('2d'); ctx.drawImage(image, 0, 0);
      result.push({ size: [image.width, image.height], center: [...ctx.getImageData(128, 128, 1, 1).data], corner: [...ctx.getImageData(255, 0, 1, 1).data] });
    }
    return result;
  }, keys);
  for (let i = 0; i < 16; i++) { expect(pixels[i].size).toEqual([256, 256]); expect(pixels[i].center).toEqual(fixture.colors[i]); expect(pixels[i].corner).toEqual(fixture.colors[i]); }
  const spawn = p.entities.find(e => e.type === 'spawn'), kone = p.entities.find(e => e.character.model === 'kone' && e.type === 'character'), boxjaw = p.entities.find(e => e.character.model === 'boxjaw' && e.type === 'character');
  expect(spawn.character.appearance.cloth.texture).toBe(p.atlas.plaid); expect(spawn.character.appearance.body.texture).toBe(p.atlas.fur);
  expect(kone.character.appearance.face.texture).toBe(p.atlas.eye); expect(kone.character.appearance.cloth.texture).toBe(p.atlas.teal);
  expect(boxjaw.character.appearance.face.texture).toBe(p.atlas.teeth); expect(boxjaw.character.appearance.side.texture).toBe(p.atlas.eye);
  expect(p.entities.find(e => e.type === 'water').material.texture).toBe(p.atlas.water);
  await page.locator('#undoButton').click();
  expect((await page.evaluate(() => window.__ENGINE_TEST__.project())).entities).toEqual(before.entities);
  await expect(page.locator('#atlasCount')).toHaveText('0 / 16');
  await page.locator('#redoButton').click(); await expect(page.locator('#atlasCount')).toHaveText('16 / 16');
  const newBox = await page.evaluate(() => window.__ENGINE_TEST__.place('box', [5, 0, 4]));
  expect((await page.evaluate(() => window.__ENGINE_TEST__.project())).entities.find(e => e.id === newBox).material.texture).toBe(p.atlas.wood);
  await page.locator('[data-tab="textures"]').click(); await page.locator('[data-tile="concrete"]').click();
  expect((await page.evaluate(() => window.__ENGINE_TEST__.project())).entities.find(e => e.id === newBox).material.texture).toBe(p.atlas.concrete);
  await page.locator('#saveProject').click(); await expect(page.locator('#saveState')).toContainText('Salvo no navegador');
  const downloadPromise = page.waitForEvent('download'); await page.locator('#exportProject').click();
  const stream = await (await downloadPromise).createReadStream(), chunks = []; for await (const chunk of stream) chunks.push(chunk);
  const json = JSON.parse(Buffer.concat(chunks).toString()); expect(json.atlas).toEqual(p.atlas); expect(json.assets[p.atlas.eye].atlasKey).toBe('eye');
  await page.reload(); await page.waitForFunction(() => window.__ENGINE_TEST__); await expect(page.locator('#atlasCount')).toHaveText('16 / 16');
  await page.locator('#playButton').click(); await expect(page.locator('body')).toHaveClass('playing');
  expect((await page.evaluate(() => window.__ENGINE_TEST__.runtime())).appearance.cloth.texture).toBe(p.atlas.plaid);
  await page.screenshot({ path: testInfo.outputPath('atlas-pipeline-test.png') });
  await page.keyboard.press('Escape'); expect(errors).toEqual([]);
});

test('atlas: imagem personalizada preservada, substituição explícita e arquivo inválido', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/editor.html?test'); await page.waitForFunction(() => window.__ENGINE_TEST__);
  const fixture = await page.evaluate(() => {
    const t = window.__ENGINE_TEST__, p = t.project(), c = document.createElement('canvas'); c.width = c.height = 256; c.getContext('2d').fillRect(0, 0, 256, 256);
    const data = c.toDataURL('image/png'); p.assets.protected = { name: 'Imagem pessoal', data }; const floor = p.entities.find(e => e.type === 'floor'); floor.material.texture = 'protected'; floor.material.preset = 'custom'; t.load(p);
    return { png: data.split(',')[1], floor: floor.id };
  });
  await page.locator('#atlasFile').setInputFiles({ name: 'atlas.png', mimeType: 'image/png', buffer: Buffer.from(fixture.png, 'base64') });
  await expect(page.locator('#atlasCount')).toHaveText('16 / 16');
  expect((await page.evaluate(() => window.__ENGINE_TEST__.project())).entities.find(e => e.id === fixture.floor).material.texture).toBe('protected');
  await page.locator('#atlasForce').check(); await page.locator('#applyAtlasButton').click();
  const p = await page.evaluate(() => window.__ENGINE_TEST__.project()); expect(p.entities.find(e => e.id === fixture.floor).material.texture).toBe(p.atlas.tile);
  await page.locator('#atlasFile').setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
  await expect(page.locator('#editorToast')).toContainText('Não foi possível importar');
  expect(await page.evaluate(() => window.__ENGINE_TEST__.project())).toEqual(p);
  expect(errors).toEqual([]);
});
