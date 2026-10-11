const { test, expect } = require('@playwright/test');

async function editor(page) {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/editor.html?test'); await page.waitForFunction(() => window.__ENGINE_TEST__);
  return errors;
}

test('Ctrl+C/V: cópia independente, histórico, texto e texturas entre projetos', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const errors = await editor(page);
  const id = await page.evaluate(() => {
    const t = window.__ENGINE_TEST__, id = t.place('character', [0, 0, 0], 'kone'), p = t.project();
    const c = document.createElement('canvas'); c.width = c.height = 16; c.getContext('2d').fillRect(0, 0, 16, 16);
    p.assets['copy-texture'] = { name: 'Roupa do NPC', data: c.toDataURL('image/png') };
    const e = p.entities.find(e => e.id === id); e.character.appearance.cloth.preset = 'custom'; e.character.appearance.cloth.texture = 'copy-texture';
    t.load(p); t.select(id); return id;
  });
  await page.locator('#characterHealth').fill('2'); await page.locator('#characterHealth').press('Tab');
  await page.locator('#characterMovement').selectOption('follow');
  const before = await page.evaluate(() => window.__ENGINE_TEST__.project());
  await page.locator('#viewport>canvas').focus();
  await page.keyboard.press('Control+c'); await page.keyboard.press('Control+v');
  await expect(page.locator('#entityCount')).toHaveText(String(before.entities.length + 1));
  let project = await page.evaluate(() => window.__ENGINE_TEST__.project());
  const copy = project.entities.at(-1), source = project.entities.find(e => e.id === id);
  expect(copy.id).not.toBe(source.id); expect(copy.character).toEqual(source.character); expect(copy.material).toEqual(source.material);
  expect(copy.position[0]).not.toBe(source.position[0]); expect(project.assets[copy.character.appearance.cloth.texture]).toEqual(before.assets['copy-texture']);
  await page.keyboard.press('Control+z'); await expect(page.locator('#entityCount')).toHaveText(String(before.entities.length));
  await page.keyboard.press('Control+Shift+z'); await expect(page.locator('#entityCount')).toHaveText(String(before.entities.length + 1));
  await page.locator('#characterHealth').fill('9'); await page.locator('#characterHealth').press('Tab');
  project = await page.evaluate(() => window.__ENGINE_TEST__.project());
  expect(project.entities.find(e => e.id === id).character.maxHealth).toBe(2);
  expect(project.entities.at(-1).character.maxHealth).toBe(9);
  // Native text editing must not paste a scene entity.
  await page.locator('#characterDialogue').fill('Texto normal');
  await page.locator('#characterDialogue').press('Control+a'); await page.locator('#characterDialogue').press('Control+c');
  await page.locator('#characterDialogue').fill(''); await page.locator('#characterDialogue').press('Control+v');
  await expect(page.locator('#characterDialogue')).toHaveValue('Texto normal');
  expect((await page.evaluate(() => window.__ENGINE_TEST__.project())).entities).toHaveLength(before.entities.length + 1);
  // The engine's object clipboard also retains images after replacing the entire map.
  await page.locator('#newProject').click(); await page.getByRole('button', { name: 'Substituir projeto' }).click();
  await page.locator('#pasteObjectButton').click();
  project = await page.evaluate(() => window.__ENGINE_TEST__.project());
  expect(project.entities).toHaveLength(1); expect(project.entities[0].character.maxHealth).toBe(2);
  expect(project.entities[0].character.movement).toBe('follow'); expect(project.assets['copy-texture'].data).toMatch(/^data:image\/png/);
  await page.locator('#saveProject').click(); await expect(page.locator('#saveState')).toContainText('Salvo no navegador');
  await page.reload(); await page.waitForFunction(() => window.__ENGINE_TEST__);
  project = await page.evaluate(() => window.__ENGINE_TEST__.project());
  expect(project.entities[0].character.maxHealth).toBe(2); expect(project.entities[0].character.appearance.cloth.preset).toBe('custom');
  expect(errors).toEqual([]);
});

test('NPC: movimento, vida, morte, checkpoint, invulnerabilidade e poses restauradas', async ({ page }, testInfo) => {
  const errors = await editor(page);
  await page.locator('#newProject').click(); await page.getByRole('button', { name: 'Substituir projeto' }).click();
  const npcId = await page.evaluate(() => {
    const t = window.__ENGINE_TEST__, floor = t.place('floor', [0, 0, 0]); t.place('spawn', [0, 0, 6]); t.place('capsule', [2, 0, 6]);
    const id = t.place('character', [0, 0, 1], 'kone'), p = t.project();
    p.entities.find(e => e.id === floor).size = [20, .3, 20]; t.load(p); t.select(id); return id;
  });
  await page.locator('#characterHealth').fill('2'); await page.locator('#characterHealth').press('Tab');
  await page.locator('#characterMovement').selectOption('follow');
  const before = await page.evaluate(id => ({ project: window.__ENGINE_TEST__.project(), poses: window.__ENGINE_TEST__.poses(id) }), npcId);
  await page.locator('#playButton').click();
  await page.evaluate(() => { for (let i = 0; i < 30; i++) window.__ENGINE_TEST__.step(.04); });
  let state = await page.evaluate(() => window.__ENGINE_TEST__.runtime());
  expect(state.actors.find(a => a.id === npcId).position[2]).toBeGreaterThan(2.5);
  await page.evaluate(() => window.__ENGINE_TEST__.teleport(2, 0, 6)); await page.keyboard.press('e');
  await page.keyboard.press('p');
  state = await page.evaluate(() => window.__ENGINE_TEST__.runtime());
  expect(state.actors.find(a => a.id === npcId).health).toBe(1);
  await expect(page.locator('.actor-label small')).toHaveText('1 / 2 HP');
  await page.screenshot({ path: testInfo.outputPath('npc-health.png') });
  await page.evaluate(() => window.__ENGINE_TEST__.step(.3)); await page.keyboard.press('p');
  state = await page.evaluate(() => window.__ENGINE_TEST__.runtime());
  expect(state.actors.find(a => a.id === npcId).alive).toBe(false);
  expect(state.near).not.toBe(npcId);
  for (let i = 0; i < 6; i++) await page.evaluate(() => window.__ENGINE_TEST__.damage());
  state = await page.evaluate(() => window.__ENGINE_TEST__.runtime());
  expect(state.actors.find(a => a.id === npcId).health).toBe(2); expect(state.actors.find(a => a.id === npcId).alive).toBe(true);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.__ENGINE_TEST__.project())).toEqual(before.project);
  expect(await page.evaluate(id => window.__ENGINE_TEST__.poses(id), npcId)).toEqual(before.poses);
  await page.evaluate(id => window.__ENGINE_TEST__.select(id), npcId); await page.locator('#characterInvulnerable').check();
  await page.locator('#playButton').click();
  await page.evaluate(() => window.__ENGINE_TEST__.teleport(0, 0, 3)); await page.keyboard.press('p');
  state = await page.evaluate(() => window.__ENGINE_TEST__.runtime());
  expect(state.actors.find(a => a.id === npcId).health).toBe(2);
  await expect(page.locator('#editorToast')).toContainText('invulnerável');
  await page.keyboard.press('Escape'); expect(errors).toEqual([]);
});
