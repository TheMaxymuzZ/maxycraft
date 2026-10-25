import * as THREE from 'three';
import type { NameTags } from './labels';
import type { PeerInfo, Pose } from './net/protocol';

const SKIN = 0xf2c9a0;
const TROUSERS = 0x3b4a6b;
/** Lo que tarda un jugador de otro ordenador en llegar a la posición recibida: suaviza los saltos de la red. */
const SMOOTH = 0.12;

/** Otro jugador de la partida, con cuerpo de bloques y el color de ropa que eligió. */
export class RemotePlayer {
  readonly group = new THREE.Group();
  readonly position = new THREE.Vector3();
  private target = new THREE.Vector3();
  private head = new THREE.Group();
  private legs: THREE.Mesh[] = [];
  private arms: THREE.Mesh[] = [];
  private yaw = 0;
  private targetYaw = 0;
  private pitch = 0;
  private walkPhase = 0;
  private placed = false;

  constructor(readonly info: PeerInfo) {
    const box = (w: number, h: number, d: number, color: number) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
    const body = box(0.5, 0.7, 0.28, info.color);
    body.position.y = 1.1;
    const face = box(0.5, 0.5, 0.5, SKIN);
    const hair = box(0.52, 0.16, 0.52, 0x4a3020);
    hair.position.y = 0.2;
    const eyeL = box(0.08, 0.08, 0.02, 0x23301f);
    const eyeR = eyeL.clone();
    eyeL.position.set(-0.11, 0.02, 0.26);
    eyeR.position.set(0.11, 0.02, 0.26);
    this.head.add(face, hair, eyeL, eyeR);
    this.head.position.y = 1.7;
    for (const side of [-1, 1]) {
      const leg = box(0.23, 0.75, 0.26, TROUSERS);
      leg.geometry.translate(0, -0.375, 0);
      leg.position.set(side * 0.13, 0.75, 0);
      const arm = box(0.2, 0.7, 0.22, info.color);
      arm.geometry.translate(0, -0.3, 0);
      arm.position.set(side * 0.36, 1.42, 0);
      this.legs.push(leg);
      this.arms.push(arm);
      this.group.add(leg, arm);
    }
    this.group.add(body, this.head);
  }

  get name() {
    return this.info.name;
  }

  /** Nueva posición recibida por la red (la de los pies). */
  setPose(p: Pose) {
    this.target.set(p.x, p.y, p.z);
    this.targetYaw = p.yaw;
    this.pitch = p.pitch;
    if (!this.placed) {
      this.placed = true;
      this.position.copy(this.target);
      this.yaw = p.yaw;
    }
  }

  update(dt: number) {
    const k = 1 - Math.exp(-dt / SMOOTH);
    const before = this.position.clone();
    this.position.lerp(this.target, k);
    // El giro va por el camino más corto.
    let d = this.targetYaw - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * k;
    const speed = dt > 0 ? Math.hypot(this.position.x - before.x, this.position.z - before.z) / dt : 0;
    this.walkPhase += dt * Math.min(speed, 6) * 2.2;
    const swing = Math.sin(this.walkPhase) * Math.min(speed / 4, 1) * 0.7;
    this.legs[0].rotation.x = swing;
    this.legs[1].rotation.x = -swing;
    this.arms[0].rotation.x = -swing;
    this.arms[1].rotation.x = swing;
    this.head.rotation.x = -this.pitch * 0.6;
    this.group.position.copy(this.position);
    // La cámara mira hacia -z cuando yaw es 0; el modelo mira hacia +z.
    this.group.rotation.y = this.yaw + Math.PI;
    this.group.visible = this.placed;
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

/** Todos los jugadores de otros ordenadores. */
export class RemotePlayers {
  readonly group = new THREE.Group();
  readonly players = new Map<string, RemotePlayer>();

  constructor(private tags: NameTags) {}

  add(info: PeerInfo) {
    if (this.players.has(info.id)) return;
    const p = new RemotePlayer(info);
    this.players.set(info.id, p);
    this.group.add(p.group);
    this.tags.add(p, 'name-tag player-tag');
  }

  remove(id: string) {
    const p = this.players.get(id);
    if (!p) return;
    this.players.delete(id);
    this.group.remove(p.group);
    this.tags.remove(p);
    p.dispose();
  }

  setPose(id: string, pose: Pose) {
    this.players.get(id)?.setPose(pose);
  }

  update(dt: number) {
    for (const p of this.players.values()) p.update(dt);
  }
}
