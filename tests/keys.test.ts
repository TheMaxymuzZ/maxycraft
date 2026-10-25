import { describe, expect, it } from 'vitest';
import { ACTIONS, bindKey, canBind, defaultKeys, keyLabel, normalizeKeys } from '../src/keys';
import { CHANGELOG, compareVersions, hasUnseenNews, markNewsSeen } from '../src/changelog';
import pkg from '../package.json';

describe('teclas', () => {
  it('las de siempre no se repiten', () => {
    expect(new Set(Object.values(defaultKeys())).size).toBe(ACTIONS.length);
  });

  it('al poner una tecla que ya usaba otra acción, se intercambian', () => {
    const k = bindKey(defaultKeys(), 'forward', 'KeyE');
    expect(k.forward).toBe('KeyE');
    expect(k.inventory).toBe('KeyW');
    expect(new Set(Object.values(k)).size).toBe(ACTIONS.length);
  });

  it('no deja usar Esc ni los números', () => {
    expect(canBind('Escape')).toBe(false);
    expect(canBind('Digit3')).toBe(false);
    expect(canBind('KeyZ')).toBe(true);
  });

  it('corrige mapas guardados raros', () => {
    expect(normalizeKeys(null)).toEqual(defaultKeys());
    expect(normalizeKeys({ forward: 'KeyZ' }).forward).toBe('KeyZ');
    expect(normalizeKeys({ forward: 'Escape' }).forward).toBe('KeyW');
    // Dos acciones con la misma tecla: no se acepta la segunda.
    const k = normalizeKeys({ forward: 'KeyZ', back: 'KeyZ' });
    expect(new Set(Object.values(k)).size).toBe(ACTIONS.length);
  });

  it('enseña nombres cortos y en español', () => {
    expect(keyLabel('KeyW')).toBe('W');
    expect(keyLabel('Space')).toBe('Espacio');
    expect(keyLabel('ShiftLeft')).toBe('Mayús izq.');
    expect(keyLabel('Semicolon')).toBe('Ñ');
  });
});

describe('novedades', () => {
  it('la primera es la versión actual del juego', () => {
    expect(pkg.version.startsWith(CHANGELOG[0].version)).toBe(true);
    for (let i = 1; i < CHANGELOG.length; i++) expect(compareVersions(CHANGELOG[i - 1].version, CHANGELOG[i].version)).toBe(1);
  });

  it('compara versiones por números, no por letras', () => {
    expect(compareVersions('1.10', '1.9')).toBe(1);
    expect(compareVersions('2.0', '1.10')).toBe(1);
    expect(compareVersions('1.2', '1.2')).toBe(0);
  });

  it('se enseñan una vez después de actualizar, y no al jugar por primera vez', () => {
    localStorage.clear();
    expect(hasUnseenNews(false)).toBe(false);
    expect(hasUnseenNews(true)).toBe(true);
    markNewsSeen();
    expect(hasUnseenNews(true)).toBe(false);
    localStorage.setItem('maxycraft.novedades', '1.9');
    expect(hasUnseenNews(true)).toBe(true);
  });
});
