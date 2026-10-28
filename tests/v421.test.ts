import { describe, expect, it } from 'vitest';
import { Block } from '../src/blocks';
import { navigable, stepBoat } from '../src/boat';
import { catalogOf } from '../src/economy';
import { itemDef } from '../src/items';
import { LORE } from '../src/lore';
import {
  BOATS, BRUJULA, MAX_STAGE, STAGE_COSTS, UPGRADES, boatSpeed, buildShipyard, findShipyardSite, holdSize, isBoatSave,
  isShipyardSite, shipyardCell, shipyardPoint, shipyardTemplate, windFactor, windOf,
} from '../src/shipyard';
import { SEA_LEVEL } from '../src/world';

/** Una playa de prueba: tierra con z < 0 (arena a ras de la orilla) y mar con z >= 0. */
function beach() {
  const blocks = new Map<string, Block>();
  const natural = (_x: number, y: number, z: number) => {
    if (z < 0) return y <= SEA_LEVEL + 1 ? Block.Sand : Block.Air;
    return y <= SEA_LEVEL - 4 ? Block.Sand : y <= SEA_LEVEL ? Block.Water : Block.Air;
  };
  return {
    getBlock: (x: number, y: number, z: number) => blocks.get(`${x},${y},${z}`) ?? natural(x, y, z),
    setBlock: (x: number, y: number, z: number, b: Block) => void blocks.set(`${x},${y},${z}`, b),
    heightAt: (_x: number, z: number) => (z < 0 ? SEA_LEVEL + 1 : SEA_LEVEL - 4),
  };
}

describe('v4.21 astillero', () => {
  it('cada etapa tiene su plantilla y la grada solo sale desde la etapa 2', () => {
    for (let s = 0; s <= MAX_STAGE; s++) expect(shipyardTemplate(s).layers.length).toBeGreaterThan(1);
    const planks = (s: number) => shipyardTemplate(s).layers[0].join('').split('P').length - 1;
    expect(planks(1)).toBe(0);
    expect(planks(2)).toBeGreaterThan(40);
    // La grúa (troncos altos) solo en la última etapa.
    expect(shipyardTemplate(4).layers[8].join('')).toContain('L');
    expect(shipyardTemplate(3).layers[8].join('')).not.toContain('L');
  });

  it('busca sitio con el taller en tierra y el muelle sobre el agua, y lo construye', () => {
    const w = beach();
    const site = findShipyardSite(w, { x: 0, z: -1, dx: 0, dz: 1 });
    expect(isShipyardSite(site)).toBe(true);
    const [, , hutZ] = shipyardCell(site, 2, 0, 1);
    const [, , dockZ] = shipyardCell(site, 2, 0, 15);
    expect(hutZ).toBeLessThan(dockZ);
    expect(dockZ).toBeGreaterThanOrEqual(0);
    site.stage = 4;
    buildShipyard(w, site);
    const [x, y, z] = shipyardCell(site, 2, 0, 12);
    expect(w.getBlock(x, y, z)).toBe(Block.BridgeDeck);
    // El barco queda amarrado en el agua, fuera del solar.
    const [bx, bz] = shipyardPoint(site, 7.5, 19.5);
    expect(w.getBlock(Math.floor(bx), SEA_LEVEL, Math.floor(bz))).toBe(Block.Water);
  });

  it('girado, los puntos con decimales caen dentro de la casilla girada', () => {
    for (let rotation = 0; rotation < 4; rotation++) {
      const site = { x: 10, z: -4, rotation, stage: 0 };
      const [cx, , cz] = shipyardCell(site, 3, 0, 5);
      const [px, pz] = shipyardPoint(site, 3.5, 5.5);
      expect(px).toBeCloseTo(cx + 0.5);
      expect(pz).toBeCloseTo(cz + 0.5);
    }
  });

  it('las etapas, los barcos y las mejoras piden cosas que existen', () => {
    const costs = [...STAGE_COSTS, ...BOATS.map((b) => b.cost), ...UPGRADES.map((u) => u.cost)];
    expect(STAGE_COSTS).toHaveLength(MAX_STAGE);
    for (const c of costs) for (const id of Object.keys(c.items ?? {})) expect(() => itemDef(id), id).not.toThrow();
    expect(BOATS.map((b) => b.stage)).toEqual([2, 3, 4]);
  });

  it('la bodega crece con la mejora y el viento a favor da más velocidad', () => {
    expect(holdSize('balsa', {})).toBe(9);
    expect(holdSize('velero', { bodega: 2 })).toBe(36);
    expect(holdSize('expedicion', { bodega: 9 })).toBe(27 + 27);
    expect(boatSpeed('velero', {}, 1)).toBeGreaterThan(boatSpeed('velero', {}, -1));
    expect(boatSpeed('velero', { vela: 1 }, 0)).toBeGreaterThan(boatSpeed('velero', {}, 0));
    const wind = windOf('2026-10-28');
    expect(wind).toEqual(windOf('2026-10-28'));
    expect(Math.abs(windFactor(0, wind))).toBeLessThanOrEqual(1);
  });

  it('el barco navega por el agua y se para al llegar a tierra', () => {
    const w = beach();
    expect(navigable(w, 0.5, 5.5)).toBe(true);
    expect(navigable(w, 0.5, -2.5)).toBe(false);
    // Rumbo hacia tierra (-z, yaw 0) desde z = 6.
    let s = { x: 0.5, z: 6, yaw: 0, speed: 0 };
    let bumped = false;
    for (let i = 0; i < 400; i++) {
      const r = stepBoat(w, s, 'velero', {}, { angle: 0, strength: 0 }, 1, 0, 0.05);
      bumped ||= r.bumped;
      s = r;
    }
    expect(s.z).toBeGreaterThan(0);
    expect(navigable(w, s.x, s.z)).toBe(true);
    expect(bumped).toBe(true);
    // Hacia el mar abierto avanza.
    const away = stepBoat(w, { x: 0.5, z: 6, yaw: Math.PI, speed: 5 }, 'balsa', {}, { angle: 0, strength: 0 }, 1, 0, 0.1);
    expect(away.z).toBeGreaterThan(6);
  });

  it('guardar el barco: se reconoce lo bueno y se rechaza lo raro', () => {
    expect(isBoatSave({ kind: 'velero', upgrades: {}, x: 1, z: 2, yaw: 0, hold: [] })).toBe(true);
    expect(isBoatSave({ kind: 'yate', upgrades: {}, x: 1, z: 2, yaw: 0, hold: [] })).toBe(false);
    expect(isShipyardSite({ x: 1, z: 2, rotation: 1, stage: 9 })).toBe(false);
  });

  it('Brújula vende lo de pescar y navegar, y todo tiene su ficha', () => {
    const sold = catalogOf(BRUJULA);
    for (const id of ['cebo', 'brujula', 'catalejo', 'carta_nautica', 'cana']) expect(sold).toContain(id);
    for (const id of ['cebo', 'brujula', 'catalejo', 'carta_nautica']) expect(LORE[id], id).toBeTruthy();
  });
});
