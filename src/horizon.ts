// Siluetas lejanas (v4.7): más allá de los chunks cargados, la isla se ve con poco detalle (un bloque grande cada
// 4×4 columnas) y el mar llega hasta el horizonte. Así, al alejarte en barco o mirar desde una montaña, la isla
// no se corta de golpe en la niebla. Se calcula sin generar chunks (World.mapColumn) y se rehace al moverse.

import * as THREE from 'three';
import { CHUNK, SEA_LEVEL, WATER_SURFACE, type World } from './world';
import { isWater } from './blocks';

/** Lado de cada celda de la silueta, en bloques. */
const CELL = 4;
/** Hasta dónde llega el mar de lejos. */
const SEA_RADIUS = 900;

type ColorOf = (block: number) => [number, number, number];

export class Horizon {
  readonly group = new THREE.Group();
  private land: THREE.Mesh | null = null;
  private readonly sea: THREE.Mesh;
  private readonly landMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
  /** Chunk y radio con los que se hizo la silueta: se rehace al cambiar. */
  private builtAt = '';
  /** Columnas muestreadas (altura y color), que no cambian mientras no cambie la isla. */
  private cells: { x: number; z: number; y: number; color: [number, number, number] }[] | null = null;

  constructor(private world: World, private colorOf: ColorOf, seaMaterial: THREE.Material) {
    this.sea = new THREE.Mesh(new THREE.BufferGeometry(), seaMaterial);
    this.sea.renderOrder = 0;
    this.group.add(this.sea);
  }

  /** Cuando cambia la estación (o el dibujo de los bloques) los colores son otros. */
  recolor() {
    this.cells = null;
    this.builtAt = '';
  }

  private sample() {
    const cells: NonNullable<Horizon['cells']> = [];
    // Tu isla y, desde la v5.1, las islas del archipiélago, que están en el mismo mar y se ven venir de lejos.
    const areas: [number, number, number][] = [[0, 0, this.world.outerRadius + 24]];
    for (const { spot, radius } of this.world.seaSpots) areas.push([spot.x, spot.z, Math.ceil(radius * 1.4 / CELL) * CELL]);
    for (const [cx, cz, R] of areas) this.sampleArea(cells, cx, cz, R);
    this.cells = cells;
  }

  private sampleArea(cells: NonNullable<Horizon['cells']>, cx: number, cz: number, R: number) {
    for (let z = cz - R; z < cz + R; z += CELL) {
      for (let x = cx - R; x < cx + R; x += CELL) {
        // El punto más alto de la celda, para que las montañas y los árboles se vean.
        let best: { block: number; y: number } | null = null;
        for (const [dx, dz] of [[1, 1], [3, 1], [1, 3], [3, 3]]) {
          const col = this.world.mapColumn(x + dx, z + dz);
          if (isWater(col.block)) continue;
          if (!best || col.y > best.y) best = col;
        }
        if (!best || best.y <= SEA_LEVEL - 1) continue;
        const [r, g, b] = this.colorOf(best.block);
        cells.push({ x, z, y: best.y + 1, color: [r / 255, g / 255, b / 255] });
      }
    }
  }

  /** Rehace la silueta fuera de los `radius` chunks alrededor del jugador. */
  update(px: number, pz: number, radius: number, visible: boolean) {
    this.group.visible = visible;
    if (!visible) return;
    const pcx = Math.floor(px / CHUNK);
    const pcz = Math.floor(pz / CHUNK);
    const at = `${pcx},${pcz},${radius}`;
    if (at === this.builtAt) return;
    this.builtAt = at;
    if (!this.cells) this.sample();
    this.buildLand(pcx, pcz, radius);
    this.buildSea(pcx, pcz, radius);
  }

  private buildLand(pcx: number, pcz: number, radius: number) {
    const positions: number[] = [];
    const colors: number[] = [];
    // Solo las celdas fuera de lo que ya se dibuja con todo detalle (con un chunk de solape para no ver huecos).
    const inner = (radius - 1) * (radius - 1);
    const base = SEA_LEVEL - 3;
    const quad = (a: number[], b: number[], c: number[], d: number[], shade: number, color: number[]) => {
      positions.push(...a, ...b, ...c, ...a, ...c, ...d);
      for (let i = 0; i < 6; i++) colors.push(color[0] * shade, color[1] * shade, color[2] * shade);
    };
    for (const cell of this.cells!) {
      const dcx = Math.floor((cell.x + CELL / 2) / CHUNK) - pcx;
      const dcz = Math.floor((cell.z + CELL / 2) / CHUNK) - pcz;
      if (dcx * dcx + dcz * dcz <= inner) continue;
      const { x, z, y, color } = cell;
      const X = x + CELL;
      const Z = z + CELL;
      quad([x, y, z], [x, y, Z], [X, y, Z], [X, y, z], 1, color);
      quad([x, base, z], [x, y, z], [X, y, z], [X, base, z], 0.8, color);
      quad([X, base, Z], [X, y, Z], [x, y, Z], [x, base, Z], 0.8, color);
      quad([x, base, Z], [x, y, Z], [x, y, z], [x, base, z], 0.65, color);
      quad([X, base, z], [X, y, z], [X, y, Z], [X, base, Z], 0.65, color);
    }
    if (this.land) {
      this.group.remove(this.land);
      this.land.geometry.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    this.land = new THREE.Mesh(geo, this.landMaterial);
    // Un poco más baja que el terreno de verdad, para que en el borde gane siempre el detallado.
    this.land.position.y = -0.15;
    this.group.add(this.land);
  }

  /** Un anillo de mar desde el borde de lo cargado hasta el horizonte. */
  private buildSea(pcx: number, pcz: number, radius: number) {
    this.sea.geometry.dispose();
    const ring = new THREE.RingGeometry(Math.max(8, (radius - 0.5) * CHUNK), SEA_RADIUS, 64, 1);
    ring.rotateX(-Math.PI / 2);
    this.sea.geometry = ring;
    this.sea.position.set((pcx + 0.5) * CHUNK, WATER_SURFACE - 0.05, (pcz + 0.5) * CHUNK);
  }
}
