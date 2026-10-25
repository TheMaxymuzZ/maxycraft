import * as THREE from 'three';
import { ATLAS_TILES, BLOCKS, TILE } from './blocks';
import { itemDef } from './items';

/**
 * Lo que llevas en la mano, abajo a la derecha, como en Minecraft: el brazo, una herramienta, un objeto o un bloque.
 * Se dibuja en una pasada aparte, encima de todo, para que no se meta dentro de las paredes.
 */
export class HeldItem {
  readonly scene = new THREE.Scene();
  private holder = new THREE.Group();
  private pivot = new THREE.Group();
  private current: THREE.Object3D | null = null;
  private currentId: string | null | undefined = undefined;
  private cache = new Map<string, THREE.Object3D>();
  private arm: THREE.Mesh;
  private ambient = new THREE.AmbientLight(0xffffff, 1.6);
  private sun = new THREE.DirectionalLight(0xffffff, 1.2);
  private swing = 0;
  private bob = 0;

  private blockMaterial: THREE.MeshLambertMaterial;

  constructor(private atlas: HTMLCanvasElement, atlasTexture: THREE.Texture) {
    this.blockMaterial = new THREE.MeshLambertMaterial({ map: atlasTexture, alphaTest: 0.5 });
    this.sun.position.set(0.4, 1, 0.6);
    this.scene.add(this.ambient, this.sun, this.holder);
    this.holder.add(this.pivot);
    this.pivot.scale.setScalar(0.6);
    this.arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.75), new THREE.MeshLambertMaterial({ color: 0xe8b48a }));
    // Manga de la camiseta.
    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.3), new THREE.MeshLambertMaterial({ color: 0x4f8fd6 }));
    sleeve.position.z = 0.25;
    this.arm.add(sleeve);
  }

  /** Empieza el movimiento de golpear o usar. */
  use() {
    this.swing = 1;
  }

  /**
   * `id`: objeto en la mano (o null). `busy`: se está rompiendo algo (se golpea sin parar).
   * `walking`: velocidad al andar, para que la mano se mueva un poco. `light`: luz del día, de 0 a 1.
   */
  update(dt: number, camera: THREE.Camera, id: string | null, busy: boolean, walking: number, light: number) {
    if (id !== this.currentId) this.setItem(id);
    this.holder.position.copy(camera.position);
    this.holder.quaternion.copy(camera.quaternion);

    if (busy && this.swing <= 0) this.swing = 1;
    this.swing = Math.max(0, this.swing - dt * 4);
    this.bob += dt * walking * 1.6;
    const s = Math.sin((1 - this.swing) * Math.PI);
    const bobX = Math.sin(this.bob) * 0.025 * Math.min(1, walking / 4);
    const bobY = Math.abs(Math.cos(this.bob)) * 0.03 * Math.min(1, walking / 4);
    this.pivot.position.set(0.48 + bobX, -0.38 + bobY - s * 0.06, -0.8 - s * 0.12);
    this.pivot.rotation.set(-s * 0.9, 0, 0);

    this.ambient.intensity = 0.7 + light * 0.9;
    this.sun.intensity = 0.4 + light * 0.8;
  }

  private setItem(id: string | null) {
    this.currentId = id;
    if (this.current) this.pivot.remove(this.current);
    if (!id) {
      this.current = this.arm;
      this.arm.rotation.set(0.25, 0, 0);
      this.arm.position.set(0, -0.05, 0.1);
    } else {
      let obj = this.cache.get(id);
      if (!obj) {
        obj = this.build(id);
        this.cache.set(id, obj);
      }
      this.current = obj;
    }
    this.pivot.add(this.current);
  }

  private build(id: string): THREE.Object3D {
    const def = itemDef(id);
    // Los bloques normales se ven como un cubo pequeño con sus texturas.
    if (def.block !== undefined && BLOCKS[def.block].shape === 'cube') {
      const tiles = BLOCKS[def.block].tiles;
      const geo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
      const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
      // Caras de la caja: +x, -x, +y, -y, +z, -z (4 vértices cada una).
      const faceTile = [tiles[0], tiles[0], tiles[1], tiles[2], tiles[0], tiles[0]];
      const size = 1 / ATLAS_TILES;
      for (let f = 0; f < 6; f++) {
        const t = faceTile[f];
        const u0 = (t % ATLAS_TILES) * size;
        const v0 = 1 - (Math.floor(t / ATLAS_TILES) + 1) * size;
        for (let i = 0; i < 4; i++) {
          const k = f * 4 + i;
          uv.setXY(k, u0 + uv.getX(k) * size, v0 + uv.getY(k) * size);
        }
      }
      const cube = new THREE.Mesh(geo, this.blockMaterial);
      cube.rotation.set(0.1, Math.PI / 4, 0);
      return cube;
    }
    // Lo demás (herramientas, fruta, flores, peces…) es su icono con grosor, píxel a píxel.
    const sprite = this.voxelSprite(def.tile);
    sprite.rotation.set(0, -Math.PI / 2.4, Math.PI / 8);
    sprite.scale.setScalar(def.tool ? 0.75 : 0.5);
    return sprite;
  }

  /** Convierte un icono de 16x16 del atlas en una pieza de cubitos, como los objetos en la mano de Minecraft. */
  private voxelSprite(tile: number): THREE.Mesh {
    const ctx = this.atlas.getContext('2d')!;
    const ox = (tile % ATLAS_TILES) * TILE;
    const oy = Math.floor(tile / ATLAS_TILES) * TILE;
    const px = ctx.getImageData(ox, oy, TILE, TILE).data;
    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const p = 1 / TILE;
    const opaque = (x: number, y: number) => x >= 0 && y >= 0 && x < TILE && y < TILE && px[(y * TILE + x) * 4 + 3] > 128;
    // Cada cara del cubito solo se dibuja si no hay otro píxel pegado por ese lado.
    const faces: [number[], number[][], () => boolean][] = [];
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        if (!opaque(x, y)) continue;
        const i = (y * TILE + x) * 4;
        // THREE.Color ya pasa el color de sRGB a lineal.
        const c = new THREE.Color(`rgb(${px[i]},${px[i + 1]},${px[i + 2]})`);
        const x0 = x * p - 0.5;
        const x1 = x0 + p;
        const y1 = 0.5 - y * p;
        const y0 = y1 - p;
        const z0 = -p / 2;
        const z1 = p / 2;
        faces.length = 0;
        faces.push(
          [[0, 0, 1], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], () => true],
          [[0, 0, -1], [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], () => true],
          [[1, 0, 0], [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], () => !opaque(x + 1, y)],
          [[-1, 0, 0], [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], () => !opaque(x - 1, y)],
          [[0, 1, 0], [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], () => !opaque(x, y - 1)],
          [[0, -1, 0], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], () => !opaque(x, y + 1)],
        );
        for (const [n, quad, visible] of faces) {
          if (!visible()) continue;
          for (const k of [0, 1, 2, 0, 2, 3]) {
            positions.push(...quad[k]);
            normals.push(...n);
            colors.push(c.r, c.g, c.b);
          }
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  }
}
