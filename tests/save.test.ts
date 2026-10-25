import { beforeEach, describe, expect, it } from 'vitest';
import { type SaveData, activeSlot, backupName, checkSave, deleteGame, exportSave, importSave, loadGame, saveGame, setActiveSlot, slotKey } from '../src/save';

const sample: SaveData = {
  version: 1,
  seed: 1234,
  edits: { '0,0': { 5: 3 } },
  player: { x: 1, y: 20, z: 3, yaw: 0.5, pitch: 0 },
  inventory: [{ id: 'rama', count: 3 }, null],
  wallet: 900,
  home: { level: 1, debt: 4000, roof: 2 },
};

describe('partida guardada', () => {
  beforeEach(() => localStorage.clear());

  it('se guarda y se recupera igual', () => {
    expect(saveGame(sample)).toBe(true);
    expect(loadGame()).toEqual(sample);
  });

  it('sin partida devuelve null', () => {
    expect(loadGame()).toBeNull();
  });

  it('una partida rota no hace fallar el juego', () => {
    localStorage.setItem('maxycraft.isla.v1', '{esto no es json');
    expect(loadGame()).toBeNull();
  });

  it('ignora partidas de otra versión del formato', () => {
    localStorage.setItem('maxycraft.isla.v1', JSON.stringify({ ...sample, version: 99 }));
    expect(loadGame()).toBeNull();
  });

  it('se puede borrar', () => {
    saveGame(sample);
    deleteGame();
    expect(loadGame()).toBeNull();
  });
});

describe('varias islas', () => {
  beforeEach(() => localStorage.clear());

  it('la primera isla sigue en la clave de siempre', () => {
    expect(slotKey(0)).toBe('maxycraft.isla.v1');
    localStorage.setItem('maxycraft.isla.v1', JSON.stringify(sample));
    expect(activeSlot()).toBe(0);
    expect(loadGame()).toEqual(sample);
  });

  it('cada isla se guarda aparte', () => {
    saveGame(sample, 0);
    saveGame({ ...sample, seed: 99 }, 2);
    expect(loadGame(0)?.seed).toBe(1234);
    expect(loadGame(1)).toBeNull();
    expect(loadGame(2)?.seed).toBe(99);
    deleteGame(2);
    expect(loadGame(2)).toBeNull();
    expect(loadGame(0)?.seed).toBe(1234);
  });

  it('recuerda qué isla se está jugando y no acepta huecos que no existen', () => {
    setActiveSlot(2);
    expect(activeSlot()).toBe(2);
    saveGame(sample);
    expect(loadGame(2)).toEqual(sample);
    localStorage.setItem('maxycraft.isla.activa', '7');
    expect(activeSlot()).toBe(0);
  });
});

describe('copias de seguridad', () => {
  it('una copia se vuelve a cargar igual', () => {
    expect(importSave(exportSave(sample))).toEqual(sample);
  });

  it('también acepta una partida suelta', () => {
    expect(importSave(JSON.stringify(sample))).toEqual(sample);
  });

  it('rechaza archivos que no son de Maxycraft con un mensaje claro', () => {
    expect(() => importSave('hola')).toThrow('no es una copia de Maxycraft');
    expect(() => importSave(JSON.stringify({ juego: 'maxycraft', isla: { version: 1 } }))).toThrow('incompleta');
    expect(() => importSave(JSON.stringify({ foto: 'gato.png' }))).toThrow('incompleta');
  });

  it('comprueba lo imprescindible de una partida', () => {
    expect(checkSave(sample)).toBe(sample);
    expect(checkSave({ ...sample, seed: 'abc' })).toBeNull();
    expect(checkSave({ ...sample, edits: null })).toBeNull();
    expect(checkSave(null)).toBeNull();
  });

  it('el archivo lleva el número de isla y la fecha', () => {
    expect(backupName(1, new Date(2026, 9, 5))).toBe('maxycraft-isla-2-2026-10-05.json');
  });
});
