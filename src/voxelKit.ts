// Piezas para dibujar los vehículos (v5.3): cajas de colores como los muebles, más palos inclinados (jarcias,
// puntales) y triángulos de tela (velas). Cada color se guarda una sola vez.
import * as THREE from 'three';

const box = new THREE.BoxGeometry(1, 1, 1);
const up = new THREE.Vector3(0, 1, 0);

export type V3 = [number, number, number];

export class VoxelKit {
  private mats = new Map<string, THREE.Material>();

  constructor(private root: THREE.Object3D) {}

  private mat(color: number, kind: 'lambert' | 'glow' | 'cloth' = 'lambert'): THREE.Material {
    const key = `${kind}:${color}`;
    let m = this.mats.get(key);
    if (!m) {
      m = kind === 'glow' ? new THREE.MeshBasicMaterial({ color })
        : new THREE.MeshLambertMaterial({ color, side: kind === 'cloth' ? THREE.DoubleSide : THREE.FrontSide });
      this.mats.set(key, m);
    }
    return m;
  }

  /** Una caja de sx × sy × sz con el centro en (x, y, z). */
  box(color: number, sx: number, sy: number, sz: number, x: number, y: number, z: number, parent: THREE.Object3D = this.root): THREE.Mesh {
    const mesh = new THREE.Mesh(box, this.mat(color));
    mesh.scale.set(sx, sy, sz);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  /** Una caja que brilla sola (luces de posición, el farol). */
  glow(color: number, sx: number, sy: number, sz: number, x: number, y: number, z: number, parent: THREE.Object3D = this.root): THREE.Mesh {
    const mesh = new THREE.Mesh(box, this.mat(color, 'glow'));
    mesh.scale.set(sx, sy, sz);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  /** Un palo cuadrado de grosor `t` de `a` a `b` (cuerdas, puntales, botalones). */
  rod(color: number, t: number, a: V3, b: V3, parent: THREE.Object3D = this.root): THREE.Mesh {
    const from = new THREE.Vector3(...a);
    const dir = new THREE.Vector3(...b).sub(from);
    const mesh = new THREE.Mesh(box, this.mat(color));
    mesh.scale.set(t, dir.length(), t);
    mesh.quaternion.setFromUnitVectors(up, dir.clone().normalize());
    mesh.position.copy(from).addScaledVector(dir, 0.5);
    parent.add(mesh);
    return mesh;
  }

  /** Un triángulo de tela por las dos caras (una vela). */
  tri(color: number, a: V3, b: V3, c: V3, parent: THREE.Object3D = this.root): THREE.Mesh {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c], 3));
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, this.mat(color, 'cloth'));
    parent.add(mesh);
    return mesh;
  }
}

/**
 * Ancho de un casco a lo largo: 1 en la popa y el centro y estrechándose hacia la proa.
 * `t` va de 0 (popa) a 1 (proa).
 */
export function hullWidth(t: number): number {
  if (t < 0.5) return 1 - (0.5 - t) * 0.25;
  const k = (t - 0.5) / 0.5;
  return Math.max(0.12, 1 - k ** 1.7 * 0.88);
}
