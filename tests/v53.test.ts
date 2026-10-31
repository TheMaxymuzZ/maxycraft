import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Block, isDoor, isSolid, isStairs, roofColorOf } from '../src/blocks';
import { Boat } from '../src/boat';
import { templateCells, templateSize } from '../src/buildings';
import { FURNITURE, furnitureDef } from '../src/furniture';
import { FURNITURE_STYLE } from '../src/decor';
import { LORE } from '../src/lore';
import {
  BOAT_KINDS, KIOSK_SPOT, MAX_STAGE, type ShipyardSite, SHIPWRIGHT_SPOT, SHIPYARD_VERSION, buildShipyard, eraseShipyard, findShipyardSite, isShipyardSite,
  shipyardCell, shipyardFixtures, shipyardTemplate,
} from '../src/shipyard';
import {
  PILOT_SPOT, TERMINAL, TERMINAL_FIXTURES_V2, TERMINAL_V2, TERMINAL_VERSION, buildTerminal, eraseTerminal, findTerminalSite, isTerminalSite,
  terminalCell, terminalFixtures, terminalTemplate,
} from '../src/terminal';
import { Seaplane } from '../src/travel';
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

describe('v5.3: la terminal nueva', () => {
  it('ocupa lo mismo que la de antes, con tejado de teja y sin bloques de luz en la sala', () => {
    expect(templateSize(TERMINAL_V2)[0]).toBe(templateSize(TERMINAL)[0]);
    expect(templateSize(TERMINAL_V2)[2]).toBe(templateSize(TERMINAL)[2]);
    const cells = templateCells(TERMINAL_V2, 0);
    expect(cells.some(([, , , b]) => b !== null && isStairs(b) && roofColorOf(b) === 1)).toBe(true);
    // La única luz de bloque es la del faro, al final del muelle.
    expect(cells.filter(([, , , b]) => b === Block.LightBlock).map(([, , z]) => z)).toEqual([13]);
  });

  it('se construye nueva, Plumas cabe tras el mostrador y una de antes se cambia por la nueva', () => {
    const w = beach();
    const site = findTerminalSite(w, { x: 0, z: -1, dx: 0, dz: 1 });
    site.v = TERMINAL_VERSION;
    expect(isTerminalSite(site)).toBe(true);
    expect(isTerminalSite({ ...site, v: 7 })).toBe(false);
    buildTerminal(w, site);
    expect(isDoor(w.getBlock(...terminalCell(site, 4, 1, 0)))).toBe(true);
    expect(isDoor(w.getBlock(...terminalCell(site, 4, 1, 6)))).toBe(true);
    const pilot = terminalCell(site, ...PILOT_SPOT);
    expect(w.getBlock(...pilot)).toBe(Block.Air);
    expect(isSolid(w.getBlock(pilot[0], pilot[1] - 1, pilot[2]))).toBe(true);
    expect(terminalFixtures(site)).toBe(TERMINAL_FIXTURES_V2);
    // Una terminal de antes: se borra lo suyo y queda la nueva, sin restos (el bloque de luz del techo).
    const old = beach();
    const oldSite = { ...findTerminalSite(old, { x: 0, z: -1, dx: 0, dz: 1 }) };
    buildTerminal(old, oldSite);
    expect(terminalTemplate(oldSite)).toBe(TERMINAL);
    expect(old.getBlock(...terminalCell(oldSite, 4, 3, 3))).toBe(Block.LightBlock);
    eraseTerminal(old, oldSite);
    const upgraded = { ...oldSite, v: TERMINAL_VERSION };
    buildTerminal(old, upgraded);
    expect(old.getBlock(...terminalCell(upgraded, 4, 3, 3))).toBe(Block.Air);
    expect(old.getBlock(...terminalCell(upgraded, 4, 4, 3))).toBe(Block.Log);
  });

  it('todos los muebles de la terminal existen', () => {
    for (const [id] of TERMINAL_FIXTURES_V2) expect(furnitureDef(id), id).toBeDefined();
  });
});

describe('v5.3: el astillero nuevo', () => {
  it('cada etapa cabe en el solar; tejados de teja desde el taller y grúa con su caja', () => {
    for (let s = 0; s <= MAX_STAGE; s++) {
      const t = shipyardTemplate(s, SHIPYARD_VERSION);
      expect(templateSize(t)[0]).toBe(11);
      expect(templateSize(t)[2]).toBe(18);
      expect(templateCells(t, 0).some(([, , , b]) => b === Block.LightBlock)).toBe(false);
    }
    const roofs = (s: number) => templateCells(shipyardTemplate(s, SHIPYARD_VERSION), 0).filter(([, , , b]) => b !== null && isStairs(b) && roofColorOf(b) >= 0).length;
    expect(roofs(2)).toBe(0);
    expect(roofs(3)).toBeGreaterThan(30);
    expect(shipyardTemplate(4, SHIPYARD_VERSION).layers[4].join('')).toContain('X');
  });

  it('Bartolo y Brújula tienen sitio; los muebles salen según la etapa', () => {
    const w = beach();
    const site = findShipyardSite(w, { x: 0, z: -1, dx: 0, dz: 1 });
    expect(site.v).toBe(SHIPYARD_VERSION);
    expect(isShipyardSite(site)).toBe(true);
    expect(isShipyardSite({ ...site, v: 9 })).toBe(false);
    for (let s = 1; s <= MAX_STAGE; s++) {
      site.stage = s;
      buildShipyard(w, site);
      for (const spot of [SHIPWRIGHT_SPOT, KIOSK_SPOT]) {
        const [x, y, z] = shipyardCell(site, ...spot);
        expect(w.getBlock(x, y, z)).toBe(Block.Air);
        expect(w.getBlock(x, y + 1, z)).toBe(Block.Air);
      }
    }
    site.stage = 1;
    const early = shipyardFixtures(site).length;
    site.stage = 4;
    expect(shipyardFixtures(site).length).toBeGreaterThan(early);
    for (const [id] of shipyardFixtures(site)) expect(furnitureDef(id), id).toBeDefined();
    expect(shipyardFixtures({ ...site, v: undefined })).toEqual([]);
  });

  it('el astillero de antes se rehace con el nuevo sin dejar el bloque de luz', () => {
    const w = beach();
    const site: ShipyardSite = { ...findShipyardSite(w, { x: 0, z: -1, dx: 0, dz: 1 }), v: undefined, stage: 4 };
    buildShipyard(w, site);
    expect(w.getBlock(...shipyardCell(site, 2, 3, 3))).toBe(Block.LightBlock);
    eraseShipyard(w, site);
    site.v = SHIPYARD_VERSION;
    buildShipyard(w, site);
    expect(w.getBlock(...shipyardCell(site, 2, 3, 3))).toBe(Block.Air);
    expect(w.getBlock(...shipyardCell(site, 2, 5, 3))).toBe(Block.RoofBlue);
  });
});

describe('v5.3: muebles, barcos y avioneta', () => {
  it('los muebles nuevos tienen historia y estilo', () => {
    for (const id of ['maletas', 'salvavidas', 'manga_viento', 'rollo_cuerda', 'ancla', 'timon', 'puesto_pesca']) {
      expect(FURNITURE.filter((f) => f.id === id)).toHaveLength(1);
      expect(LORE[id], id).toBeTruthy();
      expect(FURNITURE_STYLE[id], id).toBeDefined();
    }
  });

  it('cada barco se dibuja con su casco y sus velas, con y sin mejoras', () => {
    for (const kind of BOAT_KINDS) {
      for (const upgrades of [{}, { vela: 1, farol: 1, cama: 1, casco: 1 }]) {
        const b = new Boat({ kind, upgrades, x: 0, z: 0, yaw: 0, hold: [] });
        b.update(1, 1, { angle: 0.5 });
        const box = b.bounds(new THREE.Box3());
        const size = box.getSize(new THREE.Vector3());
        expect(size.z).toBeGreaterThan(kind === 'balsa' ? 2 : 3);
        if (kind !== 'balsa') expect(size.y).toBeGreaterThan(3);
      }
    }
  });

  it('la avioneta tiene alas, flotadores y hélice', () => {
    const p = new Seaplane();
    p.place(0, 0, 0, 0, 1);
    const size = p.bounds(new THREE.Box3()).getSize(new THREE.Vector3());
    expect(size.x).toBeGreaterThan(6.5);
    expect(size.z).toBeGreaterThan(4.5);
  });
});
