import * as THREE from 'three';
import { ATLAS_TILES, BLOCKS, TILE } from './blocks';
import { itemDef } from './items';

/**
 * Formas en 3D de los objetos (v3.3), las mismas en la mano y tirados por el suelo:
 * los bloques son un cubo pequeño con sus texturas y lo demás es su icono con grosor, píxel a píxel, como en Minecraft.
 */
export class ItemModels {
  private geometries = new Map<string, THREE.BufferGeometry>();
  /** Material de los cubos: usa el atlas de texturas. */
  readonly blockMaterial: THREE.MeshLambertMaterial;
  /** Material de las piezas de cubitos: el color va en cada vértice. */
  readonly voxelMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });

  constructor(private atlas: HTMLCanvasElement, atlasTexture: THREE.Texture) {
    this.blockMaterial = new THREE.MeshLambertMaterial({ map: atlasTexture, alphaTest: 0.5 });
  }

  /** True si el objeto se ve como un cubo (un bloque entero). */
  isCube(id: string): boolean {
    const def = itemDef(id);
    return def.block !== undefined && BLOCKS[def.block].shape === 'cube';
  }

  /** Geometría del objeto, centrada y de 1 de lado; se comparte entre todos los que la usan. */
  geometry(id: string): THREE.BufferGeometry {
    let geo = this.geometries.get(id);
    if (!geo) {
      geo = this.isCube(id) ? this.cube(id) : this.voxels(itemDef(id).tile);
      this.geometries.set(id, geo);
    }
    return geo;
  }

  /** Una malla nueva del objeto. `material` permite usar uno propio (por ejemplo, para oscurecerlo en una cueva). */
  mesh(id: string, material?: THREE.Material): THREE.Mesh {
    return new THREE.Mesh(this.geometry(id), material ?? (this.isCube(id) ? this.blockMaterial : this.voxelMaterial));
  }

  private cube(id: string): THREE.BufferGeometry {
    const tiles = BLOCKS[itemDef(id).block!].tiles;
    const geo = new THREE.BoxGeometry(1, 1, 1);
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
    return geo;
  }

  /** Convierte un icono de 16x16 del atlas en una pieza de cubitos de 1 de lado y 1/16 de grosor. */
  private voxels(tile: number): THREE.BufferGeometry {
    const ctx = this.atlas.getContext('2d')!;
    const ox = (tile % ATLAS_TILES) * TILE;
    const oy = Math.floor(tile / ATLAS_TILES) * TILE;
    const px = ctx.getImageData(ox, oy, TILE, TILE).data;
    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const p = 1 / TILE;
    const opaque = (x: number, y: number) => x >= 0 && y >= 0 && x < TILE && y < TILE && px[(y * TILE + x) * 4 + 3] > 128;
    const c = new THREE.Color();
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        if (!opaque(x, y)) continue;
        const i = (y * TILE + x) * 4;
        // THREE.Color ya pasa el color de sRGB a lineal.
        c.setRGB(px[i] / 255, px[i + 1] / 255, px[i + 2] / 255, THREE.SRGBColorSpace);
        const x0 = x * p - 0.5;
        const x1 = x0 + p;
        const y1 = 0.5 - y * p;
        const y0 = y1 - p;
        const z0 = -p / 2;
        const z1 = p / 2;
        // Cada cara del cubito solo se dibuja si no hay otro píxel pegado por ese lado.
        // Los bordes salen un poco más oscuros: así el objeto se lee bien desde lejos.
        const faces: [number[], number[][], boolean, number][] = [
          [[0, 0, 1], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], true, 1],
          [[0, 0, -1], [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], true, 1],
          [[1, 0, 0], [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], !opaque(x + 1, y), 0.7],
          [[-1, 0, 0], [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], !opaque(x - 1, y), 0.7],
          [[0, 1, 0], [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], !opaque(x, y - 1), 0.85],
          [[0, -1, 0], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], !opaque(x, y + 1), 0.55],
        ];
        for (const [n, quad, visible, shade] of faces) {
          if (!visible) continue;
          for (const k of [0, 1, 2, 0, 2, 3]) {
            positions.push(...quad[k]);
            normals.push(...n);
            colors.push(c.r * shade, c.g * shade, c.b * shade);
          }
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeBoundingSphere();
    return geo;
  }
}
