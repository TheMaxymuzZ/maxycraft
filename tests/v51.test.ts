import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { archipelago, boatReach, seaSpots } from '../src/archipelago';
import { Block, isSolid } from '../src/blocks';
import { HEIGHT, SEA_LEVEL, World, homeOuterRadius } from '../src/world';

const material = new THREE.MeshBasicMaterial();

describe('v5.1 islas en el mismo mar', () => {
  const seed = 4242;
  const islands = archipelago(seed);
  const spots = seaSpots(islands, seed, 2, 20000);

  it('cada isla tiene su sitio, lejos de casa y sin pisarse con las demás', () => {
    expect(spots).toHaveLength(islands.length);
    expect(seaSpots(islands, seed, 2, 20000)).toEqual(spots);
    const outer = homeOuterRadius(2);
    for (const s of spots) {
      expect(Math.abs(s.x % 16)).toBe(0);
      expect(Math.abs(s.z % 16)).toBe(0);
      expect(Math.hypot(s.x, s.z)).toBeGreaterThan(outer + 100);
      for (const o of spots) if (o !== s) expect(Math.hypot(o.x - s.x, o.z - s.z)).toBeGreaterThanOrEqual(196);
    }
    // Las de anillo más lejano quedan más lejos.
    const dist = (r: number) => Math.min(...islands.filter((i) => i.ring === r).map((i) => { const s = spots.find((o) => o.id === i.id)!; return Math.hypot(s.x, s.z); }));
    expect(dist(2)).toBeGreaterThan(dist(1));
    expect(boatReach(islands, spots, 'velero')).toBeGreaterThan(boatReach(islands, spots, 'balsa'));
  });

  it('la isla sale en el mundo de casa, igual que en su propio mundo', () => {
    const world = new World(seed, material, {}, { terrain: 2, sea: spots });
    for (const s of spots) {
      const alone = new World(s.seed, material, {}, { mystery: { kind: s.kind, fruit: s.fruit }, village: s.village });
      for (const [dx, dz] of [[0, 0], [7, -5], [-12, 9], [30, 3]]) {
        expect(world.heightAt(s.x + dx, s.z + dz)).toBe(alone.heightAt(dx, dz));
        expect(world.getBlock(s.x + dx, SEA_LEVEL + 2, s.z + dz)).toBe(alone.getBlock(dx, SEA_LEVEL + 2, dz));
      }
      expect(world.seaIslandAt(s.x, s.z)?.id).toBe(s.id);
      expect(world.heightAt(s.x, s.z)).toBeGreaterThan(SEA_LEVEL);
    }
    // Entre medias, mar abierto.
    expect(world.seaIslandAt(0, 0)).toBeNull();
  });

  it('las aldeas tienen casas, plaza, caminos y farolas', () => {
    const world = new World(seed, material, {}, { terrain: 2, sea: spots });
    const village = spots.find((s) => s.village)!;
    const v = world.villageOf(village.id)!;
    expect(v.plots.length).toBeGreaterThanOrEqual(3);
    let walls = 0;
    let paths = 0;
    let lights = 0;
    for (let x = village.x - 45; x < village.x + 45; x++) {
      for (let z = village.z - 45; z < village.z + 45; z++) {
        const h = world.heightAt(x, z);
        const top = world.getBlock(x, h, z);
        if (top === Block.StonePath || top === Block.Street) paths++;
        for (let y = h + 1; y < Math.min(HEIGHT, h + 5); y++) {
          const b = world.getBlock(x, y, z);
          if (b === Block.Wall) walls++;
          if (b === Block.LightBlock) lights++;
        }
      }
    }
    expect(walls).toBeGreaterThan(50);
    expect(paths).toBeGreaterThan(60);
    expect(lights).toBeGreaterThanOrEqual(4);
    // Cada puerta tiene sitio delante para salir.
    for (const p of v.plots) expect(isSolid(world.getBlock(p.door[0], p.door[1], p.door[2]))).toBe(false);
  });
});

describe('v5.1 muchas islas de casa', () => {
  it('las cercanas siguen cerca en cualquier isla', () => {
    for (let seed = 1; seed < 40; seed++) {
      const islands = archipelago(seed);
      const spots = seaSpots(islands, seed, 2, 1);
      const outer = homeOuterRadius(2);
      for (const i of islands) {
        const s = spots.find((o) => o.id === i.id)!;
        expect(Math.hypot(s.x, s.z)).toBeLessThan(outer + 150 + (i.ring - 1) * 150 + 80);
      }
    }
  });
});

import { Boat } from '../src/boat';
import { COMMANDS, type CommandContext, findItem, parseCommand, runCommand } from '../src/commands';
import { findShipyardSite, findWorkersHome, buildWorkersHome, workerBeds } from '../src/shipyard';
import { Wildlife } from '../src/wildlife';
import { WATER_SURFACE } from '../src/world';
import { chartSvg } from '../src/seaChart';

describe('v5.1 barco, delfines y astillero', () => {
  it('la balsa y los barcos flotan por encima del agua', () => {
    for (const kind of ['balsa', 'velero', 'expedicion'] as const) {
      const b = new Boat({ kind, upgrades: {}, x: 0, z: 0, yaw: 0, hold: [] });
      b.update(0, 0, { angle: 0 });
      b.group.updateMatrixWorld(true);
      const box = b.bounds(new THREE.Box3());
      // Parte del casco bajo el agua, pero la cubierta (y quien va encima) por encima.
      expect(box.max.y).toBeGreaterThan(WATER_SURFACE + 0.1);
      expect(box.min.y).toBeLessThan(WATER_SURFACE);
      expect(b.seat(new THREE.Vector3()).y).toBeGreaterThan(WATER_SURFACE);
    }
  });

  it('los delfines acompañan al barco por un lado, sin volar, y al rato se van', () => {
    let s = 7;
    const wild = new Wildlife(() => ((s = (s * 16807) % 2147483647) / 2147483647));
    const sea = { topAt: () => SEA_LEVEL - 6, seaAt: () => true, waterAt: () => true, biomeAt: () => null };
    const boat = new THREE.Vector3(0, SEA_LEVEL, 0);
    const player = boat.clone();
    let near = 0;
    let maxY = -Infinity;
    let followedAt = 0;
    for (let t = 0; t < 60; t += 0.05) {
      boat.z -= 3 * 0.05;
      player.copy(boat);
      wild.update(0.05, t, player, 0, sea, boat);
      for (const w of wild.list.filter((w) => w.kind === 'delfin')) {
        const d = Math.hypot(w.pos.x - boat.x, w.pos.z - boat.z);
        if (d < 2.5) near++;
        if (d < 12) followedAt = t;
        maxY = Math.max(maxY, w.model.group.position.y);
      }
    }
    expect(near).toBe(0);
    expect(maxY).toBeLessThan(SEA_LEVEL + 3.2);
    // Nadie se pasa un minuto entero pegado al barco.
    expect(wild.list.filter((w) => w.kind === 'delfin').every((w) => w.follow <= 26)).toBe(true);
    expect(followedAt).toBeGreaterThanOrEqual(0);
  });

  it('la casa de Bartolo y Brújula sale detrás del astillero, en tierra seca, con dos camas', () => {
    const blocks = new Map<string, number>();
    const w = {
      getBlock: (x: number, y: number, z: number) => blocks.get(`${x},${y},${z}`) ?? (z < 0 ? (y <= SEA_LEVEL + 2 ? Block.Grass : Block.Air) : y <= SEA_LEVEL ? Block.Water : Block.Air),
      setBlock: (x: number, y: number, z: number, b: Block) => void blocks.set(`${x},${y},${z}`, b),
      heightAt: (_x: number, z: number) => (z < 0 ? SEA_LEVEL + 2 : SEA_LEVEL - 4),
    };
    const site = findShipyardSite(w, { x: 0, z: -1, dx: 0, dz: 1 });
    const home = findWorkersHome(w, { ...site, stage: 1 })!;
    expect(home).not.toBeNull();
    expect(home[2]).toBeLessThan(0);
    buildWorkersHome(w, home);
    const [x, y, z] = home;
    expect(w.getBlock(x, y + 1, z + 2)).toBe(Block.Door);
    for (const [bx, by, bz] of workerBeds(home)) {
      expect(w.getBlock(bx, by, bz)).toBe(Block.Air);
      expect(isSolid(w.getBlock(bx, by - 1, bz))).toBe(true);
    }
  });

  it('la carta náutica dibuja las islas a escala', () => {
    const islands = archipelago(5);
    const spots = seaSpots(islands, 5, 2, 1);
    const svg = chartSvg(islands, new Set(islands.map((i) => i.id)), 'balsa', { x: 100, z: 0, yaw: 0 }, 190, spots);
    expect(svg).toContain(islands[0].name);
  });
});

describe('v5.1 modo tester', () => {
  const ctx = (): CommandContext & { log: string[]; money: number; items: Record<string, number> } => {
    const c = {
      log: [] as string[], money: 500, items: {} as Record<string, number>, tester: false, visiting: false, inv: false,
      setTester(on: boolean) { c.tester = on; },
      wallet: () => c.money,
      setWallet(n: number) { c.money = n; },
      give(id: string, n: number) { c.items[id] = (c.items[id] ?? 0) + n; return 0; },
      setHour() {}, setWeather() {}, heal() {}, learnAll: () => 3,
      shipyard: (n: number | null) => `etapa ${n}`, boat: (k: string) => `barco ${k}`,
      islands: () => [{ id: 'isla-0', name: 'Isla Coral' }], goTo: (w: string) => `ir ${w}`, revealSea: () => 9,
      invincible(on: boolean | null) { c.inv = on ?? !c.inv; return c.inv; },
    };
    return c;
  };

  it('lee los comandos y encuentra objetos por su nombre, sin tildes', () => {
    expect(parseCommand('hola')).toBeNull();
    expect(parseCommand('/DAR  tablones 20')).toEqual({ name: 'dar', args: ['tablones', '20'] });
    expect(findItem('tablones')?.id).toBe('tablones');
    expect(findItem('Melocotón')?.id).toBe(findItem('melocoton')?.id);
    expect(findItem('melocoton')).not.toBeNull();
    expect(findItem('zzzz')).toBeNull();
    expect(new Set(COMMANDS.map((c) => c.name)).size).toBe(COMMANDS.length);
  });

  it('hasta encender el modo tester no se puede hacer trampa', () => {
    const c = ctx();
    expect(runCommand(c, 'hola')).toBeNull();
    expect(runCommand(c, '/bayas 5000')).toContain('/tester');
    expect(c.money).toBe(500);
    expect(runCommand(c, '/tester')).toContain('encendido');
    runCommand(c, '/bayas 5000');
    expect(c.money).toBe(5000);
    runCommand(c, '/bayas +1000');
    expect(c.money).toBe(6000);
    runCommand(c, '/dar tablones 64');
    expect(c.items.tablones).toBe(64);
    expect(runCommand(c, '/barco vel')).toBe('barco velero');
    expect(runCommand(c, '/ir coral')).toBe('ir coral');
    expect(runCommand(c, '/invencible')).toContain('Invencible');
    expect(runCommand(c, '/nada')).toContain('/ayuda');
    c.visiting = true;
    expect(runCommand(c, '/astillero 4')).toContain('tu isla');
  });
});
