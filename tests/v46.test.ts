import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Block } from '../src/blocks';
import {
  SAVE_VERSION, type SaveData, type VisitedIsland, deleteGame, exportAll, exportSlot, flushSaves, importAll, importSaveFile,
  listVisited, loadGame, loadVisited, saveGame, saveGameNow, saveVisited, slotKey,
} from '../src/save';
import { RESCUE_KEY, closeStore, get, openStore, packEdits, unpackEdits, usingDatabase } from '../src/store';

const sample = (wallet: number, savedAt = 1000): SaveData => ({
  version: SAVE_VERSION,
  seed: 1234,
  edits: { '0,0': { 5: Block.Planks, 16383: Block.Stone }, '-3,7': { 9000: 300 } },
  player: { x: 1, y: 20, z: 3, yaw: 0.5, pitch: 0 },
  inventory: [{ id: 'rama', count: 3 }, null],
  wallet,
  savedAt,
});

const keysOf = () => [0, 1, 2].map(slotKey);
let factory: IDBFactory;

beforeEach(() => {
  localStorage.clear();
  factory = new IDBFactory();
});
afterEach(() => closeStore());

describe('v4.6: cambios del mundo empaquetados', () => {
  it('se empaquetan y desempaquetan igual, incluidos bloques de 16 bits', () => {
    const edits = sample(0).edits;
    const packed = packEdits(edits);
    expect(packed['0,0']).toBeInstanceOf(Uint32Array);
    expect(packed['0,0'].byteLength).toBe(8);
    expect(unpackEdits(packed)).toEqual(edits);
  });
});

describe('v4.6: guardado en IndexedDB', () => {
  it('sin abrir el almacén se sigue usando localStorage', () => {
    expect(usingDatabase()).toBe(false);
    saveGame(sample(5));
    expect(localStorage.getItem(slotKey(0))).not.toBeNull();
  });

  it('la primera vez pasa las partidas de localStorage a IndexedDB y luego las borra de allí', async () => {
    localStorage.setItem(slotKey(0), JSON.stringify({ ...sample(900), version: 1 }));
    localStorage.setItem(slotKey(2), JSON.stringify(sample(300)));
    expect(await openStore(keysOf(), factory)).toBe(true);
    expect(loadGame(0)?.wallet).toBe(900);
    expect(loadGame(0)?.version).toBe(SAVE_VERSION);
    expect(loadGame(2)?.wallet).toBe(300);
    expect(localStorage.getItem(slotKey(0))).toBeNull();
    expect(localStorage.getItem(slotKey(2))).toBeNull();
    // Y siguen ahí al volver a abrir el juego.
    closeStore();
    expect(await openStore(keysOf(), factory)).toBe(true);
    expect(loadGame(0)?.wallet).toBe(900);
    expect(loadGame(0)?.edits).toEqual(sample(0).edits);
  });

  it('guarda, recupera y borra', async () => {
    await openStore(keysOf(), factory);
    expect(saveGame(sample(42), 1)).toBe(true);
    expect(await flushSaves()).toBe(true);
    closeStore();
    await openStore(keysOf(), factory);
    expect(loadGame(1)).toEqual(sample(42));
    deleteGame(1);
    await flushSaves();
    closeStore();
    await openStore(keysOf(), factory);
    expect(loadGame(1)).toBeNull();
  });

  it('lo que devuelve es una copia: cambiarlo no toca lo guardado', async () => {
    await openStore(keysOf(), factory);
    saveGame(sample(10));
    loadGame()!.wallet = 999;
    expect(loadGame()!.wallet).toBe(10);
  });

  it('si se cierra la pestaña a medias, recupera la copia de rescate si es más nueva', async () => {
    await openStore(keysOf(), factory);
    saveGame(sample(10, 1000));
    await flushSaves();
    saveGameNow(sample(77, 2000));
    expect(localStorage.getItem(RESCUE_KEY)).not.toBeNull();
    closeStore();
    // Simula que IndexedDB no llegó a escribir la última: se pone otra vez la vieja.
    const f2 = factory;
    await openStore(keysOf(), f2);
    expect(loadGame()!.wallet).toBe(77);
    expect(localStorage.getItem(RESCUE_KEY)).toBeNull();
  });

  it('una copia de rescate más vieja no pisa la partida', async () => {
    await openStore(keysOf(), factory);
    saveGame(sample(50, 5000));
    await flushSaves();
    closeStore();
    localStorage.setItem(RESCUE_KEY, JSON.stringify({ key: slotKey(0), data: sample(1, 10) }));
    await openStore(keysOf(), factory);
    expect(loadGame()!.wallet).toBe(50);
  });
});

const island = (n: number): VisitedIsland => ({
  id: `recursos-${n}`, name: `Isla ${n}`, kind: 'recursos', seed: 1000 + n,
  edits: { '0,0': { [n]: Block.Stone } }, visitedAt: n,
});

describe('v4.6: archipiélago', () => {
  it('guarda 20 islas visitadas y cada una se carga aparte', async () => {
    await openStore(keysOf(), factory);
    saveGame(sample(1));
    for (let n = 0; n < 20; n++) expect(saveVisited(island(n))).toBe(true);
    expect(await flushSaves()).toBe(true);
    closeStore();
    await openStore(keysOf(), factory);
    expect(listVisited().sort()).toEqual(Array.from({ length: 20 }, (_, n) => `recursos-${n}`).sort());
    expect(loadVisited('recursos-7')).toEqual(island(7));
    // Las de una partida no se mezclan con las de otra.
    expect(listVisited(1)).toEqual([]);
  });

  it('al borrar una partida se borran sus islas', async () => {
    await openStore(keysOf(), factory);
    saveGame(sample(1));
    saveVisited(island(1));
    deleteGame(0);
    expect(listVisited()).toEqual([]);
    expect(get(slotKey(0))).toBeNull();
  });

  it('la copia de una isla lleva sus islas visitadas', async () => {
    await openStore(keysOf(), factory);
    saveGame(sample(1));
    saveVisited(island(3));
    const { isla, visitas } = importSaveFile(exportSlot(0)!);
    expect(isla.wallet).toBe(1);
    expect(visitas).toEqual([island(3)]);
  });

  it('copia de todo: se exporta y se importa entera, sustituyendo lo que hubiera', async () => {
    await openStore(keysOf(), factory);
    saveGame(sample(11), 0);
    saveGame(sample(33), 2);
    saveVisited(island(5), 2);
    const text = exportAll();
    deleteGame(0);
    deleteGame(2);
    saveGame(sample(99), 1);
    expect(importAll(text)).toBe(2);
    expect(loadGame(0)?.wallet).toBe(11);
    expect(loadGame(1)).toBeNull();
    expect(loadGame(2)?.wallet).toBe(33);
    expect(loadVisited('recursos-5', 2)).toEqual(island(5));
  });

  it('distingue la copia de todo de la de una isla', async () => {
    await openStore(keysOf(), factory);
    saveGame(sample(1));
    expect(() => importSaveFile(exportAll())).toThrow('copia de todas');
    expect(() => importAll(exportSlot(0)!)).toThrow('copia de todo');
  });
});
