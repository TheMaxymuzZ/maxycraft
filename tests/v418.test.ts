import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { CLOTHES, GARMENTS, SLOTS, clothOf, isOutfit } from '../src/clothes';
import { MERCHANTS, merchantOf } from '../src/commerce';
import { AVELLANA, BALDOSA, SEDA, SERRIN, catalogOf, stockFor } from '../src/economy';
import { FURNITURE_STYLE } from '../src/decor';
import { FURNITURE } from '../src/furniture';
import { Inventory } from '../src/inventory';
import { itemDef } from '../src/items';
import { LORE } from '../src/lore';
import { parseMessage } from '../src/net/protocol';
import { PlayerModel } from '../src/playerModel';
import { buildVillagerModel } from '../src/villagerModel';
import { isWardrobeSave, putOn, takeOff, wearSet } from '../src/wardrobe';

vi.mock('../src/icons', () => ({ tileIcon: () => '', itemIcon: () => '' }));

describe('v4.18: la ropa', () => {
  it('hay al menos 40 prendas a la venta, cada una en su hueco y con su icono', () => {
    const sold = CLOTHES.filter((c) => !c.garment.legendary);
    expect(sold.length).toBeGreaterThanOrEqual(40);
    expect(new Set(CLOTHES.map((c) => c.id)).size).toBe(CLOTHES.length);
    expect(new Set(CLOTHES.map((c) => c.tile)).size).toBe(CLOTHES.length);
    for (const s of SLOTS) expect(CLOTHES.some((c) => c.garment.slot === s)).toBe(true);
    for (const c of CLOTHES) {
      const d = itemDef(c.id);
      expect(d.kind).toBe('ropa');
      expect(LORE[c.id], c.id).toBeTruthy();
      for (const row of c.garment.icon) expect(row).toHaveLength(16);
      expect(c.garment.icon).toHaveLength(16);
    }
    expect(clothOf('zapatillas_rojo')!.name).toBe('Zapatillas rojas');
    expect(clothOf('pantalon_marron')!.name).toBe('Pantalón marrón');
    expect(clothOf('botas_marron')!.name).toBe('Botas marrones');
  });

  it('las legendarias no se venden y son legendarias', () => {
    const legend = CLOTHES.filter((c) => c.garment.legendary);
    expect(legend.length).toBeGreaterThan(0);
    for (const c of legend) {
      expect(itemDef(c.id).buy).toBeUndefined();
      expect(itemDef(c.id).rarity).toBe('legendario');
      expect(catalogOf(SEDA)).not.toContain(c.id);
    }
  });

  it('ponerse y quitarse: lo de antes vuelve a los bolsillos', () => {
    const inv = new Inventory();
    inv.add('gorra_rojo');
    inv.add('gorra_azul');
    let o = putOn({}, inv, 'gorra_rojo');
    expect(o).toEqual({ cabeza: 'gorra_rojo' });
    o = putOn(o as object, inv, 'gorra_azul');
    expect(o).toEqual({ cabeza: 'gorra_azul' });
    expect(inv.countOf('gorra_rojo')).toBe(1);
    expect(inv.countOf('gorra_azul')).toBe(0);
    expect(typeof putOn({}, inv, 'botas_negro')).toBe('string');
    o = takeOff(o as object, inv, 'cabeza');
    expect(o).toEqual({});
    expect(inv.countOf('gorra_azul')).toBe(1);
  });

  it('un conjunto guardado se pone con lo que haya y dice lo que falta', () => {
    const inv = new Inventory();
    inv.add('camiseta_rojo');
    const r = wearSet({}, inv, { cuerpo: 'camiseta_rojo', pies: 'botas_negro' });
    expect(r.outfit).toEqual({ cuerpo: 'camiseta_rojo' });
    expect(r.missing).toEqual([clothOf('botas_negro')!.name]);
  });

  it('el muñeco se viste y se desviste', () => {
    const m = new PlayerModel(0x3366cc);
    expect(m.wornParts).toBe(0);
    m.dress({ cabeza: 'sombrero_marron', pies: 'zapatillas_rojo', espalda: 'capa_rojo' });
    expect(m.wornParts).toBeGreaterThan(5);
    m.dress({});
    expect(m.wornParts).toBe(0);
    for (const g of GARMENTS) new PlayerModel(0).dress({ [g.slot]: CLOTHES.find((c) => c.garment === g)!.id });
  });

  it('no acepta ropa rara de la red ni de la partida', () => {
    expect(isOutfit({ cabeza: 'gorra_rojo' })).toBe(true);
    expect(isOutfit({ pies: 'gorra_rojo' })).toBe(false);
    expect(isOutfit({ cabeza: 'nada' })).toBe(false);
    expect(parseMessage({ t: 'ropa', id: 'a', o: { cara: 'gafas' } })).toBeTruthy();
    expect(parseMessage({ t: 'ropa', id: 'a', o: { cara: 'gafas', x: 'y' } })).toBeNull();
    expect(parseMessage({ t: 'entra', peer: { id: 'a', name: 'Ana', color: 1, outfit: { cuerpo: 'vestido_rosa' } } })).toBeTruthy();
    expect(parseMessage({ t: 'entra', peer: { id: 'a', name: 'Ana', color: 1, outfit: { cuerpo: 'pico' } } })).toBeNull();
    expect(isWardrobeSave({ outfit: {}, sets: [{}, { cabeza: 'corona' }] })).toBe(true);
    expect(isWardrobeSave({ outfit: {}, sets: [{}, {}, {}, {}] })).toBe(false);
  });
});

describe('v4.18: los comercios de moda, muebles y calles', () => {
  it('Seda, Serrín y Baldosa abren con su condición', () => {
    expect(merchantOf('ropa')!.unlocked({ townLevel: 2, bestFriend: 1 })).toBe(true);
    expect(merchantOf('ropa')!.unlocked({ townLevel: 2, bestFriend: 0 })).toBe(false);
    expect(merchantOf('muebles')!.unlocked({ townLevel: 4, bestFriend: 5, shopLevel: 0 })).toBe(false);
    expect(merchantOf('muebles')!.unlocked({ townLevel: 0, bestFriend: 0, shopLevel: 1 })).toBe(true);
    expect(merchantOf('urbano')!.unlocked({ townLevel: 3, bestFriend: 0, works: 0 })).toBe(false);
    expect(merchantOf('urbano')!.unlocked({ townLevel: 3, bestFriend: 0, works: 1 })).toBe(true);
    for (const m of MERCHANTS) expect(buildVillagerModel({ species: m.profile.species, shirt: 0, pattern: 0 } as never).eyes).toHaveLength(2);
  });

  it('Seda cuelga diez prendas al día, distintas cada día', () => {
    const a = stockFor(SEDA, { today: '2026-10-27', season: 'otoño', holiday: null }).map((s) => s.id);
    const b = stockFor(SEDA, { today: '2026-10-28', season: 'otoño', holiday: null }).map((s) => s.id);
    expect(a).toHaveLength(10);
    expect(a.every((id) => itemDef(id).kind === 'ropa')).toBe(true);
    expect(a).not.toEqual(b);
    expect(stockFor(SEDA, { today: '2026-10-27', season: 'otoño', holiday: null, level: 2 })).toHaveLength(16);
  });

  it('Serrín vende lo suyo y rota el catálogo; Baldosa vende cosas de calle; Avellana no vende nada de eso', () => {
    const today = stockFor(SERRIN, { today: '2026-10-27', season: 'otoño', holiday: null }).map((s) => s.id);
    expect(today).toEqual(expect.arrayContaining(['armario', 'espejo', 'piano']));
    expect(catalogOf(BALDOSA)).toEqual(expect.arrayContaining(['farola_hierro', 'banco_parque', 'jardinera', 'pergola', 'senal_calle', 'farola']));
    const avellana = catalogOf(AVELLANA);
    for (const f of FURNITURE.filter((x) => x.seller)) expect(avellana).not.toContain(f.id);
    for (const c of CLOTHES) expect(avellana).not.toContain(c.id);
  });

  it('cada mueble nuevo tiene estilo y curiosidad', () => {
    for (const f of FURNITURE.filter((x) => x.seller === 'muebles' || x.seller === 'urbano' || x.seller === 'ropa')) {
      expect(FURNITURE_STYLE[f.id], f.id).toBeTruthy();
      expect(LORE[f.id], f.id).toBeTruthy();
    }
    expect(new THREE.Box3()).toBeTruthy();
  });
});
