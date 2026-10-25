import * as THREE from 'three';
import { type ModelSpec, buildVillagerModel } from './villagerModel';

const SIZE = 128;

/** Retratos de los vecinos para el álbum: se dibuja su modelo una vez y se guarda como imagen. */
export class Portraits {
  private cache = new Map<string, string>();
  private target = new THREE.WebGLRenderTarget(SIZE, SIZE);
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(28, 1, 0.1, 20);

  constructor(private renderer: THREE.WebGLRenderer) {
    this.target.texture.colorSpace = THREE.SRGBColorSpace;
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(1, 2, 3);
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.5), sun);
    // De frente y un poco de lado, con la cabeza y los hombros.
    this.camera.position.set(0.6, 1.25, 2.6);
    this.camera.lookAt(0, 1.05, 0);
  }

  get(name: string, spec: ModelSpec): string {
    let url = this.cache.get(name);
    if (url) return url;
    const model = buildVillagerModel(spec);
    this.scene.add(model.group);
    const r = this.renderer;
    const color = r.getClearColor(new THREE.Color());
    const alpha = r.getClearAlpha();
    const before = r.getRenderTarget();
    r.setRenderTarget(this.target);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(this.scene, this.camera);
    const px = new Uint8Array(SIZE * SIZE * 4);
    r.readRenderTargetPixels(this.target, 0, 0, SIZE, SIZE, px);
    r.setRenderTarget(before);
    r.setClearColor(color, alpha);
    this.scene.remove(model.group);
    model.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });

    // Las filas de WebGL van de abajo arriba: se dan la vuelta al pasarlas al canvas.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(SIZE, SIZE);
    for (let y = 0; y < SIZE; y++) img.data.set(px.subarray((SIZE - 1 - y) * SIZE * 4, (SIZE - y) * SIZE * 4), y * SIZE * 4);
    ctx.putImageData(img, 0, 0);
    url = canvas.toDataURL();
    this.cache.set(name, url);
    return url;
  }
}
