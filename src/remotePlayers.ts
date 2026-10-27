import * as THREE from 'three';
import type { NameTags } from './labels';
import type { Outfit } from './clothes';
import type { PeerInfo, Pose } from './net/protocol';
import { PlayerModel } from './playerModel';

/** Lo que tarda un jugador de otro ordenador en llegar a la posición recibida: suaviza los saltos de la red. */
const SMOOTH = 0.12;

/** Otro jugador de la partida, con cuerpo de bloques y el color de ropa que eligió. */
export class RemotePlayer {
  readonly group = new THREE.Group();
  readonly position = new THREE.Vector3();
  private target = new THREE.Vector3();
  private head: THREE.Group;
  private legs: THREE.Mesh[];
  private arms: THREE.Mesh[];
  private yaw = 0;
  private targetYaw = 0;
  private pitch = 0;
  private walkPhase = 0;
  private placed = false;
  /** Gesto que está haciendo (un dibujito encima de la cabeza) y cuánto le queda. */
  private bubble: THREE.Sprite | null = null;
  private bubbleTime = 0;

  private model: PlayerModel;

  constructor(readonly info: PeerInfo) {
    this.model = new PlayerModel(info.color, info.outfit);
    this.head = this.model.head;
    this.legs = this.model.legs;
    this.arms = this.model.arms;
    this.group.add(this.model.group);
  }

  /** Se ha cambiado de ropa (v4.18). */
  dress(outfit: Outfit) {
    this.info.outfit = outfit;
    this.model.dress(outfit);
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

  /** Enseña un gesto encima de la cabeza unos segundos, saludando con la mano. */
  showGesture(emoji: string) {
    this.clearBubble();
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 32, 36);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
    sprite.scale.set(0.7, 0.7, 0.7);
    sprite.position.y = 2.55;
    this.group.add(sprite);
    this.bubble = sprite;
    this.bubbleTime = 3;
  }

  private clearBubble() {
    if (!this.bubble) return;
    this.group.remove(this.bubble);
    this.bubble.material.map?.dispose();
    this.bubble.material.dispose();
    this.bubble = null;
  }

  /** Caja para apuntarle (y darle cosas). */
  bounds(out: THREE.Box3): THREE.Box3 {
    const p = this.position;
    return out.set(new THREE.Vector3(p.x - 0.4, p.y, p.z - 0.4), new THREE.Vector3(p.x + 0.4, p.y + 1.9, p.z + 0.4));
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
    if (this.bubbleTime > 0) {
      this.bubbleTime -= dt;
      // Mientras hace un gesto, levanta el brazo y lo mueve.
      this.arms[1].rotation.x = Math.PI * 0.85;
      this.arms[1].rotation.z = Math.sin(this.bubbleTime * 12) * 0.35;
      if (this.bubbleTime <= 0) {
        this.arms[1].rotation.z = 0;
        this.clearBubble();
      }
    }
    this.head.rotation.x = -this.pitch * 0.6;
    this.group.position.copy(this.position);
    // La cámara mira hacia -z cuando yaw es 0; el modelo mira hacia +z.
    this.group.rotation.y = this.yaw + Math.PI;
    this.group.visible = this.placed;
  }

  dispose() {
    this.clearBubble();
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
    // A los amigos se les ve el nombre desde lejos, para encontrarlos por la isla.
    this.tags.add(p, 'name-tag player-tag', 48);
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

  dress(id: string, outfit: Outfit) {
    this.players.get(id)?.dress(outfit);
  }

  gesture(id: string, emoji: string) {
    this.players.get(id)?.showGesture(emoji);
  }

  /** Jugador al que apunta el rayo antes de `maxDist`. */
  pick(ray: THREE.Ray, maxDist: number): string | null {
    const box = new THREE.Box3();
    const hit = new THREE.Vector3();
    let best: { id: string; d: number } | null = null;
    for (const [id, p] of this.players) {
      if (!p.group.visible || !ray.intersectBox(p.bounds(box), hit)) continue;
      const d = hit.distanceTo(ray.origin);
      if (d < maxDist && (!best || d < best.d)) best = { id, d };
    }
    return best?.id ?? null;
  }

  update(dt: number) {
    for (const p of this.players.values()) p.update(dt);
  }
}
