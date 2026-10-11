export const ITEM_KINDS = { disk: 'Memória', key: 'Chave', heal: 'Consumível', note: 'Registro', material: 'Objeto' };
export const ITEM_ICONS = { disk: '▧', key: '⚿', heal: '♡', note: '▤', material: '◈' };
export class Inventory {
  constructor(items = []) { this.restore(items); }
  restore(items = []) {
    this.items = new Map();
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (!item || typeof item.id !== 'string' || !ITEM_KINDS[item.kind]) continue;
      const quantity = Math.min(10000, Math.max(0, Math.floor(Number(item.quantity) || 0))); if (!quantity) continue;
      const code = String(item.code || item.id).slice(0, 100), id = item.kind + ':' + code;
      this.items.set(id, { id, code, name: String(item.name || 'Objeto').slice(0, 100), description: String(item.description || '').slice(0, 4000), kind: item.kind, quantity, heal: Math.min(10000, Math.max(0, Math.floor(Number(item.heal) || 0))) });
    }
  }
  add(item) {
    const code = String(item.code || item.id).slice(0, 100), id = item.kind + ':' + code, existing = this.items.get(id);
    if (existing) existing.quantity = Math.min(10000, existing.quantity + item.quantity);
    else this.items.set(id, { ...item, id, code });
  }
  consume(id, amount = 1) { const item = this.items.get(id); if (!item || item.quantity < amount) return false; item.quantity -= amount; if (!item.quantity) this.items.delete(id); return true; }
  snapshot() { return structuredClone([...this.items.values()]); }
}

export class InventoryPanel {
  constructor({ parent = document.body, inventory, onClose, onUse }) {
    this.inventory = inventory; this.onClose = onClose; this.onUse = onUse; this.selected = null; this.isOpen = false;
    this.element = document.createElement('section'); this.element.className = 'inventory-panel hidden'; this.element.setAttribute('role', 'dialog'); this.element.setAttribute('aria-modal', 'true'); this.element.setAttribute('aria-label', 'Inventário');
    this.element.innerHTML = '<div class="inventory-card"><header><div><span>COB-01 / ARQUIVOS PESSOAIS</span><h2>Inventário</h2></div><button class="inventory-close" aria-label="Fechar inventário">×</button></header><div class="inventory-tools"><input class="inventory-search" type="search" placeholder="Buscar item..." aria-label="Buscar item"><select class="inventory-filter" aria-label="Categoria de itens"><option value="all">Todos os itens</option><option value="disk">Memórias</option><option value="key">Chaves</option><option value="heal">Consumíveis</option><option value="note">Registros</option><option value="material">Objetos</option></select></div><div class="inventory-content"><div class="inventory-list"></div><div class="inventory-details"></div></div><footer><span class="inventory-total"></span><span>I / ESC · fechar</span></footer></div>';
    parent.append(this.element); this.closeButton = this.element.querySelector('.inventory-close'); this.closeButton.onclick = () => this.close();
    this.element.querySelector('.inventory-search').oninput = () => this.render(); this.element.querySelector('.inventory-filter').onchange = () => this.render();
  }
  open() { this.isOpen = true; this.element.classList.remove('hidden'); this.render(); this.closeButton.focus(); }
  close(silent = false) { if (!this.isOpen) return; this.isOpen = false; this.element.classList.add('hidden'); if (!silent) this.onClose?.(); }
  dispose() { this.close(true); this.element.remove(); }
  render() {
    const items = this.inventory.snapshot(), query = this.element.querySelector('.inventory-search').value.toLowerCase(), filter = this.element.querySelector('.inventory-filter').value;
    const filtered = items.filter(i => (filter === 'all' || i.kind === filter) && `${i.name} ${i.description}`.toLowerCase().includes(query));
    if (!filtered.some(i => i.id === this.selected)) this.selected = filtered[0]?.id || null;
    const list = this.element.querySelector('.inventory-list'); list.replaceChildren();
    if (!filtered.length) { const p = document.createElement('p'); p.className = 'inventory-empty'; p.textContent = items.length ? 'Nenhum item corresponde à busca.' : 'Seu inventário está vazio. Aproxime-se de um objeto e pressione E para pegar.'; list.append(p); }
    for (const item of filtered) {
      const b = document.createElement('button'); b.className = 'inventory-item' + (item.id === this.selected ? ' selected' : ''); b.dataset.itemId = item.id;
      const icon = document.createElement('span'); icon.className = 'inventory-icon'; icon.textContent = ITEM_ICONS[item.kind];
      const name = document.createElement('span'); name.className = 'inventory-item-name'; name.textContent = item.name;
      const count = document.createElement('b'); count.textContent = '×' + item.quantity; b.append(icon, name, count);
      b.onclick = () => { this.selected = item.id; this.render(); }; list.append(b);
    }
    const details = this.element.querySelector('.inventory-details'); details.replaceChildren(); const item = items.find(i => i.id === this.selected);
    if (item) {
      const tag = document.createElement('small'); tag.textContent = ITEM_KINDS[item.kind];
      const h = document.createElement('h3'); h.textContent = item.name; const p = document.createElement('p'); p.textContent = item.description || 'Objeto recuperado no Palace.';
      const qty = document.createElement('span'); qty.textContent = 'Quantidade: ' + item.quantity; details.append(tag, h, p, qty);
      if (item.kind === 'heal') { const use = document.createElement('button'); use.className = 'inventory-use'; use.textContent = `Usar · recuperar ${item.heal} HP`; use.onclick = () => { this.onUse?.(item); this.render(); }; details.append(use); }
      else { const note = document.createElement('p'); note.className = 'inventory-note'; note.textContent = item.kind === 'note' ? 'O conteúdo deste registro aparece acima.' : 'Item guardado para exploração e objetivos do setor.'; details.append(note); }
    } else { const p = document.createElement('p'); p.textContent = 'Selecione um item para ver os detalhes.'; details.append(p); }
    this.element.querySelector('.inventory-total').textContent = `${items.length} tipos · ${items.reduce((sum, i) => sum + i.quantity, 0)} itens`;
  }
}
