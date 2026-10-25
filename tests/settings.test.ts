import { beforeEach, describe, expect, it } from 'vitest';
import { defaultSettings, loadSettings, normalizeSettings, saveSettings } from '../src/settings';

describe('opciones', () => {
  beforeEach(() => localStorage.clear());

  it('en el móvil la calidad empieza en baja', () => {
    expect(defaultSettings(true).quality).toBe('baja');
    expect(defaultSettings(false).quality).toBe('media');
  });

  it('se guardan y se recuperan', () => {
    const s = { ...defaultSettings(false), music: 30, quality: 'alta' as const, fov: 90 };
    saveSettings(s);
    expect(loadSettings(false)).toEqual(s);
  });

  it('corrige valores fuera de rango o raros', () => {
    const s = normalizeSettings({ music: 250, sfx: -4, sensitivity: 'mucha', quality: 'ultra', fov: 10 }, false);
    expect(s).toEqual({ music: 100, sfx: 0, sensitivity: 1, quality: 'media', fov: 60 });
  });

  it('con opciones rotas usa las de siempre', () => {
    localStorage.setItem('maxycraft.ajustes', '{roto');
    expect(loadSettings(true)).toEqual(defaultSettings(true));
  });
});
