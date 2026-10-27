import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Block } from '../src/blocks';
import { TWO_FLOOR_HOUSE, canPlace, findSpot, footprint, placeTemplate, rotateCell, templateCells } from '../src/buildings';
import { type Cell, findPath, pathsFor, standable } from '../src/pathfind';
import { activityAt, agendaFor } from '../src/schedule';
import { createVillagers } from '../src/villagers';
import { World } from '../src/world';
import { PROTOCOL, parseMessage } from '../src/net/protocol';

const material = new THREE.MeshBasicMaterial();

/** Un mundo de mentira: suelo llano de piedra a la altura 20 (pies en 21) y lo que se ponga encima. */
function flat() {
  const blocks = new Map<string, number>();
  const w = {
    getBlock: (x: number, y: number, z: number) => blocks.get(`${x},${y},${z}`) ?? (y <= 20 ? Block.Stone : Block.Air),
    setBlock: (x: number, y: number, z: number, b: number) => void blocks.set(`${x},${y},${z}`, b),
    heightAt: () => 20,
  };
  return w;
}

/** Hace andar al vecino hasta que llega (o se acaba el tiempo). Devuelve los segundos que ha tardado. */
function walkUntilIdle(world: World, v: ReturnType<typeof createVillagers>[number], hour: number, max = 400): number {
  const player = new THREE.Vector3(v.position.x, v.position.y, v.position.z);
  let t = 0;
  while (t < max) {
    pathsFor(world).update(3000);
    player.copy(v.position); // el jugador le sigue, así anda por el camino de verdad
    v.update(0.1, hour, player);
    t += 0.1;
    if (v.idle) return t;
  }
  return Infinity;
}

describe('v4.8: caminos de los vecinos', () => {
  it('rodea un muro', () => {
    const w = flat();
    for (let z = -5; z <= 5; z++) for (const y of [21, 22, 23]) w.setBlock(0, y, z, Block.Stone);
    const path = findPath(w, [-3, 21, 0], [3, 21, 0])!;
    expect(path).not.toBeNull();
    expect(path.at(-1)).toEqual([3, 21, 0]);
    expect(path.some(([, , z]) => Math.abs(z) > 5)).toBe(true);
    // Cada paso va a una casilla vecina.
    for (let i = 1; i < path.length; i++) expect(Math.abs(path[i][0] - path[i - 1][0]) + Math.abs(path[i][2] - path[i - 1][2])).toBe(1);
  });

  it('cruza puertas pero no vallas ni agua', () => {
    const w = flat();
    for (let z = -60; z <= 60; z++) for (const y of [21, 22, 23]) w.setBlock(0, y, z, z === 0 ? [Block.Door, Block.DoorTop, Block.Stone][y - 21] : Block.Stone);
    const path = findPath(w, [-3, 21, 0], [3, 21, 0])!;
    expect(path.some(([x, , z]) => x === 0 && z === 0)).toBe(true);
    // Con una valla en lugar de la puerta no hay camino.
    w.setBlock(0, 21, 0, Block.Fence);
    w.setBlock(0, 22, 0, Block.Air);
    expect(findPath(w, [-3, 21, 0], [3, 21, 0], 3000)).toBeNull();
    expect(standable({ getBlock: (_x, y) => (y <= 20 ? Block.Stone : Block.Water) }, 0, 21, 0)).toBe(false);
  });

  it('sube escalones y da saltitos de dos, pero no trepa paredes de tres', () => {
    const w = flat();
    w.setBlock(1, 21, 0, Block.Stone);
    expect(findPath(w, [0, 21, 0], [1, 22, 0])).toHaveLength(2);
    const v = flat();
    for (let z = -2; z <= 2; z++) for (let x = 1; x <= 4; x++) for (const y of [21, 22]) v.setBlock(x, y, z, Block.Stone);
    expect(findPath(v, [0, 21, 0], [2, 23, 0])).toHaveLength(3);
    for (let z = -2; z <= 2; z++) for (let x = 1; x <= 4; x++) v.setBlock(x, 23, z, Block.Stone);
    expect(findPath(v, [0, 21, 0], [2, 24, 0], 2000)).toBeNull();
  });

  it('vadea los ríos (si no hay otro camino), pero no se mete en el mar', () => {
    const river = flat();
    for (let z = -80; z <= 80; z++) for (const y of [21, 22]) river.setBlock(0, y, z, Block.Water);
    const kind = (x: number) => (x === 0 ? 'río' : null);
    const path = findPath({ getBlock: river.getBlock, waterKind: kind }, [-3, 21, 0], [3, 21, 0])!;
    expect(path).toHaveLength(7);
    expect(findPath({ getBlock: river.getBlock, waterKind: (x) => (x === 0 ? 'mar' : null) }, [-3, 21, 0], [3, 21, 0], 2000)).toBeNull();
  });
});

describe('v4.8: plantillas de edificios', () => {
  it('girar cuatro veces deja la plantilla igual, y las escaleras giran con ella', () => {
    const a = templateCells(TWO_FLOOR_HOUSE, 0);
    expect(templateCells(TWO_FLOOR_HOUSE, 4)).toEqual(a);
    const [w, , d] = [7, 8, 7];
    expect(rotateCell(0, 0, w, d, 1)).toEqual([6, 0]);
    const stairs0 = a.find(([, , , b]) => b === Block.PlanksStairs)!;
    expect(stairs0).toBeTruthy();
    expect(templateCells(TWO_FLOOR_HOUSE, 1).some(([, , , b]) => b === Block.PlanksStairs + 1)).toBe(true);
    expect(footprint(TWO_FLOOR_HOUSE, 1)).toEqual([7, 7]);
  });

  it('se sube a la planta de arriba por dentro, en cualquier giro', () => {
    for (let r = 0; r < 4; r++) {
      const w = flat();
      const b = placeTemplate(w, TWO_FLOOR_HOUSE, 0, 20, 0, r);
      const bed = b.slots.find((s) => s.kind === 'cama')!.at;
      const up = findPath(w, b.door, bed);
      expect(up, `giro ${r}`).not.toBeNull();
      expect(up!.at(-1)![1]).toBe(25);
      const room = b.rooms.find((x) => x.name === 'Dormitorio')!;
      expect(room.y).toBe(25);
    }
  });

  it('no se coloca encima de lo construido por el jugador ni en el agua', () => {
    const world = new World(20261025, material, {}, { terrain: 2 });
    const spot = findSpot(world, TWO_FLOOR_HOUSE, 0, 0, 60)!;
    expect(spot).not.toBeNull();
    const [x, y, z] = spot;
    expect(canPlace(world, TWO_FLOOR_HOUSE, x, y, z)).toBe(true);
    world.setBlock(x + 3, y + 1, z + 3, Block.Planks); // el jugador ha puesto algo
    expect(canPlace(world, TWO_FLOOR_HOUSE, x, y, z)).toBe(false);
    expect(canPlace(world, TWO_FLOOR_HOUSE, 400, 18, 400)).toBe(false); // mar abierto
    // Buscando otra vez, se elige otro sitio.
    const again = findSpot(world, TWO_FLOOR_HOUSE, 0, 0, 60)!;
    expect(again).not.toEqual(spot);
  });
});

describe('v4.8: agenda de los vecinos', () => {
  const canela = { name: 'Canela', sleep: [22, 7] as [number, number] };

  it('duerme de noche, desayuna en casa, hace un recado y cena en casa', () => {
    const a = agendaFor(canela, 1);
    expect(activityAt(a, 3).activity).toBe('dormir');
    expect(activityAt(a, 23).activity).toBe('dormir');
    expect(activityAt(a, 7.1).activity).toBe('casa');
    const errand = a.find((i) => i.activity === 'recado')!;
    expect(errand.from).toBeGreaterThanOrEqual(9);
    expect(errand.from).toBeLessThan(13.1);
    expect(activityAt(a, 21.9).activity).toBe('casa');
    expect(a.map((i) => i.from)).toEqual([...a.map((i) => i.from)].sort((x, y) => x - y));
  });

  it('el recado cambia con el día de la semana y solo va a sitios que existen', () => {
    const places = new Set(Array.from({ length: 7 }, (_, d) => agendaFor(canela, d).find((i) => i.activity === 'recado')!.errand));
    expect(places.size).toBeGreaterThan(1);
    for (let d = 0; d < 7; d++) expect(agendaFor(canela, d, ['plaza']).find((i) => i.activity === 'recado')!.errand).toBe('plaza');
  });

  it('cada vecino tiene sus horas y quien trabaja no se mueve de su sitio', () => {
    const b = agendaFor({ name: 'Bruno', sleep: [22, 7] }, 1);
    const c = agendaFor(canela, 1);
    expect(b).not.toEqual(c);
    expect(agendaFor({ name: 'Avellana', sleep: [22, 8], works: true }, 1).map((i) => i.activity)).toEqual(['trabajo', 'dormir']);
  });
});

describe('v4.8: un vecino cruza la isla', () => {
  it('sale de casa, va a la tienda, sube a la planta de arriba de un edificio y vuelve a casa', () => {
    const world = new World(20261025, material, {}, { terrain: 2 });
    const villagers = createVillagers(world, {});
    const v = villagers.find((x) => !x.profile.role)!;
    const shop = world.plots.find((p) => p.kind === 'shop')!;
    const spot = findSpot(world, TWO_FLOOR_HOUSE, shop.x, shop.z + 16, 60)!;
    const building = placeTemplate(world, TWO_FLOOR_HOUSE, ...spot);
    const home: Cell = [...v.home.door];
    const shopFront: Cell = [shop.door[0], shop.door[1], shop.door[2] + 2];
    const upstairs = building.slots.find((s) => s.kind === 'cama')!.at;
    // Una hora en la que está paseando (si no, su agenda le mandaría a casa o de recado).
    const hour = [9, 10, 11, 12, 14, 15, 16, 17].find((h) => activityAt(v.agendaFor(0), h).activity === 'pasear')!;

    for (const [goal, label] of [[shopFront, 'tienda'], [upstairs, 'arriba'], [home, 'casa']] as [Cell, string][]) {
      v.goTo(goal, label === 'casa' ? 'casa' : 'pasear');
      const t = walkUntilIdle(world, v, hour);
      expect(t, label).toBeLessThan(400);
      if (label === 'arriba') expect(Math.round(v.position.y)).toBe(upstairs[1]);
      if (label !== 'casa') expect(Math.hypot(v.position.x - goal[0] - 0.5, v.position.z - goal[2] - 0.5)).toBeLessThan(3);
    }
    // Al llegar a su puerta entra en casa.
    expect(v.asleep).toBe(true);
  });

  it('en casa de un amigo los vecinos siguen lo que manda el anfitrión', () => {
    const world = new World(20261025, material, {}, { terrain: 2 });
    const [host] = createVillagers(world, {}).filter((x) => !x.profile.role);
    const guest = createVillagers(world, {}).find((x) => x.name === host.name)!;
    host.position.set(host.position.x + 2, host.position.y, host.position.z + 1);
    guest.remote = host.state();
    for (let i = 0; i < 30; i++) guest.update(0.05, 12, new THREE.Vector3());
    expect(guest.position.distanceTo(host.position)).toBeLessThan(0.05);
    guest.remote = { ...host.state(), v: false };
    guest.update(0.05, 12, new THREE.Vector3());
    expect(guest.group.visible).toBe(false);
  });

  it('el mensaje de vecinos se comprueba al llegar y el protocolo sube a 5', () => {
    // La v4.14 lo sube a 6 (parcelas).
    expect(PROTOCOL).toBeGreaterThanOrEqual(5);
    const ok = { t: 'vecinos', s: [{ n: 'Canela', x: 1, y: 30, z: 2, f: 0.5, v: true, w: false }] };
    expect(parseMessage(ok)).toEqual(ok);
    expect(parseMessage({ t: 'vecinos', s: [{ n: 'Canela', x: 'a' }] })).toBeNull();
    expect(parseMessage({ t: 'vecinos', s: new Array(100).fill(ok.s[0]) })).toBeNull();
  });
});
