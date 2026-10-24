import * as THREE from 'three';
import { ATLAS_TILES, BLOCKS, Block, isOpaque, isSolid } from './blocks';
import { columnRandom, fbm } from './noise';

export const CHUNK = 16;
export const HEIGHT = 64;

const BEACH_LEVEL = 18;

class Chunk {
  readonly data = new Uint8Array(CHUNK * CHUNK * HEIGHT);
  mesh: THREE.Mesh | null = null;
  dirty = true;
  constructor(readonly cx: number, readonly cz: number) {}
}

function index(x: number, y: number, z: number): number {
  return (y * CHUNK + z) * CHUNK + x;
}

function key(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

// Las 6 caras de un cubo: normal, esquinas y coordenadas de textura de cada esquina.
const FACES = [
  { dir: [-1, 0, 0], side: 0, corners: [[0, 1, 0, 0, 1], [0, 0, 0, 0, 0], [0, 1, 1, 1, 1], [0, 0, 1, 1, 0]] },
  { dir: [1, 0, 0], side: 0, corners: [[1, 1, 1, 0, 1], [1, 0, 1, 0, 0], [1, 1, 0, 1, 1], [1, 0, 0, 1, 0]] },
  { dir: [0, -1, 0], side: 2, corners: [[1, 0, 1, 1, 0], [0, 0, 1, 0, 0], [1, 0, 0, 1, 1], [0, 0, 0, 0, 1]] },
  { dir: [0, 1, 0], side: 1, corners: [[0, 1, 1, 1, 1], [1, 1, 1, 0, 1], [0, 1, 0, 1, 0], [1, 1, 0, 0, 0]] },
  { dir: [0, 0, -1], side: 0, corners: [[1, 0, 0, 0, 0], [0, 0, 0, 1, 0], [1, 1, 0, 0, 1], [0, 1, 0, 1, 1]] },
  { dir: [0, 0, 1], side: 0, corners: [[0, 0, 1, 0, 0], [1, 0, 1, 1, 0], [0, 1, 1, 0, 1], [1, 1, 1, 1, 1]] },
] as const;

// Las caras laterales se oscurecen un poco para dar volumen, como en Minecraft.
const FACE_SHADE = [0.8, 0.8, 0.55, 1, 0.9, 0.9];
const AO_CURVE = [0.45, 0.65, 0.82, 1];

export class World {
  private chunks = new Map<string, Chunk>();
  readonly group = new THREE.Group();

  constructor(private seed: number, private material: THREE.Material) {}

  // --- Generación ---

  heightAt(x: number, z: number): number {
    const hills = fbm(x / 64, z / 64, this.seed, 4);
    const detail = fbm(x / 18, z / 18, this.seed + 999, 2);
    return Math.floor(14 + hills * 16 + detail * 4);
  }

  /** Busca, en espiral desde (x, z), una columna con hierba arriba y sin árbol encima. */
  findSpawn(x: number, z: number): [number, number] {
    for (let r = 0; r < 40; r++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const wx = x + dx;
          const wz = z + dz;
          const h = this.heightAt(wx, wz);
          if (this.getBlock(wx, h, wz) === Block.Grass && this.getBlock(wx, h + 1, wz) === Block.Air) return [wx, wz];
        }
      }
    }
    return [x, z];
  }

  private hasTree(x: number, z: number): boolean {
    const h = this.heightAt(x, z);
    return h > BEACH_LEVEL + 1 && columnRandom(x, z, this.seed) < 0.005;
  }

  private generate(chunk: Chunk) {
    const ox = chunk.cx * CHUNK;
    const oz = chunk.cz * CHUNK;
    const d = chunk.data;

    for (let z = 0; z < CHUNK; z++) {
      for (let x = 0; x < CHUNK; x++) {
        const h = Math.min(this.heightAt(ox + x, oz + z), HEIGHT - 8);
        const beach = h <= BEACH_LEVEL;
        for (let y = 0; y <= h; y++) {
          let b: Block;
          if (y === h) b = beach ? Block.Sand : Block.Grass;
          else if (y > h - 4) b = beach ? Block.Sand : Block.Dirt;
          else b = Block.Stone;
          d[index(x, y, z)] = b;
        }
      }
    }

    // Árboles: se revisan también columnas vecinas para que las copas crucen el borde.
    for (let tz = -2; tz < CHUNK + 2; tz++) {
      for (let tx = -2; tx < CHUNK + 2; tx++) {
        const wx = ox + tx;
        const wz = oz + tz;
        if (!this.hasTree(wx, wz)) continue;
        const base = this.heightAt(wx, wz) + 1;
        const trunk = 4 + Math.floor(columnRandom(wx, wz, this.seed + 7) * 2);
        const top = base + trunk;
        const set = (lx: number, y: number, lz: number, b: Block, replace: boolean) => {
          if (lx < 0 || lx >= CHUNK || lz < 0 || lz >= CHUNK || y < 0 || y >= HEIGHT) return;
          const i = index(lx, y, lz);
          if (replace || d[i] === Block.Air) d[i] = b;
        };
        for (let y = top - 2; y <= top + 1; y++) {
          const r = y >= top ? 1 : 2;
          for (let dz = -r; dz <= r; dz++) {
            for (let dx = -r; dx <= r; dx++) {
              if (r === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
              set(tx + dx, y, tz + dz, Block.Leaves, false);
            }
          }
        }
        for (let y = base; y < top; y++) set(tx, y, tz, Block.Log, true);
      }
    }
    chunk.dirty = true;
  }

  private getChunk(cx: number, cz: number): Chunk {
    const k = key(cx, cz);
    let c = this.chunks.get(k);
    if (!c) {
      c = new Chunk(cx, cz);
      this.generate(c);
      this.chunks.set(k, c);
    }
    return c;
  }

  // --- Acceso a bloques ---

  getBlock(x: number, y: number, z: number): number {
    if (y < 0 || y >= HEIGHT) return Block.Air;
    const cx = Math.floor(x / CHUNK);
    const cz = Math.floor(z / CHUNK);
    const c = this.getChunk(cx, cz);
    return c.data[index(x - cx * CHUNK, y, z - cz * CHUNK)];
  }

  setBlock(x: number, y: number, z: number, b: Block) {
    if (y < 0 || y >= HEIGHT) return;
    const cx = Math.floor(x / CHUNK);
    const cz = Math.floor(z / CHUNK);
    const c = this.getChunk(cx, cz);
    const lx = x - cx * CHUNK;
    const lz = z - cz * CHUNK;
    c.data[index(lx, y, lz)] = b;
    c.dirty = true;
    // Si el bloque toca un borde, el chunk vecino también tiene que redibujarse.
    if (lx === 0) this.markDirty(cx - 1, cz);
    if (lx === CHUNK - 1) this.markDirty(cx + 1, cz);
    if (lz === 0) this.markDirty(cx, cz - 1);
    if (lz === CHUNK - 1) this.markDirty(cx, cz + 1);
  }

  private markDirty(cx: number, cz: number) {
    const c = this.chunks.get(key(cx, cz));
    if (c) c.dirty = true;
  }

  // --- Carga alrededor del jugador ---

  /** Genera y dibuja chunks cerca de (x, z). Construye como mucho `budget` mallas por llamada. */
  update(x: number, z: number, radius: number, budget = 2) {
    const pcx = Math.floor(x / CHUNK);
    const pcz = Math.floor(z / CHUNK);

    const wanted: [number, number, number][] = [];
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const dist = dx * dx + dz * dz;
        if (dist > radius * radius) continue;
        wanted.push([pcx + dx, pcz + dz, dist]);
      }
    }
    wanted.sort((a, b) => a[2] - b[2]);

    let built = 0;
    for (const [cx, cz] of wanted) {
      const c = this.getChunk(cx, cz);
      if (!c.dirty) continue;
      if (built >= budget && c.mesh) continue; // los ya visibles pueden esperar un fotograma
      this.buildMesh(c);
      built++;
      if (built >= budget * 4) break;
    }

    // Quitar de la escena los chunks lejanos (los datos se guardan para no perder cambios).
    const far = (radius + 2) * (radius + 2);
    for (const c of this.chunks.values()) {
      if (!c.mesh) continue;
      const dx = c.cx - pcx;
      const dz = c.cz - pcz;
      if (dx * dx + dz * dz > far) {
        this.group.remove(c.mesh);
        c.mesh.geometry.dispose();
        c.mesh = null;
        c.dirty = true;
      }
    }
  }

  /** True cuando el chunk bajo (x, z) ya tiene malla, para colocar al jugador. */
  isReady(x: number, z: number): boolean {
    const c = this.chunks.get(key(Math.floor(x / CHUNK), Math.floor(z / CHUNK)));
    return !!c && !!c.mesh;
  }

  // --- Malla ---

  private buildMesh(c: Chunk) {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    const ox = c.cx * CHUNK;
    const oz = c.cz * CHUNK;
    const tileSize = 1 / ATLAS_TILES;
    const inset = 0.001;

    for (let y = 0; y < HEIGHT; y++) {
      for (let z = 0; z < CHUNK; z++) {
        for (let x = 0; x < CHUNK; x++) {
          const b = c.data[index(x, y, z)];
          if (b === Block.Air) continue;
          const def = BLOCKS[b];
          const wx = ox + x;
          const wz = oz + z;

          for (let f = 0; f < 6; f++) {
            const face = FACES[f];
            const [nx, ny, nz] = face.dir;
            const nb = this.getBlock(wx + nx, y + ny, wz + nz);
            if (isOpaque(nb)) continue;
            if (nb === b && def.transparent) continue; // hojas contra hojas: una sola capa

            const tile = def.tiles[face.side];
            const u0 = (tile % ATLAS_TILES) * tileSize;
            const v0 = 1 - (Math.floor(tile / ATLAS_TILES) + 1) * tileSize;

            const start = positions.length / 3;
            const ao: number[] = [];
            for (const [cx, cy, cz, cu, cv] of face.corners) {
              positions.push(x + cx, y + cy, z + cz);
              normals.push(nx, ny, nz);
              uvs.push(u0 + inset + cu * (tileSize - 2 * inset), v0 + inset + cv * (tileSize - 2 * inset));
              const a = this.vertexAO(wx, y, wz, face.dir, cx, cy, cz);
              ao.push(a);
              const shade = FACE_SHADE[f] * AO_CURVE[a];
              colors.push(shade, shade, shade);
            }
            // Girar la diagonal del quad evita manchas raras en la oclusión ambiental.
            if (ao[1] + ao[2] > ao[0] + ao[3]) {
              indices.push(start, start + 1, start + 3, start, start + 3, start + 2);
            } else {
              indices.push(start, start + 1, start + 2, start + 2, start + 1, start + 3);
            }
          }
        }
      }
    }

    if (c.mesh) {
      this.group.remove(c.mesh);
      c.mesh.geometry.dispose();
      c.mesh = null;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, this.material);
    mesh.position.set(ox, 0, oz);
    c.mesh = mesh;
    c.dirty = false;
    this.group.add(mesh);
  }

  /** Oclusión ambiental por vértice: 0 (muy tapado) a 3 (libre). */
  private vertexAO(x: number, y: number, z: number, dir: readonly number[], cx: number, cy: number, cz: number): number {
    const px = x + dir[0];
    const py = y + dir[1];
    const pz = z + dir[2];
    const corner = [cx, cy, cz];
    const axes = [0, 1, 2].filter((a) => dir[a] === 0);
    const step = (a: number) => (corner[a] === 1 ? 1 : -1);
    const off = (a: number) => {
      const o = [0, 0, 0];
      o[a] = step(a);
      return o;
    };
    const [ua, va] = axes;
    const u = off(ua);
    const v = off(va);
    const s1 = isSolid(this.getBlock(px + u[0], py + u[1], pz + u[2])) ? 1 : 0;
    const s2 = isSolid(this.getBlock(px + v[0], py + v[1], pz + v[2])) ? 1 : 0;
    const cr = isSolid(this.getBlock(px + u[0] + v[0], py + u[1] + v[1], pz + u[2] + v[2])) ? 1 : 0;
    if (s1 && s2) return 0;
    return 3 - (s1 + s2 + cr);
  }
}
