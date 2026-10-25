import { beforeEach, describe, expect, it } from 'vitest';
import { type SaveData, deleteGame, loadGame, saveGame } from '../src/save';

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
