const { test, expect } = require('@playwright/test');

async function open(page) {
  const errors = []; page.on('pageerror', e => { errors.push(e.message); console.log(e.message); });
  await page.goto('/editor.html?test'); await page.waitForFunction(() => window.__ENGINE_TEST__); return errors;
}

test('todos os modelos: cada material do inspector controla uma superfície real', async ({ page }, testInfo) => {
  const errors = await open(page);
  const audit = await page.evaluate(async () => {
    const { createEntity, newProject, buildCharacter, characterSlots, disposeObject } = await import('/palace-engine.js');
    const result = [];
    for (const model of ['cob', 'kone', 'boxjaw', 'eros', 'sysadmin', 'cobaia']) {
      const e = createEntity('character', model), root = buildCharacter(e.character, newProject()), slots = characterSlots(model), counts = {};
      root.traverse(o => { if (o.userData.materialSlot) counts[o.userData.materialSlot] = (counts[o.userData.materialSlot] || 0) + 1; });
      const colors = Object.fromEntries(Object.entries(root.userData.materials).map(([k, m]) => [k, '#' + m.color.getHexString()]));
      let wingUVs = true; if (model === 'eros') root.traverse(o => { if (o.userData.materialSlot === 'wings') { const uv = o.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) if (uv.getX(i) < -.0001 || uv.getX(i) > 1.0001 || uv.getY(i) < -.0001 || uv.getY(i) > 1.0001) wingUVs = false; } });
      result.push({ model, slots: slots.map(s => s.key), counts, colors, wingUVs }); disposeObject(root);
    }
    return result;
  });
  for (const model of audit) for (const slot of model.slots) expect(model.counts[slot], `${model.model}/${slot}`).toBeGreaterThan(0);
  expect(audit.find(a => a.model === 'eros').wingUVs).toBe(true);
  expect(audit.find(a => a.model === 'cobaia').counts.screen).toBe(1);
  expect(audit.find(a => a.model === 'sysadmin').counts.eyes).toBe(2);
  const id = await page.evaluate(() => window.__ENGINE_TEST__.place('character', [0, 0, 1], 'eros'));
  await page.locator('#materialSlot').selectOption('wings');
  await expect(page.locator('#materialPartNote')).toContainText('Asas / membrana');
  await page.locator('#materialPreset').selectOption('plaid');
  await page.evaluate(() => { const i = document.getElementById('materialColor'); i.value = '#39dd55'; i.dispatchEvent(new Event('change')); });
  let p = await page.evaluate(() => window.__ENGINE_TEST__.project()); const source = p.entities.find(e => e.id === id);
  expect(source.character.appearance.wings.color).toBe('#39dd55'); expect(source.character.appearance.body.color).not.toBe('#39dd55'); expect(source.character.appearance.torso.color).not.toBe('#39dd55');
  await page.locator('#materialSlot').selectOption('face'); await expect(page.locator('#materialPartNote')).toContainText('Boca / dentes');
  await page.locator('#focusButton').click(); await page.screenshot({ path: testInfo.outputPath('eros-separate-materials.png') });
  await page.locator('#duplicateButton').click(); p = await page.evaluate(() => window.__ENGINE_TEST__.project()); expect(p.entities.at(-1).character.appearance).toEqual(source.character.appearance);
  await page.locator('#saveProject').click(); await expect(page.locator('#saveState')).toContainText('Salvo no navegador');
  await page.reload(); await page.waitForFunction(() => window.__ENGINE_TEST__); p = await page.evaluate(() => window.__ENGINE_TEST__.project());
  expect(p.entities.find(e => e.id === id).character.appearance.wings.color).toBe('#39dd55');
  expect(errors).toEqual([]);
});

test('materiais legados: cabeça de Eros, asas e tronco são preservados e separados', async ({ page }) => {
  const errors = await open(page);
  const id = await page.evaluate(() => {
    const t = window.__ENGINE_TEST__, id = t.place('character', [0, 5, 0], 'eros'), p = t.project(), e = p.entities.find(e => e.id === id), a = e.character.appearance;
    const c = document.createElement('canvas'); c.width = c.height = 16; c.getContext('2d').fillRect(0, 0, 16, 16); const data = c.toDataURL();
    p.assets.head = { name: 'Carpete da cabeça', data }; p.assets.cloth = { name: 'Tecido antigo', data };
    for (const key of Object.keys(a)) if (!['body', 'cloth', 'face', 'side', 'accent'].includes(key)) delete a[key];
    a.body.preset = 'custom'; a.body.texture = 'head'; a.body.color = '#ffffff'; a.cloth.preset = 'custom'; a.cloth.texture = 'cloth'; a.cloth.color = '#8a1944'; a.accent.color = '#dcaadd';
    t.load(p); t.select(id); return id;
  });
  const before = (await page.evaluate(() => window.__ENGINE_TEST__.project())).entities.find(e => e.id === id).character.appearance;
  expect(before.body.texture).toBe('head'); expect(before.torso.texture).toBe('cloth'); expect(before.wings.texture).toBe('cloth'); expect(before.horns.color).toBe('#dcaadd'); expect(before.emblem.color).toBe('#dcaadd');
  await page.locator('#materialSlot').selectOption('wings');
  await page.evaluate(() => { const i = document.getElementById('materialColor'); i.value = '#112233'; i.dispatchEvent(new Event('change')); });
  const after = (await page.evaluate(() => window.__ENGINE_TEST__.project())).entities.find(e => e.id === id).character.appearance;
  expect(after.wings.color).toBe('#112233'); expect(after.torso.color).toBe('#8a1944'); expect(after.body.texture).toBe('head');
  await page.locator('#undoButton').click(); expect((await page.evaluate(() => window.__ENGINE_TEST__.project())).entities.find(e => e.id === id).character.appearance).toEqual(before);
  expect(errors).toEqual([]);
});

test('Cobaia: telas independentes e wireframe editável por cor', async ({ page }) => {
  const errors = await open(page); const id = await page.evaluate(() => window.__ENGINE_TEST__.place('character', [0, 0, 1], 'cobaia'));
  await page.locator('#materialSlot').selectOption('screen'); await page.locator('#materialPreset').selectOption('lips');
  let a = (await page.evaluate(() => window.__ENGINE_TEST__.project())).entities.find(e => e.id === id).character.appearance;
  expect(a.screen.preset).toBe('lips'); expect(a.face.preset).toBe('static');
  await page.locator('#materialSlot').selectOption('wireframe'); await expect(page.locator('#textureEdit')).toBeDisabled();
  await page.evaluate(() => { const i = document.getElementById('materialColor'); i.value = '#ff3399'; i.dispatchEvent(new Event('change')); });
  a = (await page.evaluate(() => window.__ENGINE_TEST__.project())).entities.find(e => e.id === id).character.appearance;
  expect(a.wireframe.color).toBe('#ff3399'); expect(a.body.color).not.toBe('#ff3399'); expect(errors).toEqual([]);
});
