import * as THREE from 'three';
import type { WaterfallSpot } from './world';

/** Textura de 16x16 con franjas de agua y espuma; se desplaza hacia abajo para que parezca que cae. */
function fallTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const ctx = c.getContext('2d')!;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const streak = (x * 7 + Math.floor(y / 3) * 5) % 9;
      const color = streak === 0 ? '#e8f6ff' : streak < 3 ? '#8fd0f0' : (x + y) % 4 === 0 ? '#5fb4e2' : '#4aa6d8';
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Cascadas donde el río pasa junto a un acantilado alto, con espuma al pie. Solo de adorno: no se guardan ni se pueden romper. */
export class Waterfalls {
  readonly group = new THREE.Group();
  private texture = fallTexture();
  private material = new THREE.MeshLambertMaterial({ map: this.texture, transparent: true, opacity: 0.88, side: THREE.DoubleSide, depthWrite: false });
  private foam: THREE.Points[] = [];
  private foamSeeds: Float32Array[] = [];
  private foamWidth: number[] = [];

  constructor(spots: WaterfallSpot[]) {
    for (const s of spots) {
      // En el río de terrazas la lámina va de agua a agua, y baja un poco más para tapar el escalón.
      const from = s.river ? s.bottom + 0.4 : s.bottom + 1;
      const height = (s.river ? s.top + 0.85 : s.top + 1) - from;
      const width = s.width ?? 2;
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(width, height), this.material);
      // La lámina pegada a la cara del acantilado que da al río, un pelín separada para que no parpadee.
      sheet.position.set(s.x + 0.5 + s.dx * 0.52, from + height / 2, s.z + 0.5 + s.dz * 0.52);
      sheet.rotation.y = Math.atan2(s.dx, s.dz);
      // La textura se repite por bloque.
      const uv = sheet.geometry.getAttribute('uv') as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * width, uv.getY(i) * height);
      sheet.renderOrder = 2;
      this.group.add(sheet);

      // Espuma: puntitos blancos que saltan al pie de la cascada.
      const n = 40;
      const pos = new Float32Array(n * 3);
      const seeds = new Float32Array(n);
      for (let i = 0; i < n; i++) seeds[i] = Math.random();
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xf2fbff, size: 0.14, transparent: true, opacity: 0.9 }));
      pts.position.set(s.x + 0.5 + s.dx * 1.1, s.river ? s.bottom + 0.85 : s.bottom + 1, s.z + 0.5 + s.dz * 1.1);
      pts.rotation.y = Math.atan2(s.dx, s.dz);
      this.group.add(pts);
      this.foam.push(pts);
      this.foamSeeds.push(seeds);
      this.foamWidth.push(width);
    }
  }

  update(seconds: number) {
    this.texture.offset.y = (seconds * 1.6) % 1;
    this.foam.forEach((pts, k) => {
      const seeds = this.foamSeeds[k];
      const pos = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < seeds.length; i++) {
        // Cada gota hace un saltito parabólico y vuelve a empezar.
        const t = (seconds * 1.4 + seeds[i] * 7) % 1;
        const spread = (seeds[i] - 0.5) * this.foamWidth[k];
        pos.setXYZ(i, spread, Math.sin(t * Math.PI) * 0.6 * (0.5 + seeds[i]), t * 0.9);
      }
      pos.needsUpdate = true;
    });
  }
}
