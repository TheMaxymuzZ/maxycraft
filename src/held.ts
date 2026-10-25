import * as THREE from 'three';
import { itemDef } from './items';
import type { ItemModels } from './itemModels';

/**
 * Lo que llevas en la mano, abajo a la derecha, como en Minecraft: el brazo, una herramienta, un objeto o un bloque.
 * Se dibuja en una pasada aparte, encima de todo, para que no se meta dentro de las paredes.
 */
/** Una mano: la derecha lleva lo de la barra rápida y la izquierda lo de la otra mano. */
interface Hand {
  /** 1 derecha, -1 izquierda. */
  side: number;
  pivot: THREE.Group;
  current: THREE.Object3D | null;
  currentId: string | null | undefined;
  cache: Map<string, THREE.Object3D>;
}

export class HeldItem {
  readonly scene = new THREE.Scene();
  private holder = new THREE.Group();
  private main: Hand = { side: 1, pivot: new THREE.Group(), current: null, currentId: undefined, cache: new Map() };
  private off: Hand = { side: -1, pivot: new THREE.Group(), current: null, currentId: undefined, cache: new Map() };
  private arm: THREE.Mesh;
  private ambient = new THREE.AmbientLight(0xffffff, 1.6);
  private sun = new THREE.DirectionalLight(0xffffff, 1.2);
  private swing = 0;
  private bob = 0;

  constructor(private models: ItemModels) {
    this.sun.position.set(0.4, 1, 0.6);
    this.scene.add(this.ambient, this.sun, this.holder);
    for (const hand of [this.main, this.off]) {
      this.holder.add(hand.pivot);
      hand.pivot.scale.setScalar(0.6);
    }
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
   * `id`: objeto en la mano (o null). `offId`: lo de la otra mano. `busy`: se está rompiendo algo (se golpea sin parar).
   * `walking`: velocidad al andar, para que la mano se mueva un poco. `light`: lo iluminado que está el sitio donde estás, de 0 a 1.
   */
  update(dt: number, camera: THREE.Camera, id: string | null, offId: string | null, busy: boolean, walking: number, light: number) {
    if (id !== this.main.currentId) this.setItem(this.main, id);
    if (offId !== this.off.currentId) this.setItem(this.off, offId);
    this.holder.position.copy(camera.position);
    this.holder.quaternion.copy(camera.quaternion);

    if (busy && this.swing <= 0) this.swing = 1;
    this.swing = Math.max(0, this.swing - dt * 4);
    this.bob += dt * walking * 1.6;
    const s = Math.sin((1 - this.swing) * Math.PI);
    const bobX = Math.sin(this.bob) * 0.025 * Math.min(1, walking / 4);
    const bobY = Math.abs(Math.cos(this.bob)) * 0.03 * Math.min(1, walking / 4);
    this.main.pivot.position.set(0.48 + bobX, -0.38 + bobY - s * 0.06, -0.8 - s * 0.12);
    this.main.pivot.rotation.set(-s * 0.9, 0, 0);
    // La otra mano no golpea: solo se mece al andar, al revés que la derecha.
    this.off.pivot.position.set(-0.48 - bobX, -0.38 + bobY, -0.8);

    // En una cueva sin antorcha la mano también se ve a oscuras (v3.1).
    this.ambient.intensity = 0.1 + light * 1.5;
    this.sun.intensity = light * 1.2;
  }

  private setItem(hand: Hand, id: string | null) {
    hand.currentId = id;
    if (hand.current) hand.pivot.remove(hand.current);
    hand.current = null;
    if (!id) {
      // Con la otra mano vacía no se ve nada, como en Minecraft.
      if (hand.side < 0) return;
      hand.current = this.arm;
      this.arm.rotation.set(0.25, 0, 0);
      this.arm.position.set(0, -0.05, 0.1);
    } else {
      let obj = hand.cache.get(id);
      if (!obj) {
        obj = this.build(id);
        // En la mano izquierda, los objetos miran hacia el otro lado.
        if (hand.side < 0) obj.rotation.y = -obj.rotation.y;
        hand.cache.set(id, obj);
      }
      hand.current = obj;
    }
    hand.pivot.add(hand.current);
  }

  private build(id: string): THREE.Object3D {
    const mesh = this.models.mesh(id);
    // Los bloques normales se ven como un cubo pequeño con sus texturas.
    if (this.models.isCube(id)) {
      mesh.scale.setScalar(0.4);
      mesh.rotation.set(0.1, Math.PI / 4, 0);
      return mesh;
    }
    // Lo demás (herramientas, fruta, flores, peces…) es su icono con grosor, píxel a píxel.
    mesh.rotation.set(0, -Math.PI / 2.4, Math.PI / 8);
    mesh.scale.setScalar(itemDef(id).tool ? 0.75 : 0.5);
    return mesh;
  }
}
