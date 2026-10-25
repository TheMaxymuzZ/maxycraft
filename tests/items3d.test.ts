import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ItemModels } from '../src/itemModels';

describe('objetos en 3D (v3.3)', () => {
  const models = new ItemModels(document.createElement('canvas'), new THREE.Texture());

  it('los bloques enteros son cubos y lo demás no', () => {
    expect(models.isCube('tablones')).toBe(true);
    expect(models.isCube('piedra')).toBe(true);
    expect(models.isCube('hacha')).toBe(false);
    expect(models.isCube('manzana')).toBe(false);
    expect(models.isCube('losa_madera')).toBe(false);
  });

  it('todos los cubos comparten la misma forma', () => {
    expect(models.geometry('tablones')).toBe(models.geometry('tablones'));
    expect(models.mesh('tablones').material).toBe(models.blockMaterial);
  });
});
