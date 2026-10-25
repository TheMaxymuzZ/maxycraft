// Vida y hambre (v4.1), como en Minecraft pero sin ser duro: el hambre baja despacio, con la tripa llena
// te curas sola o solo, y si te desmayas apareces en casa perdiendo solo unas pocas cosas y algo de dinero.

/** Puntos de vida y de hambre: 10 corazones y 10 muslitos, de medio en medio. */
export const MAX_HEALTH = 20;
export const MAX_HUNGER = 20;
/** Segundos que se aguanta la respiración bajo el agua. */
export const MAX_AIR = 12;

/** Cuánto llena cada comida (en medios muslitos). La comida cocinada llena mucho más. */
export const FOOD: Record<string, number> = {
  manzana: 4, naranja: 4, pera: 4, melocoton: 4, cereza: 3, coco: 6,
  zanahoria: 3, tomate: 3, leche: 4,
  pan: 7, tortilla: 9, sopa: 10, pastel: 14,
};

export function isFood(id: string | undefined | null): boolean {
  return !!id && id in FOOD;
}

/** Hambre que gasta cada cosa, en "esfuerzo": 4 de esfuerzo es medio muslito. */
const EFFORT = {
  /** Por segundo, sin hacer nada. */
  idle: 4 / 120,
  /** Por segundo andando o nadando. */
  walk: 4 / 60,
  /** Por segundo corriendo. */
  sprint: 4 / 20,
  jump: 0.05,
  /** Curarse medio corazón. */
  heal: 1.2,
};

/** Con al menos esta hambre llena, la vida sube sola. */
const HEAL_FROM = 16;
const HEAL_EVERY = 3;
/** Con la tripa vacía se pierde vida, pero nunca por debajo de esto: de hambre no te desmayas. */
const STARVE_FLOOR = 2;
const STARVE_EVERY = 8;
/** Caer desde más de esta altura hace daño (como en Minecraft, 3 bloques). */
const SAFE_FALL = 3.5;

export type HurtCause = 'caida' | 'agua' | 'magma' | 'hambre';

/** Lo que está haciendo el jugador, para gastar hambre y hacerse daño. */
export interface Activity {
  moving: boolean;
  sprinting: boolean;
  /** La cabeza está bajo el agua. */
  underwater: boolean;
  /** Pisa algo que quema (roca de magma). */
  burning: boolean;
}

export interface VitalsSave {
  health: number;
  hunger: number;
}

export class Vitals {
  health = MAX_HEALTH;
  hunger = MAX_HUNGER;
  air = MAX_AIR;
  private effort = 0;
  private healTimer = 0;
  private starveTimer = 0;
  private burnTimer = 0;
  private drownTimer = 0;
  /** Se llama cada vez que se recibe daño (para el sonido y el destello rojo). */
  onHurt: (amount: number, cause: HurtCause) => void = () => {};
  /** Se llama al llegar a cero corazones. */
  onFaint: (cause: HurtCause) => void = () => {};

  constructor(saved?: VitalsSave) {
    if (saved) this.restore(saved);
  }

  get fainted(): boolean {
    return this.health <= 0;
  }

  update(dt: number, a: Activity) {
    if (this.fainted || dt <= 0) return;
    this.effort += (a.sprinting ? EFFORT.sprint : a.moving ? EFFORT.walk : EFFORT.idle) * dt;
    this.digest();

    // Con la tripa llena se cura poco a poco; vacía, duele un poco (pero no te desmaya).
    if (this.hunger >= HEAL_FROM && this.health < MAX_HEALTH) {
      this.healTimer += dt;
      if (this.healTimer >= HEAL_EVERY) {
        this.healTimer = 0;
        this.health = Math.min(MAX_HEALTH, this.health + 1);
        this.effort += EFFORT.heal;
      }
    } else this.healTimer = 0;
    if (this.hunger <= 0 && this.health > STARVE_FLOOR) {
      this.starveTimer += dt;
      if (this.starveTimer >= STARVE_EVERY) {
        this.starveTimer = 0;
        this.hurt(1, 'hambre');
      }
    } else this.starveTimer = 0;

    // Bajo el agua se aguanta la respiración; después, el agua hace daño.
    if (a.underwater) {
      this.air = Math.max(0, this.air - dt);
      if (this.air <= 0) {
        this.drownTimer += dt;
        if (this.drownTimer >= 1) {
          this.drownTimer = 0;
          this.hurt(2, 'agua');
        }
      }
    } else {
      this.air = Math.min(MAX_AIR, this.air + dt * 4);
      this.drownTimer = 0;
    }

    if (a.burning) {
      this.burnTimer += dt;
      if (this.burnTimer >= 1) {
        this.burnTimer = 0;
        this.hurt(1, 'magma');
      }
    } else this.burnTimer = 0.7; // el primer pisotón quema enseguida
  }

  /** Saltar, picar… cansan un poco. */
  exert(kind: 'jump') {
    this.effort += EFFORT[kind];
    this.digest();
  }

  private digest() {
    while (this.effort >= 4) {
      this.effort -= 4;
      this.hunger = Math.max(0, this.hunger - 1);
    }
  }

  /** Daño por caer `distance` bloques (en el agua no duele). Devuelve el daño hecho. */
  fall(distance: number): number {
    const amount = Math.floor(distance - SAFE_FALL + 0.5);
    if (amount <= 0) return 0;
    this.hurt(amount, 'caida');
    return amount;
  }

  hurt(amount: number, cause: HurtCause) {
    if (this.fainted || amount <= 0) return;
    this.health = Math.max(0, this.health - amount);
    this.onHurt(amount, cause);
    if (this.fainted) this.onFaint(cause);
  }

  /** Se come algo: devuelve false si no tienes hambre o no es comida. */
  eat(id: string): boolean {
    const food = FOOD[id];
    if (!food || this.hunger >= MAX_HUNGER || this.fainted) return false;
    this.hunger = Math.min(MAX_HUNGER, this.hunger + food);
    this.effort = 0;
    return true;
  }

  /** Al despertar en casa: algo de vida y de hambre, para no estar mal nada más empezar. */
  revive() {
    this.health = MAX_HEALTH;
    this.hunger = Math.max(this.hunger, 12);
    this.air = MAX_AIR;
    this.effort = 0;
  }

  serialize(): VitalsSave {
    return { health: this.health, hunger: this.hunger };
  }

  restore(s: VitalsSave) {
    const ok = (n: unknown, max: number) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(Math.min(max, Math.max(0, n))) : max);
    this.health = ok(s.health, MAX_HEALTH) || MAX_HEALTH; // una partida guardada desmayada empieza bien
    this.hunger = ok(s.hunger, MAX_HUNGER);
  }
}

/** Lo que se pierde al desmayarse: unas pocas cosas y algo de dinero, nada más. */
export interface FaintLoss {
  /** Bayas perdidas (el 10%, como mucho 1.000). */
  berries: number;
  /** Casilla y cantidad que se pierde de cada una. */
  items: { slot: number; id: string; count: number }[];
}

export const FAINT_BERRIES = 0.1;
export const FAINT_BERRIES_MAX = 1000;
/** De cuántos montones distintos se pierde algo. */
export const FAINT_STACKS = 3;

/**
 * Decide qué se pierde al desmayarse: el 10% de las bayas (sin pasar de 1.000) y la mitad de hasta
 * 3 montones al azar. Las herramientas no se pierden nunca, ni lo que no se puede tirar.
 */
export function faintLoss(wallet: number, slots: ({ id: string; count: number } | null)[], keep: (id: string) => boolean, random = Math.random): FaintLoss {
  const berries = Math.min(FAINT_BERRIES_MAX, Math.floor(wallet * FAINT_BERRIES));
  const candidates = slots.flatMap((s, slot) => (s && !keep(s.id) ? [{ slot, id: s.id, count: s.count }] : []));
  const items: FaintLoss['items'] = [];
  while (items.length < FAINT_STACKS && candidates.length) {
    const [c] = candidates.splice(Math.floor(random() * candidates.length), 1);
    items.push({ slot: c.slot, id: c.id, count: Math.max(1, Math.floor(c.count / 2)) });
  }
  return { berries, items };
}
