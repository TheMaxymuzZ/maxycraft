import { describe, expect, it } from 'vitest';
import { CREATURES, fightOf, pickCreature, rollSize, sizeRange } from '../src/creatures';
import { RODS, Reel, rodStats } from '../src/fishing';
import { creatureTile, CREATURE_TILE_START, EXTRA_TILE_START, XTile } from '../src/blocks';
import { itemDef } from '../src/items';
import { WILDLIFE, WILD_KINDS, wildFor, wildModel } from '../src/wildlife';

/** Un azar fijo, para que las pruebas salgan siempre igual. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** Juega una pesca entera tirando `rate` veces por segundo; devuelve cómo acaba. */
function play(fight: number, rod: string, rate: number, seed = 7) {
  const reel = new Reel(fight, RODS[rod], seeded(seed));
  const dt = 1 / 30;
  let next = 0;
  for (let t = 0; t < 120; t += dt) {
    if (t >= next) {
      // Como haría alguien con cuidado: si el hilo va muy tenso, espera.
      if (reel.tension < 0.7) reel.pull();
      next += 1 / rate;
    }
    const end = reel.tick(dt);
    if (end) return end;
  }
  return 'escaped';
}

describe('v4.23 fauna, mar y pesca', () => {
  it('hay cuarenta peces, con su tamaño, y los nuevos tienen su propia casilla en el atlas', () => {
    const fish = CREATURES.filter((c) => c.kind === 'pez');
    expect(fish.length).toBe(40);
    const tiles = CREATURES.map((_, i) => creatureTile(i));
    expect(new Set(tiles).size).toBe(tiles.length);
    expect(creatureTile(0)).toBe(CREATURE_TILE_START);
    for (const t of tiles) expect(t < CREATURE_TILE_START + 48 || t >= EXTRA_TILE_START + 128).toBe(true);
    for (const t of Object.values(XTile)) expect(tiles).not.toContain(t);
    for (const c of fish) {
      const [lo, hi] = sizeRange(c);
      expect(lo).toBeLessThan(hi);
      const r = seeded(3);
      for (let i = 0; i < 20; i++) {
        const s = rollSize(c, r);
        expect(s).toBeGreaterThanOrEqual(lo);
        expect(s).toBeLessThanOrEqual(hi);
      }
      expect(itemDef(c.id).name).toBe(c.name);
    }
  });

  it('los peces de bioma solo salen en su bioma y los de alta mar solo desde el barco', () => {
    const r = seeded(11);
    for (let i = 0; i < 300; i++) {
      const home = pickCreature(['mar', 'río'], 12, r, 'pradera')!;
      expect(home.biomes).toBeUndefined();
      expect(home.habitat).not.toBe('alta_mar');
    }
    const jungle = new Set(Array.from({ length: 400 }, () => pickCreature(['río'], 12, r, 'selva')!.id));
    expect(jungle.has('pirana')).toBe(true);
    const boat = new Set(Array.from({ length: 400 }, () => pickCreature(['mar', 'alta_mar'], 12, r)!.habitat));
    expect(boat.has('alta_mar')).toBe(true);
  });

  it('con señuelo salen más peces raros, y los agotados de una zona no pican', () => {
    const count = (lure: boolean) => {
      const r = seeded(5);
      let rare = 0;
      for (let i = 0; i < 2000; i++) if (pickCreature(['mar'], 12, r, null, lure)!.weight <= 3) rare++;
      return rare;
    };
    expect(count(true)).toBeGreaterThan(count(false) * 1.5);
    const r = seeded(9);
    for (let i = 0; i < 200; i++) expect(pickCreature(['río'], 12, r, null, false, (c) => c.id !== 'perca')!.id).toBe('perca');
  });

  it('el minijuego: los peces pequeños se sacan con la caña de madera y los gigantes piden una caña mejor', () => {
    expect(play(0.1, 'cana', 2.5)).toBe('caught');
    expect(play(0.5, 'cana', 2.5)).toBe('caught');
    // El marlín azul (pelea 1) no sale con la de madera, pero sí con la legendaria.
    expect(play(1, 'cana', 2.5)).not.toBe('caught');
    expect(play(1, 'cana_legendaria', 2.5)).toBe('caught');
    expect(fightOf(CREATURES.find((c) => c.id === 'marlin_azul')!)).toBe(1);
  });

  it('tirar sin parar rompe el hilo y no tirar deja escapar al pez', () => {
    const greedy = new Reel(0.6, RODS.cana, seeded(1));
    let end = null;
    for (let i = 0; i < 200 && !end; i++) {
      greedy.pull();
      greedy.pull();
      end = greedy.tick(1 / 30);
    }
    expect(end).toBe('snapped');
    const lazy = new Reel(0.6, RODS.cana, seeded(1));
    end = null;
    for (let i = 0; i < 3000 && !end; i++) end = lazy.tick(1 / 30);
    expect(end).toBe('escaped');
  });

  it('cada caña es mejor que la anterior, y las nuevas son cañas de verdad', () => {
    const order = ['cana', 'cana_hierro', 'cana_cristal', 'cana_legendaria'];
    for (let i = 1; i < order.length; i++) {
      const a = RODS[order[i - 1]];
      const b = RODS[order[i]];
      expect(b.pull).toBeGreaterThan(a.pull);
      expect(b.strain).toBeLessThan(a.strain);
      expect(b.bite).toBeLessThan(a.bite);
      expect(itemDef(order[i]).tool).toBe('rod');
    }
    expect(rodStats('otra cosa')).toBe(RODS.cana);
    expect(itemDef('senuelo').seller).toBe('pesca');
  });

  it('fauna: cada bioma tiene sus animales y el búho solo sale de noche', () => {
    expect(wildFor('tierra', 'desierto', false)).toContain('camello');
    expect(wildFor('tierra', 'glaciar', false)).toContain('oso_polar');
    expect(wildFor('orilla', 'glaciar', false)).toContain('pinguino');
    expect(wildFor('tierra', 'bosque', false)).not.toContain('buho');
    expect(wildFor('tierra', 'bosque', true)).toContain('buho');
    expect(wildFor('mar', null, false)).toEqual(expect.arrayContaining(['delfin', 'medusa', 'raya', 'ballena']));
    expect(wildFor('orilla', 'playa', false)).toEqual(expect.arrayContaining(['cangrejo', 'tortuga']));
    for (const k of WILD_KINDS) {
      const m = wildModel(k);
      // Desde la v5.5 (mar) y la v5.6 (tierra) muchos tienen figura nueva, con sus propias piezas.
      if ('animate' in m) continue;
      expect(m.group.children.length).toBe(WILDLIFE[k].parts.length);
    }
    expect(wildModel('medusa').glow.length).toBeGreaterThan(0);
    expect(wildModel('ciervo').legs).toHaveLength(4);
  });
});
