import * as THREE from 'three';
import { ATLAS_TILES, FURNITURE_TILE_START, TILE } from './blocks';

// Muebles hechos con cajas, como los de Minecraft. Ocupan una casilla y miran hacia +z.

export interface FurnitureDef {
  id: string;
  name: string;
  sell: number;
  /** Si no tiene precio de compra, solo se consigue fabricándolo. */
  buy?: number;
  /** Las piezas: [ancho, alto, fondo, color, x, y, z] con (x, z) en el centro y y en la base. */
  parts: [number, number, number, number, number, number, number][];
  /** Si brilla de noche (las lámparas). */
  glow?: number;
  /** Solo se vende en esa fiesta. */
  holiday?: 'halloween' | 'navidad';
}

const WOOD = 0xb9824f;
const DARK = 0x7a5233;

export const FURNITURE: FurnitureDef[] = [
  {
    id: 'cama', name: 'Cama', sell: 300, buy: 1200,
    parts: [
      [0.9, 0.3, 0.96, WOOD, 0, 0, 0],
      [0.84, 0.14, 0.9, 0xf4f1e8, 0, 0.3, 0],
      [0.86, 0.06, 0.6, 0x5a8fd6, 0, 0.42, 0.16],
      [0.5, 0.12, 0.22, 0xffffff, 0, 0.44, -0.3],
      [0.9, 0.62, 0.08, DARK, 0, 0, -0.46],
    ],
  },
  {
    id: 'mesa', name: 'Mesa', sell: 200, buy: 800,
    parts: [
      [0.96, 0.08, 0.96, WOOD, 0, 0.72, 0],
      [0.1, 0.72, 0.1, DARK, -0.38, 0, -0.38],
      [0.1, 0.72, 0.1, DARK, 0.38, 0, -0.38],
      [0.1, 0.72, 0.1, DARK, -0.38, 0, 0.38],
      [0.1, 0.72, 0.1, DARK, 0.38, 0, 0.38],
    ],
  },
  {
    id: 'silla', name: 'Silla', sell: 100, buy: 400,
    parts: [
      [0.6, 0.08, 0.6, WOOD, 0, 0.42, 0.04],
      [0.6, 0.5, 0.08, WOOD, 0, 0.5, -0.24],
      [0.08, 0.42, 0.08, DARK, -0.24, 0, -0.22],
      [0.08, 0.42, 0.08, DARK, 0.24, 0, -0.22],
      [0.08, 0.42, 0.08, DARK, -0.24, 0, 0.3],
      [0.08, 0.42, 0.08, DARK, 0.24, 0, 0.3],
    ],
  },
  {
    id: 'lampara', name: 'Lámpara', sell: 250, buy: 1000, glow: 0xffd98a,
    parts: [
      [0.4, 0.06, 0.4, 0x50504a, 0, 0, 0],
      [0.08, 0.7, 0.08, 0x50504a, 0, 0.06, 0],
      [0.46, 0.32, 0.46, 0xfff0c4, 0, 0.66, 0],
    ],
  },
  {
    id: 'estanteria', name: 'Estantería', sell: 300, buy: 1200,
    parts: [
      [0.96, 0.98, 0.4, DARK, 0, 0, -0.28],
      [0.86, 0.04, 0.36, WOOD, 0, 0.32, -0.24],
      [0.86, 0.04, 0.36, WOOD, 0, 0.64, -0.24],
      [0.12, 0.24, 0.26, 0xc0392b, -0.3, 0.06, -0.2],
      [0.1, 0.22, 0.26, 0x2e86c1, -0.17, 0.06, -0.2],
      [0.14, 0.25, 0.26, 0x27ae60, 0.2, 0.06, -0.2],
      [0.1, 0.24, 0.26, 0xf1c40f, -0.05, 0.36, -0.2],
      [0.14, 0.22, 0.26, 0x8e44ad, 0.25, 0.36, -0.2],
      [0.12, 0.25, 0.26, 0xe67e22, 0.05, 0.68, -0.2],
    ],
  },
  {
    id: 'sofa', name: 'Sofá', sell: 400, buy: 1600,
    parts: [
      [0.96, 0.4, 0.8, 0xc8553d, 0, 0, 0.06],
      [0.96, 0.4, 0.2, 0xb04632, 0, 0.4, -0.24],
      [0.14, 0.24, 0.8, 0xb04632, -0.41, 0.4, 0.06],
      [0.14, 0.24, 0.8, 0xb04632, 0.41, 0.4, 0.06],
    ],
  },
  {
    id: 'planta', name: 'Planta', sell: 150, buy: 600,
    parts: [
      [0.4, 0.36, 0.4, 0xc0703f, 0, 0, 0],
      [0.34, 0.04, 0.34, 0x5b3f26, 0, 0.36, 0],
      [0.5, 0.3, 0.5, 0x4f9a3a, 0, 0.42, 0],
      [0.3, 0.26, 0.3, 0x67b54a, 0, 0.72, 0],
    ],
  },
  {
    id: 'alfombra', name: 'Alfombra', sell: 150, buy: 500,
    parts: [
      [0.98, 0.04, 0.98, 0x3f7f9f, 0, 0, 0],
      [0.7, 0.045, 0.7, 0xe8d8a8, 0, 0, 0],
      [0.4, 0.05, 0.4, 0xc8553d, 0, 0, 0],
    ],
  },
  // Solo se fabrican en la mesa de trabajo.
  {
    id: 'barril', name: 'Barril', sell: 240,
    parts: [
      [0.7, 0.86, 0.7, 0x9a6a3c, 0, 0, 0],
      [0.74, 0.08, 0.74, 0x5d5d5d, 0, 0.14, 0],
      [0.74, 0.08, 0.74, 0x5d5d5d, 0, 0.64, 0],
      [0.6, 0.02, 0.6, 0x7a5233, 0, 0.86, 0],
    ],
  },
  {
    id: 'farol', name: 'Farol', sell: 450, glow: 0xffc864,
    parts: [
      [0.36, 0.06, 0.36, 0x3a3a3a, 0, 0, 0],
      [0.06, 0.06, 0.06, 0x3a3a3a, 0, 0.42, 0],
      [0.36, 0.06, 0.36, 0x3a3a3a, 0, 0.4, 0],
      [0.28, 0.34, 0.28, 0xffe9a8, 0, 0.06, 0],
    ],
  },
  {
    id: 'banco', name: 'Banco', sell: 180,
    parts: [
      [0.96, 0.08, 0.4, WOOD, 0, 0.4, 0.1],
      [0.96, 0.3, 0.08, WOOD, 0, 0.56, -0.12],
      [0.08, 0.4, 0.36, DARK, -0.4, 0, 0.1],
      [0.08, 0.4, 0.36, DARK, 0.4, 0, 0.1],
    ],
  },
  // De temporada: la tienda solo los vende en su fiesta.
  {
    id: 'calabaza', name: 'Calabaza de Halloween', sell: 300, buy: 1000, glow: 0xffa030, holiday: 'halloween',
    parts: [
      [0.06, 0.12, 0.06, 0x5b7a2e, 0, 0.62, 0],
      [0.7, 0.62, 0.6, 0xe07b24, 0, 0, 0],
      [0.32, 0.22, 0.04, 0x3a2008, 0, 0.22, 0.31], // la cara, que brilla de noche
    ],
  },
  {
    id: 'arbol_navidad', name: 'Árbol de Navidad', sell: 500, buy: 2000, glow: 0xfff0a0, holiday: 'navidad',
    parts: [
      [0.18, 0.2, 0.18, 0x6b4a2b, 0, 0, 0],
      [0.9, 0.3, 0.9, 0x2f7d46, 0, 0.2, 0],
      [0.66, 0.3, 0.66, 0x2f7d46, 0, 0.5, 0],
      [0.42, 0.3, 0.42, 0x2f7d46, 0, 0.8, 0],
      [0.08, 0.08, 0.08, 0xe8505b, 0.3, 0.42, 0.42],
      [0.08, 0.08, 0.08, 0x4f8fe0, -0.25, 0.7, 0.3],
      [0.08, 0.08, 0.08, 0xe8505b, 0.12, 0.98, 0.2],
      [0.16, 0.16, 0.16, 0xffd84a, 0, 1.1, 0],
    ],
  },
];

export const FURNITURE_TILE = (id: string) => FURNITURE_TILE_START + FURNITURE.findIndex((f) => f.id === id);

export function furnitureDef(id: string): FurnitureDef | undefined {
  return FURNITURE.find((f) => f.id === id);
}

const box = new THREE.BoxGeometry(1, 1, 1);
const materials = new Map<number, THREE.MeshLambertMaterial>();
const glowMaterials = new Map<number, THREE.MeshLambertMaterial>();

function material(color: number, glow?: number): THREE.MeshLambertMaterial {
  const cache = glow ? glowMaterials : materials;
  let m = cache.get(color);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color, emissive: glow ?? 0, emissiveIntensity: 0 });
    cache.set(color, m);
  }
  return m;
}

function buildModel(def: FurnitureDef): THREE.Group {
  const g = new THREE.Group();
  def.parts.forEach(([w, h, d, color, x, y, z], i) => {
    // La pantalla de la lámpara (la última pieza) es la que brilla.
    const glows = def.glow !== undefined && i === def.parts.length - 1;
    const mesh = new THREE.Mesh(box, material(color, glows ? def.glow : undefined));
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y + h / 2, z);
    g.add(mesh);
  });
  return g;
}

/** Dibuja el icono de cada mueble en el atlas, en su casilla. Hay que llamarlo antes de crear la textura. */
export function paintFurnitureIcons(atlas: HTMLCanvasElement) {
  const size = TILE * 2;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, preserveDrawingBuffer: true });
  } catch {
    return; // sin WebGL no hay juego de todas formas
  }
  renderer.setSize(size, size, false);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 1.6), new THREE.DirectionalLight(0xffffff, 2.2));
  (scene.children[1] as THREE.DirectionalLight).position.set(1, 2, 1.6);
  const cam = new THREE.OrthographicCamera(-0.78, 0.78, 0.78, -0.78, 0.1, 10);
  cam.position.set(1.6, 1.7, 2.2);
  cam.lookAt(0, 0.4, 0);
  const ctx = atlas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  FURNITURE.forEach((def, i) => {
    const model = buildModel(def);
    scene.add(model);
    renderer.render(scene, cam);
    scene.remove(model);
    const tile = FURNITURE_TILE_START + i;
    const tx = (tile % ATLAS_TILES) * TILE;
    const ty = Math.floor(tile / ATLAS_TILES) * TILE;
    ctx.clearRect(tx, ty, TILE, TILE);
    ctx.drawImage(renderer.domElement, tx, ty, TILE, TILE);
  });
  renderer.dispose();
  renderer.forceContextLoss();
}

export interface PlacedFurniture {
  id: string;
  x: number;
  y: number;
  z: number;
  /** Cuartos de vuelta (0 a 3). */
  rot: number;
}

interface Entry {
  data: PlacedFurniture;
  model: THREE.Group;
}

/** Los muebles colocados en la isla. No son sólidos: se puede pasar por encima, como por las alfombras. */
export class Furniture {
  readonly group = new THREE.Group();
  private entries: Entry[] = [];
  private bounds = new THREE.Box3();

  constructor(saved: PlacedFurniture[]) {
    for (const f of saved) if (furnitureDef(f.id)) this.place(f.id, f.x, f.y, f.z, f.rot);
  }

  place(id: string, x: number, y: number, z: number, rot: number) {
    const def = furnitureDef(id)!;
    const model = buildModel(def);
    model.position.set(x + 0.5, y, z + 0.5);
    model.rotation.y = (rot * Math.PI) / 2;
    this.group.add(model);
    this.entries.push({ data: { id, x, y, z, rot }, model });
  }

  at(x: number, y: number, z: number): PlacedFurniture | undefined {
    return this.entries.find((e) => e.data.x === x && e.data.y === y && e.data.z === z)?.data;
  }

  remove(f: PlacedFurniture) {
    const i = this.entries.findIndex((e) => e.data === f);
    if (i < 0) return;
    this.group.remove(this.entries[i].model);
    this.entries.splice(i, 1);
  }

  rotate(f: PlacedFurniture) {
    const e = this.entries.find((en) => en.data === f);
    if (!e) return;
    f.rot = (f.rot + 1) % 4;
    e.model.rotation.y = (f.rot * Math.PI) / 2;
  }

  /** Mueble que corta el rayo antes de `maxDist`, con su distancia y su caja. */
  pick(ray: THREE.Ray, maxDist: number): { furniture: PlacedFurniture; dist: number; box: THREE.Box3 } | null {
    let best: { furniture: PlacedFurniture; dist: number; box: THREE.Box3 } | null = null;
    const hit = new THREE.Vector3();
    for (const e of this.entries) {
      this.bounds.setFromObject(e.model);
      if (!ray.intersectBox(this.bounds, hit)) continue;
      const d = hit.distanceTo(ray.origin);
      if (d < maxDist && (!best || d < best.dist)) best = { furniture: e.data, dist: d, box: this.bounds.clone() };
    }
    return best;
  }

  /** Las lámparas se encienden al anochecer. */
  setNight(night: number) {
    for (const m of glowMaterials.values()) m.emissiveIntensity = 0.2 + night * 1.2;
  }

  serialize(): PlacedFurniture[] {
    return this.entries.map((e) => ({ ...e.data }));
  }
}
