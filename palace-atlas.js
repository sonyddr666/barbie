import { ATLAS_TILES, uid } from './palace-engine.js';

export async function sliceAtlas(file, resolution = 256) {
  if (!file || file.size > 20 * 1024 * 1024) throw new Error('Selecione uma imagem de até 20 MB.');
  if (![128, 256, 512].includes(resolution)) throw new Error('Resolução de textura inválida.');
  const url = URL.createObjectURL(file), image = new Image();
  try {
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Não foi possível ler esta imagem. Use PNG, JPEG ou WebP.')); image.src = url; });
    if (image.width < 256 || image.height < 256 || Math.abs(image.width / image.height - 1) > .02) throw new Error('O atlas precisa ser quadrado, com 4 × 4 texturas e pelo menos 256 × 256 pixels.');
    const assets = {}, atlas = {};
    for (const tile of ATLAS_TILES) {
      // Independent rounded boundaries also support the supplied 1254px atlas (not divisible by four).
      const x1 = Math.round(image.width * tile.column / 4), x2 = Math.round(image.width * (tile.column + 1) / 4);
      const y1 = Math.round(image.height * tile.row / 4), y2 = Math.round(image.height * (tile.row + 1) / 4);
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = resolution;
      const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, x1 + 1, y1 + 1, x2 - x1 - 2, y2 - y1 - 2, 0, 0, resolution, resolution);
      const id = uid(); atlas[tile.key] = id; assets[id] = { name: tile.label, atlasKey: tile.key, data: canvas.toDataURL('image/png') };
    }
    return { assets, atlas, name: file.name, width: image.width, height: image.height };
  } finally { URL.revokeObjectURL(url); }
}
