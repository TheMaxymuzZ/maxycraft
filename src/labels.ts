import * as THREE from 'three';
import type { Villager } from './villagers';

/** Nombre encima de cada vecino cercano. */
export class NameTags {
  private tags: HTMLDivElement[];
  private projected = new THREE.Vector3();

  constructor(private villagers: Villager[], container: HTMLElement) {
    this.tags = villagers.map((v) => {
      const el = document.createElement('div');
      el.className = 'name-tag';
      el.textContent = v.name;
      container.appendChild(el);
      return el;
    });
  }

  update(camera: THREE.Camera, from: THREE.Vector3) {
    const p = this.projected;
    this.villagers.forEach((v, i) => {
      const el = this.tags[i];
      const dist = v.position.distanceTo(from);
      p.copy(v.position).setY(v.position.y + 1.85).project(camera);
      const show = v.group.visible && dist < 8 && p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1;
      el.hidden = !show;
      if (!show) return;
      el.style.transform = `translate(${((p.x + 1) / 2) * window.innerWidth}px, ${((1 - p.y) / 2) * window.innerHeight}px) translate(-50%, -100%)`;
    });
  }
}
