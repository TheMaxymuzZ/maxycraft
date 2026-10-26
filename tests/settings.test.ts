import { beforeEach, describe, expect, it } from 'vitest';
import { defaultKeys } from '../src/keys';
import { defaultSettings, loadSettings, normalizeSettings, saveSettings, uiScaleFor, RENDER_RADIUS } from '../src/settings';

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
    expect(s).toEqual({ music: 100, sfx: 0, sensitivity: 1, quality: 'media', fov: 60, keys: defaultKeys(), bigText: false, colorblind: false, dayLength: 24, uiScale: 100, viewDistance: RENDER_RADIUS.media });
  });

  it('el tamaño de la interfaz se queda entre 70% y 150%, de 5 en 5 (v3.7)', () => {
    expect(normalizeSettings({ uiScale: 300 }, false).uiScale).toBe(150);
    expect(normalizeSettings({ uiScale: 10 }, false).uiScale).toBe(70);
    expect(normalizeSettings({ uiScale: 118 }, false).uiScale).toBe(120);
    expect(normalizeSettings({}, true).uiScale).toBe(100);
  });

  it('la interfaz no crece más de lo que cabe en la pantalla', () => {
    expect(uiScaleFor(140, 1920, 1080, false)).toBe(1.4);
    expect(uiScaleFor(80, 844, 390, true)).toBe(0.8);
    // Un móvil en horizontal es bajito: al 140% los botones se montarían.
    expect(uiScaleFor(140, 844, 390, true)).toBeLessThan(1.2);
    expect(uiScaleFor(140, 844, 390, true)).toBeGreaterThanOrEqual(1);
    expect(uiScaleFor(140, 1366, 1024, true)).toBe(1.4);
  });

  it('las opciones de antes de la v2.0 siguen valiendo', () => {
    const s = normalizeSettings({ music: 40, sfx: 50, sensitivity: 1.5, quality: 'alta', fov: 80 }, false);
    expect(s.music).toBe(40);
    expect(s.keys).toEqual(defaultKeys());
    expect(s.bigText).toBe(false);
  });

  it('con opciones rotas usa las de siempre', () => {
    localStorage.setItem('maxycraft.ajustes', '{roto');
    expect(loadSettings(true)).toEqual(defaultSettings(true));
  });
});
