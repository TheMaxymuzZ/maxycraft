import * as THREE from 'three';
import { SEA_LEVEL } from './world';

type Kind = 'pajaro' | 'gaviota';
type State = 'fly' | 'land' | 'ground';

/** Lo que los pájaros necesitan saber del mundo. */
export interface BirdWorld {
  /** Altura del bloque sólido más alto de la columna (donde se posaría un pájaro), o -1 si no hay. */
  topAt(x: number, z: number): number;
  /** Si la columna es mar (las gaviotas vuelan sobre él y se posan en la playa). */
  seaAt(x: number, z: number): boolean;
  /** Si en la columna hay agua arriba del todo (no se posan en el agua). */
  waterAt(x: number, z: number): boolean;
}

interface Bird {
  kind: Kind;
  mesh: THREE.Group;
  wings: THREE.Object3D[];
  head: THREE.Object3D;
  flock: number;
  state: State;
  velocity: THREE.Vector3;
  /** Desplazamiento propio respecto al centro de la bandada mientras vuela. */
  offset: THREE.Vector3;
  phase: number;
  /** Sitio donde se va a posar (o donde está posado). */
  spot: THREE.Vector3;
  /** Segundos que le quedan volando antes de buscar dónde posarse, o posado antes de volver a volar. */
  timer: number;
  /** Segundos hasta el próximo saltito o picoteo en el suelo. */
  peck: number;
  /** Se acaba de espantar: vuela más rápido y no se posa en un rato. */
  scared: number;
}

interface Flock {
  kind: Kind;
  target: THREE.Vector3;
  center: THREE.Vector3;
  timer: number;
}

/** Altura sobre lo más alto del terreno a la que vuelan. */
const CRUISE = 16;
/** Nunca se acercan más que esto a un bloque mientras vuelan (salvo al posarse). */
const CLEARANCE = 5;
/** Distancia a la que un ser vivo espanta a un pájaro posado. */
const SCARE = 4.5;
const FLY_SPEED = 7;

/**
 * Pájaros y gaviotas (v4.0). Vuelan alto en bandada, subiendo por encima de árboles, casas y montañas en vez de
 * atravesarlos. De vez en cuando bajan a posarse en el suelo a picotear, y si se acerca alguien (tú, un amigo,
 * un vecino o un animal) se espantan y vuelven a volar. Solo de día y solo de adorno: cada jugador ve los suyos.
 */
export class Birds {
  readonly group = new THREE.Group();
  private birds: Bird[] = [];
  private flocks: Flock[] = [];
  private tmp = new THREE.Vector3();
  private ahead = new THREE.Vector3();

  constructor(private random: () => number = Math.random) {
    const box = new THREE.BoxGeometry(1, 1, 1);
    const mat = (color: number) => new THREE.MeshLambertMaterial({ color });
    const looks = {
      pajaro: { body: mat(0x7a5a3a), wing: mat(0x5e4630), beak: mat(0xe8b040), size: 0.7 },
      gaviota: { body: mat(0xf4f4f0), wing: mat(0xb8bec8), beak: mat(0xf0a020), size: 1 },
    };
    const kinds: Kind[] = ['pajaro', 'pajaro', 'gaviota'];
    kinds.forEach((kind, f) => {
      this.flocks.push({ kind, target: new THREE.Vector3(), center: new THREE.Vector3(), timer: 0 });
      const look = looks[kind];
      for (let i = 0; i < 4; i++) {
        const bird = new THREE.Group();
        const body = new THREE.Mesh(box, look.body);
        body.scale.set(0.22, 0.18, 0.5);
        const head = new THREE.Group();
        const skull = new THREE.Mesh(box, look.body);
        skull.scale.set(0.18, 0.16, 0.18);
        const beak = new THREE.Mesh(box, look.beak);
        beak.scale.set(0.08, 0.06, 0.12);
        beak.position.set(0, -0.01, -0.14);
        head.add(skull, beak);
        head.position.set(0, 0.1, -0.26);
        const wings = [-1, 1].map((side) => {
          // Cada ala gira desde el hombro: se mueve la caja hacia fuera dentro de un grupo pivote.
          const w = new THREE.Mesh(box, look.wing);
          w.scale.set(0.42, 0.04, 0.24);
          w.position.x = side * 0.21;
          const pivot = new THREE.Group();
          pivot.add(w);
          pivot.position.x = side * 0.1;
          bird.add(pivot);
          return pivot;
        });
        bird.add(body, head);
        bird.scale.setScalar(look.size);
        this.group.add(bird);
        this.birds.push({
          kind, mesh: bird, wings, head, flock: f, state: 'fly',
          velocity: new THREE.Vector3(),
          offset: new THREE.Vector3((random() - 0.5) * 8, (random() - 0.5) * 3, (random() - 0.5) * 8),
          phase: random() * Math.PI * 2,
          spot: new THREE.Vector3(),
          timer: 10 + random() * 30,
          peck: 1,
          scared: 0,
        });
      }
    });
  }

  /** Cuántos pájaros están posados ahora mismo (para las pruebas). */
  get landed(): number {
    return this.birds.filter((b) => b.state === 'ground').length;
  }

  /**
   * `night` de 0 a 1: de noche (o con lluvia) se van a dormir.
   * `beings`: dónde están el jugador, los amigos, los vecinos y los animales, para espantarse si se acercan.
   */
  update(dt: number, seconds: number, player: THREE.Vector3, night: number, world: BirdWorld, beings: THREE.Vector3[] = []) {
    this.group.visible = night < 0.6;
    if (!this.group.visible) {
      // Al volver a salir, aparecen volando: nadie los ha visto irse a dormir.
      for (const b of this.birds) b.state = 'fly';
      for (const f of this.flocks) f.center.set(0, 0, 0);
      return;
    }
    if (dt <= 0) return;
    for (const f of this.flocks) this.updateFlock(f, dt, player, world);
    for (const b of this.birds) {
      if (b.state === 'ground') this.updateGround(b, dt, seconds, world, beings);
      else this.updateFlying(b, dt, seconds, player, world, beings);
    }
  }

  /** Cada rato la bandada elige otro sitio, alto y cerca del jugador, hacia el que ir. */
  private updateFlock(f: Flock, dt: number, player: THREE.Vector3, world: BirdWorld) {
    f.timer -= dt;
    const fresh = f.center.lengthSq() === 0;
    if (f.timer <= 0 || fresh) {
      f.timer = 10 + this.random() * 8;
      for (let tries = 0; tries < 20; tries++) {
        const a = this.random() * Math.PI * 2;
        const d = 12 + this.random() * 30;
        const x = player.x + Math.cos(a) * d;
        const z = player.z + Math.sin(a) * d;
        // Las gaviotas van por el mar y los pájaros por la isla (si no encuentran, se conforman).
        if ((f.kind === 'gaviota') !== world.seaAt(Math.floor(x), Math.floor(z)) && tries < 19) continue;
        f.target.set(x, this.cruiseAt(x, z, world), z);
        break;
      }
      if (fresh) f.center.copy(f.target);
    }
    // El centro de la bandada va hacia su sitio sin pasar nunca por dentro de una montaña.
    this.tmp.subVectors(f.target, f.center);
    const dist = this.tmp.length();
    if (dist > 0.1) f.center.addScaledVector(this.tmp, Math.min(1, (FLY_SPEED * 0.8 * dt) / dist));
    f.center.y = Math.max(f.center.y, this.cruiseAt(f.center.x, f.center.z, world));
  }

  /** Altura de vuelo en (x, z): por encima de lo más alto que haya alrededor. */
  private cruiseAt(x: number, z: number, world: BirdWorld): number {
    let top = SEA_LEVEL;
    for (let dz = -6; dz <= 6; dz += 3) for (let dx = -6; dx <= 6; dx += 3) top = Math.max(top, world.topAt(Math.floor(x + dx), Math.floor(z + dz)));
    return top + CRUISE;
  }

  private updateFlying(b: Bird, dt: number, seconds: number, player: THREE.Vector3, world: BirdWorld, beings: THREE.Vector3[]) {
    const p = b.mesh.position;
    const f = this.flocks[b.flock];
    if (p.lengthSq() === 0) p.copy(f.center).add(b.offset);
    b.scared = Math.max(0, b.scared - dt);

    // De vez en cuando le apetece bajar a posarse.
    if (b.state === 'fly') {
      b.timer -= dt;
      if (b.timer <= 0 && !b.scared) {
        if (this.pickSpot(b, player, world, beings)) b.state = 'land';
        else b.timer = 5;
      }
    }
    // Si alguien se ha puesto donde iba a posarse, se lo piensa mejor.
    if (b.state === 'land' && beings.some((o) => o.distanceTo(b.spot) < SCARE)) {
      b.state = 'fly';
      b.timer = 8 + this.random() * 10;
    }

    let goal: THREE.Vector3;
    if (b.state === 'land') {
      goal = this.tmp.copy(b.spot);
      // Llega desde arriba: hasta estar cerca no baja de la altura de vuelo.
      const flat = Math.hypot(b.spot.x - p.x, b.spot.z - p.z);
      if (flat > 6) goal.y = Math.max(b.spot.y + 6, Math.min(p.y, this.cruiseAt(p.x, p.z, world)));
      if (flat < 0.4 && Math.abs(p.y - b.spot.y) < 0.4) {
        b.state = 'ground';
        b.velocity.set(0, 0, 0);
        p.copy(b.spot);
        b.timer = 8 + this.random() * 20;
        b.peck = 0.5;
        return;
      }
    } else {
      // Vuelo en grupo: cada uno con su sitio en la bandada, dando vueltas despacio.
      const swirl = seconds * 0.4 + b.phase;
      goal = this.tmp.copy(f.center).add(b.offset);
      goal.x += Math.cos(swirl) * 4;
      goal.z += Math.sin(swirl) * 4;
    }

    // Hacia el objetivo, sin pasar de su velocidad.
    const speed = FLY_SPEED * (b.scared ? 1.6 : 1) * (b.state === 'land' ? 0.8 : 1);
    const want = goal.sub(p);
    const dist = want.length();
    if (dist > 0.001) want.multiplyScalar(Math.min(speed, dist * 1.5) / dist);
    b.velocity.lerp(want, Math.min(1, dt * 2.5));

    // Esquivar: mira un poco por delante y, si hay algo, sube (cuando se está posando solo mira justo debajo).
    const landing = b.state === 'land' && Math.hypot(b.spot.x - p.x, b.spot.z - p.z) < 3;
    if (!landing) {
      this.ahead.copy(b.velocity).setY(0);
      const len = this.ahead.length();
      if (len > 0.01) this.ahead.multiplyScalar(4 / len);
      let floor = -Infinity;
      for (const k of [0, 0.5, 1, 1.5]) floor = Math.max(floor, world.topAt(Math.floor(p.x + this.ahead.x * k), Math.floor(p.z + this.ahead.z * k)));
      const min = floor + (b.state === 'land' ? 2 : CLEARANCE);
      if (p.y < min + 1) b.velocity.y = Math.max(b.velocity.y, Math.min(6, (min + 1 - p.y) * 3));
    }
    p.addScaledVector(b.velocity, dt);
    // Nunca dentro de un bloque.
    const top = world.topAt(Math.floor(p.x), Math.floor(p.z));
    if (p.y < top + 1.1 && !(landing && Math.abs(top + 1 - b.spot.y) < 0.01)) p.y = top + 1.1;

    // Mirando hacia donde vuela, aleteando (más deprisa al subir o con prisa).
    if (Math.hypot(b.velocity.x, b.velocity.z) > 0.2) b.mesh.rotation.y = Math.atan2(-b.velocity.x, -b.velocity.z);
    b.mesh.rotation.x = Math.max(-0.5, Math.min(0.5, b.velocity.y * 0.08));
    b.head.rotation.x = 0;
    const climbing = b.velocity.y > 1 || b.scared > 0;
    const glide = !climbing && b.state === 'fly' && Math.sin(seconds * 0.7 + b.phase) > 0.3;
    const flap = glide ? 0.15 : Math.sin(seconds * (climbing ? 18 : 10) + b.phase * 3) * 0.7;
    b.wings[0].rotation.z = -flap;
    b.wings[1].rotation.z = flap;
  }

  private updateGround(b: Bird, dt: number, seconds: number, world: BirdWorld, beings: THREE.Vector3[]) {
    const p = b.mesh.position;
    // Si se acerca alguien, sale volando hacia arriba y lejos de él.
    const near = beings.find((o) => o.distanceTo(p) < SCARE);
    b.timer -= dt;
    if (near || b.timer <= 0 || world.topAt(Math.floor(p.x), Math.floor(p.z)) + 1 > p.y + 0.1) {
      b.state = 'fly';
      b.timer = 20 + this.random() * 30;
      if (near) {
        b.scared = 3;
        this.tmp.subVectors(p, near).setY(0).normalize();
        b.velocity.set(this.tmp.x * 5, 7, this.tmp.z * 5);
      } else b.velocity.set(0, 4, 0);
      return;
    }
    // Alas plegadas, y de vez en cuando un saltito o un picoteo.
    b.wings[0].rotation.z = 0.15;
    b.wings[1].rotation.z = -0.15;
    b.mesh.rotation.x = 0;
    b.peck -= dt;
    if (b.peck <= 0) {
      b.peck = 0.6 + this.random() * 2;
      if (this.random() < 0.35) {
        // Saltito hacia un lado, si allí también se puede estar.
        const a = this.random() * Math.PI * 2;
        const nx = p.x + Math.cos(a) * 0.5;
        const nz = p.z + Math.sin(a) * 0.5;
        const top = world.topAt(Math.floor(nx), Math.floor(nz));
        if (Math.abs(top + 1 - p.y) < 0.01 && !world.waterAt(Math.floor(nx), Math.floor(nz))) {
          p.x = nx;
          p.z = nz;
          b.mesh.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
        }
      }
    }
    const pecking = b.peck < 0.25;
    b.head.rotation.x = pecking ? 0.9 : 0;
    // El saltito se nota un poco en la altura.
    b.mesh.position.y = b.spot.y + (b.peck > 0.5 ? 0 : Math.max(0, Math.sin(seconds * 20)) * 0.04);
  }

  /** Busca dónde posarse: en tierra al aire libre (las gaviotas en la playa), lejos de la gente. */
  private pickSpot(b: Bird, player: THREE.Vector3, world: BirdWorld, beings: THREE.Vector3[]): boolean {
    const p = b.mesh.position;
    for (let tries = 0; tries < 12; tries++) {
      const a = this.random() * Math.PI * 2;
      const d = 6 + this.random() * 18;
      // Cerca de donde vuela, pero sin alejarse mucho del jugador (si no, nadie los vería posarse).
      const x = Math.floor((p.x + player.x) / 2 + Math.cos(a) * d);
      const z = Math.floor((p.z + player.z) / 2 + Math.sin(a) * d);
      const top = world.topAt(x, z);
      if (top < SEA_LEVEL || world.waterAt(x, z)) continue;
      if (b.kind === 'gaviota' && top > SEA_LEVEL + 2) continue;
      const spot = new THREE.Vector3(x + 0.5, top + 1, z + 0.5);
      if (beings.some((o) => o.distanceTo(spot) < SCARE * 2)) continue;
      b.spot.copy(spot);
      return true;
    }
    return false;
  }
}
