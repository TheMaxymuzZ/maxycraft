import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Block } from '../src/blocks';
import { Inventory } from '../src/inventory';
import { defaultKeys } from '../src/keys';
import { HAND_LIGHT } from '../src/lighting';
import { World } from '../src/world';

const material = new THREE.MeshBasicMaterial();

/** Una cueva cerrada de piedra en el cielo, para probar la luz sin que moleste el terreno. */
function cave(world: World, x0: number, y0: number, z0: number) {
  for (let x = x0 - 1; x <= x0 + 9; x++) {
    for (let z = z0 - 1; z <= z0 + 3; z++) {
      for (let y = y0 - 1; y <= y0 + 3; y++) {
        const inside = x >= x0 && x <= x0 + 8 && z >= z0 && z <= z0 + 2 && y >= y0 && y <= y0 + 2;
        world.setBlock(x, y, z, inside ? Block.Air : Block.Stone);
      }
    }
  }
}

describe('luz', () => {
  const world = new World(20261025, material);
  const [x0, z0] = [4, 4];
  const y0 = 40;
  cave(world, x0, y0, z0);
  world.setBlock(x0, y0, z0 + 1, Block.Torch);
  const light = () => world['blockLightRegion'](0, 0);

  it('la antorcha alumbra menos cuanto más lejos', () => {
    const at = light();
    expect(at(x0, y0, z0 + 1)).toBeCloseTo(13 / 15);
    expect(at(x0 + 1, y0, z0 + 1)).toBeCloseTo(12 / 15);
    expect(at(x0 + 5, y0, z0 + 1)).toBeCloseTo(8 / 15);
  });

  it('una pared tapa la luz', () => {
    expect(light()(x0 + 6, y0, z0 + 1)).toBeGreaterThan(0);
    for (let y = y0; y <= y0 + 2; y++) for (let z = z0; z <= z0 + 2; z++) world.setBlock(x0 + 4, y, z, Block.Stone);
    const at = light();
    expect(at(x0 + 3, y0, z0 + 1)).toBeGreaterThan(0);
    expect(at(x0 + 5, y0, z0 + 1)).toBe(0);
    expect(at(x0 + 6, y0, z0 + 1)).toBe(0);
  });

  it('sin luces cerca, no hay luz de antorchas', () => {
    expect(world['blockLightRegion'](640, 640)(650, y0, 650)).toBe(0);
  });

  it('la antorcha y el bloque de luz alumbran en la mano', () => {
    expect(HAND_LIGHT.antorcha).toBeGreaterThan(0);
    expect(HAND_LIGHT.bloque_luz).toBeGreaterThan(0);
  });
});

describe('luz del cielo (v3.1)', () => {
  const world = new World(20261025, material);
  const [x0, z0] = [4, 4];
  const y0 = 40;
  cave(world, x0, y0, z0);
  // Abrir la pared de un lado: la luz entra por ahí.
  for (let y = y0; y <= y0 + 2; y++) for (let z = z0; z <= z0 + 2; z++) world.setBlock(x0 - 1, y, z, Block.Air);
  const sky = () => world['skyLightRegion'](0, 0);

  it('al aire libre la luz del cielo es total', () => {
    expect(sky()(x0 - 3, y0 + 10, z0)).toBe(1);
  });

  it('dentro de una cueva la luz baja poco a poco, sin cortes', () => {
    const at = sky();
    let before = at(x0 - 2, y0, z0 + 1);
    expect(before).toBe(1);
    for (let x = x0 - 1; x <= x0 + 8; x++) {
      const now = at(x, y0, z0 + 1);
      expect(before - now).toBeCloseTo(1 / 15);
      before = now;
    }
  });

  it('si se tapa la entrada, la cueva queda a oscuras', () => {
    for (let y = y0; y <= y0 + 2; y++) for (let z = z0; z <= z0 + 2; z++) world.setBlock(x0 - 1, y, z, Block.Stone);
    expect(sky()(x0 + 4, y0, z0 + 1)).toBe(0);
  });

  it('lightAt da la luz guardada al dibujar el chunk', () => {
    world.setBlock(x0 + 2, y0, z0 + 1, Block.Torch);
    world['buildMesh'](world['getChunk'](0, 0));
    const [skyLevel, glow] = world.lightAt(x0 + 3, y0, z0 + 1);
    expect(skyLevel).toBeLessThan(0.5); // cerca de la superficie, como dentro de una casa: oscuro pero no negro
    expect(glow).toBeCloseTo(12 / 15);
    expect(world.lightAt(x0, 70, z0)).toEqual([1, 0]);
  });
});

describe('dos manos', () => {
  it('cambiar de mano pasa la casilla a la otra mano y al revés', () => {
    const inv = new Inventory();
    inv.slots[3] = { id: 'antorcha', count: 5 };
    inv.swapOffhand(3);
    expect(inv.offhand).toEqual({ id: 'antorcha', count: 5 });
    expect(inv.slots[3]).toBeNull();
    inv.slots[3] = { id: 'pala', count: 1, wear: 0 };
    inv.swapOffhand(3);
    expect(inv.offhand?.id).toBe('pala');
    expect(inv.slots[3]?.id).toBe('antorcha');
  });

  it('una partida vieja o un objeto que ya no existe dejan la otra mano vacía', () => {
    const inv = new Inventory();
    inv.loadOffhand(undefined);
    expect(inv.offhand).toBeNull();
    inv.loadOffhand({ id: 'no_existe', count: 1 });
    expect(inv.offhand).toBeNull();
  });

  it('se cambia de mano con la Q', () => {
    expect(defaultKeys().offhand).toBe('KeyQ');
  });
});
