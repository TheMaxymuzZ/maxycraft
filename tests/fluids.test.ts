import { describe, expect, it } from 'vitest';
import { Block, isWater, waterLevel } from '../src/blocks';
import { FLUID_STEP, Fluids, waterFlow } from '../src/fluids';

/** Un mundito de prueba: suelo de piedra en y = 0 y aire encima, 32×32. */
function makeWorld() {
  const blocks = new Map<string, number>();
  const k = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const w = {
    getBlock: (x: number, y: number, z: number) => blocks.get(k(x, y, z)) ?? (y <= 0 ? Block.Stone : Block.Air),
    setBlock: (x: number, y: number, z: number, b: number) => {
      blocks.set(k(x, y, z), b);
      fluids.wake(x, y, z);
    },
    loaded: (x: number, z: number) => Math.abs(x) < 32 && Math.abs(z) < 32,
  };
  const fluids = new Fluids(w);
  const run = (steps = 40) => {
    for (let i = 0; i < steps; i++) fluids.update(FLUID_STEP);
  };
  return { w, fluids, run, get: w.getBlock, set: w.setBlock };
}

describe('física del agua (v3.8)', () => {
  it('una fuente en el suelo se extiende 7 bloques, cada vez más baja', () => {
    const { set, get, run } = makeWorld();
    set(0, 1, 0, Block.Water);
    run();
    expect(get(0, 1, 0)).toBe(Block.Water);
    for (let d = 1; d <= 7; d++) expect(waterLevel(get(d, 1, 0))).toBe(d);
    expect(get(8, 1, 0)).toBe(Block.Air);
    // En diagonal también llega, por los dos lados.
    expect(waterLevel(get(3, 1, 3))).toBe(6);
  });

  it('el agua cae por un hueco y abajo se vuelve a extender', () => {
    const { set, get, run } = makeWorld();
    // Una plataforma de piedra a y = 5 con la fuente encima, al borde.
    for (let x = -3; x <= 0; x++) for (let z = -3; z <= 3; z++) set(x, 5, z, Block.Stone);
    set(0, 6, 0, Block.Water);
    run(60);
    expect(get(1, 6, 0)).toBe(Block.WaterFlow1);
    // Cae desde el borde hasta el suelo...
    for (let y = 1; y <= 5; y++) expect(get(1, y, 0)).toBe(Block.WaterFall);
    // ...y allí se extiende otra vez.
    expect(waterLevel(get(3, 1, 0))).toBe(2);
  });

  it('al quitar la fuente, el agua que corría se seca', () => {
    const { set, get, run } = makeWorld();
    set(0, 1, 0, Block.Water);
    run();
    set(0, 1, 0, Block.Air);
    run(80);
    for (let d = 0; d <= 7; d++) expect(isWater(get(d, 1, 0))).toBe(false);
  });

  it('fuente infinita: con dos fuentes al lado y suelo debajo sale una nueva', () => {
    const { set, get, run } = makeWorld();
    // Un canal de 3 de largo, con paredes.
    for (let x = -1; x <= 3; x++) {
      set(x, 1, -1, Block.Stone);
      set(x, 1, 1, Block.Stone);
    }
    set(-1, 1, 0, Block.Stone);
    set(3, 1, 0, Block.Stone);
    set(0, 1, 0, Block.Water);
    set(2, 1, 0, Block.Water);
    run();
    expect(get(1, 1, 0)).toBe(Block.Water);
    // Se puede sacar agua de ella sin que se acabe: al quitar la del medio, vuelve a salir.
    set(1, 1, 0, Block.Air);
    run();
    expect(get(1, 1, 0)).toBe(Block.Water);
  });

  it('el agua busca el desnivel más cercano en vez de extenderse a todos lados', () => {
    const { set, get, run } = makeWorld();
    // Suelo a y = 1 (piedra) con un agujero a 2 bloques hacia +x.
    for (let x = -6; x <= 6; x++) for (let z = -6; z <= 6; z++) if (!(x === 2 && z === 0)) set(x, 1, z, Block.Stone);
    set(0, 2, 0, Block.Water);
    run();
    expect(waterLevel(get(1, 2, 0))).toBe(1);
    expect(get(-1, 2, 0)).toBe(Block.Air);
    expect(get(2, 1, 0)).toBe(Block.WaterFall);
  });

  it('un bloque puesto en el agua la corta', () => {
    const { set, get, run } = makeWorld();
    for (let z = -1; z <= 1; z++) set(1, 1, z, Block.Stone);
    set(0, 1, 0, Block.Water);
    run();
    expect(isWater(get(2, 1, 0))).toBe(true); // rodea la piedra por los lados
    for (let z = -9; z <= 9; z++) set(1, 1, z, Block.Stone);
    run(80);
    expect(isWater(get(2, 1, 0))).toBe(false);
  });

  it('la corriente empuja desde la fuente hacia fuera', () => {
    const { set, get, run } = makeWorld();
    set(0, 1, 0, Block.Water);
    run();
    const f = waterFlow(get, 3, 1, 0);
    expect(f.x).toBeGreaterThan(0.9);
    expect(waterFlow(get, 0, 1, 0)).toEqual({ x: 0, z: 0, down: false });
  });

  it('desactivado (invitado en una partida con amigos), no mueve nada', () => {
    const { set, get, run, fluids } = makeWorld();
    fluids.enabled = false;
    set(0, 1, 0, Block.Water);
    run();
    expect(get(1, 1, 0)).toBe(Block.Air);
  });
});
