// El muñeco del jugador (v4.18): cuerpo de bloques con huecos para la ropa. Lo usan los amigos de la partida
// (remotePlayers.ts) y el espejo del armario. Mira hacia +z.
import * as THREE from 'three';
import { type Bone, type Outfit, SLOTS, clothOf, partColor } from './clothes';

export const SKIN = 0xf2c9a0;
export const TROUSERS = 0x3b4a6b;
const HAIR = 0x4a3020;

const box = (w: number, h: number, d: number, color: number) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));

export class PlayerModel {
  readonly group = new THREE.Group();
  readonly head = new THREE.Group();
  readonly legs: THREE.Mesh[] = [];
  readonly arms: THREE.Mesh[] = [];
  private body: THREE.Mesh;
  private hair: THREE.Mesh;
  /** Las cajas de la ropa puesta, para quitarlas al cambiarse. */
  private worn: THREE.Mesh[] = [];

  constructor(private color: number, outfit: Outfit = {}) {
    // Cabeza: origen en su centro (y = 1.7). Cuerpo: origen en su centro (y = 1.1).
    // Piernas: origen en la cadera (y = 0.75), hacia abajo. Brazos: origen en el hombro (y = 1.42), hacia abajo.
    this.body = box(0.5, 0.7, 0.28, color);
    this.body.position.y = 1.1;
    const face = box(0.5, 0.5, 0.5, SKIN);
    this.hair = box(0.52, 0.16, 0.52, HAIR);
    this.hair.position.y = 0.2;
    const eyeL = box(0.08, 0.08, 0.02, 0x23301f);
    const eyeR = eyeL.clone();
    eyeL.position.set(-0.11, 0.02, 0.26);
    eyeR.position.set(0.11, 0.02, 0.26);
    this.head.add(face, this.hair, eyeL, eyeR);
    this.head.position.y = 1.7;
    for (const side of [-1, 1]) {
      const leg = box(0.23, 0.75, 0.26, TROUSERS);
      leg.geometry.translate(0, -0.375, 0);
      leg.position.set(side * 0.13, 0.75, 0);
      const arm = box(0.2, 0.7, 0.22, color);
      arm.geometry.translate(0, -0.3, 0);
      arm.position.set(side * 0.36, 1.42, 0);
      this.legs.push(leg);
      this.arms.push(arm);
      this.group.add(leg, arm);
    }
    this.group.add(this.body, this.head);
    this.dress(outfit);
  }

  private bone(b: Bone): THREE.Object3D {
    return b === 'head' ? this.head : b === 'body' ? this.body : b === 'legL' ? this.legs[0] : b === 'legR' ? this.legs[1] : b === 'armL' ? this.arms[0] : this.arms[1];
  }

  /** Se pone ese conjunto (lo que no lleva, sin ropa: camiseta de su color y pantalón azul). */
  dress(outfit: Outfit) {
    for (const m of this.worn) {
      m.parent?.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    this.worn = [];
    const paint = (m: THREE.Mesh, c: number) => (m.material as THREE.MeshLambertMaterial).color.setHex(c);
    paint(this.body, this.color);
    for (const a of this.arms) paint(a, this.color);
    for (const l of this.legs) paint(l, TROUSERS);
    // Con algo en la cabeza no se ve el pelo de arriba.
    this.hair.visible = !outfit.cabeza;
    for (const slot of SLOTS) {
      const cloth = clothOf(outfit[slot]);
      if (!cloth) continue;
      const { tint, parts } = cloth.garment;
      if (tint?.body) paint(this.body, cloth.color.c);
      if (tint?.arms) for (const a of this.arms) paint(a, tint.arms === 'c' ? cloth.color.c : SKIN);
      if (tint?.legs) for (const l of this.legs) paint(l, tint.legs === 'c' ? cloth.color.c : SKIN);
      for (const [bone, [w, h, d, x, y, z], c] of parts) {
        const m = box(w, h, d, partColor(cloth, c));
        m.position.set(x, y, z);
        this.bone(bone).add(m);
        this.worn.push(m);
      }
    }
  }

  /** Cuántas cajas de ropa lleva (para las pruebas). */
  get wornParts(): number {
    return this.worn.length;
  }

  dispose() {
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
  }
}
