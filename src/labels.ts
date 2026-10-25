import * as THREE from 'three';

/** Algo con nombre que se ve en el mundo: un vecino u otro jugador. */
export interface Tagged {
  readonly name: string;
  readonly position: THREE.Vector3;
  readonly group: THREE.Object3D;
}

/** Nombre encima de cada vecino o jugador cercano. */
export class NameTags {
  private tags = new Map<Tagged, HTMLDivElement>();
  private projected = new THREE.Vector3();

  constructor(items: Tagged[], private container: HTMLElement, private range = 8) {
    for (const t of items) this.add(t);
  }

  add(t: Tagged, className = 'name-tag') {
    const el = document.createElement('div');
    el.className = className;
    el.textContent = t.name;
    el.hidden = true;
    this.container.appendChild(el);
    this.tags.set(t, el);
  }

  remove(t: Tagged) {
    this.tags.get(t)?.remove();
    this.tags.delete(t);
  }

  update(camera: THREE.Camera, from: THREE.Vector3) {
    const p = this.projected;
    for (const [t, el] of this.tags) {
      const dist = t.position.distanceTo(from);
      p.copy(t.position).setY(t.position.y + 1.85).project(camera);
      const show = t.group.visible && dist < this.range && p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1;
      el.hidden = !show;
      if (!show) continue;
      el.style.transform = `translate(${((p.x + 1) / 2) * window.innerWidth}px, ${((1 - p.y) / 2) * window.innerHeight}px) translate(-50%, -100%)`;
    }
  }
}
