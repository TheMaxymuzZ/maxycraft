// Pantalla de desmayo (v4.1, separada de main.ts en la v4.5): qué has perdido y el botón para despertar.
import { itemDef } from '../items';
import { formatBerries } from '../shop';
import type { HurtCause } from '../vitals';

const HURT_TEXT: Record<HurtCause, string> = {
  caida: 'Te has caído desde muy alto',
  agua: 'Te has quedado sin aire bajo el agua',
  magma: 'Te has quemado con la roca de magma',
  lava: 'Te has metido en la lava',
  hambre: 'Tenías mucha hambre',
};

export interface FaintLoss {
  berries: number;
  items: { id: string; count: number }[];
}

export class FaintScreen {
  private readonly el = document.querySelector<HTMLDivElement>('#faint')!;
  private readonly wake = this.el.querySelector<HTMLButtonElement>('#faint-wake')!;

  constructor(onWake: () => void) {
    this.wake.addEventListener('click', onWake);
  }

  get open(): boolean {
    return !this.el.hidden;
  }

  show(cause: HurtCause, loss: FaintLoss, awayFromHome: boolean) {
    const list = this.el.querySelector('ul')!;
    list.innerHTML = '';
    const line = (text: string) => list.appendChild(Object.assign(document.createElement('li'), { textContent: text }));
    if (loss.berries) line(`${formatBerries(loss.berries)} bayas`);
    for (const l of loss.items) line(`${l.count} × ${itemDef(l.id).name.toLowerCase()}`);
    if (!loss.berries && !loss.items.length) line('¡Nada! Tenías los bolsillos vacíos');
    this.el.querySelector('#faint-cause')!.textContent = `${HURT_TEXT[cause]}.`;
    this.wake.textContent = awayFromHome ? 'Despertar' : 'Despertar en casa';
    this.el.hidden = false;
    this.wake.focus();
  }

  hide() {
    this.el.hidden = true;
  }
}
