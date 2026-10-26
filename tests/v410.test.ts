import { describe, expect, it } from 'vitest';
import { ItemCard, itemCardHtml, itemFacts, matchesFilter, missingLore, rarityFor, sourceOf } from '../src/itemCard';
import { ITEMS, itemDef } from '../src/items';
import { MAX_BLOCK_PX, clampView, maxZoom, screenToWorld } from '../src/map';

describe('v4.10: fichas de objetos', () => {
  it('todos los objetos del juego tienen su curiosidad', () => {
    expect(missingLore()).toEqual([]);
  });

  it('todos tienen ficha completa: nombre, tipo, rareza y de dónde sale (o qué hace)', () => {
    for (const d of ITEMS) {
      const html = itemCardHtml(d.id);
      expect(html, d.id).toContain(`rar-${d.rarity}`);
      expect(html, d.id).toContain('ic-lore');
      expect(sourceOf(d.id) || itemFacts(d.id).length, d.id).toBeTruthy();
    }
  });

  it('cada tipo enseña sus datos', () => {
    const facts = (id: string) => Object.fromEntries(itemFacts(id));
    expect(facts('pico_hierro')['Usos']).toBe(String(itemDef('pico_hierro').durability));
    expect(facts('pan')['Al comerlo']).toMatch(/llena 3,5 muslitos/);
    expect(facts('antorcha')['Luz']).toMatch(/alumbra \d+ bloques/);
    expect(facts('hacha')['Cuesta']).toBe(`${itemDef('hacha').buy} bayas`);
    expect(sourceOf('pez_luna')).toMatch(/^Se pesca en el mar/);
    expect(sourceOf('mariquita')).toMatch(/^Se caza con la red/);
    expect(sourceOf('naranja')).toMatch(/árboles/);
  });

  it('las rarezas: minerales de islas misteriosas épicos, peces únicos legendarios y la fruta de fuera, rara', () => {
    expect(itemDef('cristal_brillante').rarity).toBe('epico');
    expect(itemDef('bloque_amatista').rarity).toBe('epico');
    expect(itemDef('pez_luna').rarity).toBe('legendario');
    expect(rarityFor('naranja', 'manzana')).toBe('raro');
    expect(rarityFor('manzana', 'manzana')).toBe('comun');
    // La mayoría son comunes.
    expect(ITEMS.filter((d) => d.rarity === 'comun').length).toBeGreaterThan(ITEMS.length / 2);
  });

  it('el nombre no se cuela como HTML', () => {
    expect(itemCardHtml('pan')).not.toContain('<script');
  });

  it('los filtros eligen por tipo o por rareza', () => {
    expect(matchesFilter('pico', 'kind:herramienta')).toBe(true);
    expect(matchesFilter('pico', 'kind:mueble')).toBe(false);
    expect(matchesFilter('pez_luna', 'rar:legendario')).toBe(true);
    expect(matchesFilter('naranja', 'rar:raro', 'manzana')).toBe(true);
    expect(matchesFilter('pico', null)).toBe(true);
  });

  it('la ficha flotante sale al pasar el ratón y se esconde al salir', () => {
    const card = new ItemCard();
    const slot = document.createElement('div');
    document.body.appendChild(slot);
    let id: string | null = 'pastel';
    card.attach(slot, () => id);
    slot.dispatchEvent(new MouseEvent('mouseenter', { clientX: 10, clientY: 10 }));
    expect(card.el.hidden).toBe(false);
    expect(card.el.textContent).toContain('Pastel');
    slot.dispatchEvent(new MouseEvent('mouseleave'));
    expect(card.el.hidden).toBe(true);
    id = null; // casilla vacía: no sale nada
    slot.dispatchEvent(new MouseEvent('mouseenter', { clientX: 10, clientY: 10 }));
    expect(card.el.hidden).toBe(true);
  });
});

describe('v4.10: mapa con zoom y arrastre', () => {
  const map = { size: 208, half: 104 };
  const size = 720;

  it('se puede acercar hasta ver bloques sueltos', () => {
    const z = maxZoom(map, size);
    expect((size / map.size) * z).toBeCloseTo(MAX_BLOCK_PX);
  });

  it('el zoom no baja de la isla entera y no se sale del mapa al arrastrar', () => {
    const whole = clampView({ cx: 500, cz: -500, zoom: 0.2 }, map, size);
    expect([whole.zoom, Math.abs(whole.cx), Math.abs(whole.cz)]).toEqual([1, 0, 0]);
    const v = clampView({ cx: 500, cz: -500, zoom: 2 }, map, size);
    expect(v.cx).toBe(52);
    expect(v.cz).toBe(-52);
    expect(clampView({ cx: 0, cz: 0, zoom: 99 }, map, size).zoom).toBe(maxZoom(map, size));
  });

  it('el centro del lienzo es el centro de la vista', () => {
    const view = { cx: 30, cz: -12, zoom: 3 };
    expect(screenToWorld(view, map, size, size / 2, size / 2)).toEqual([30, -12]);
    const [x] = screenToWorld(view, map, size, size / 2 + (size / map.size) * 3 * 10, size / 2);
    expect(x).toBeCloseTo(40);
  });
});
