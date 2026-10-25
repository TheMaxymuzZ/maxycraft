import { tileCanvas } from './blocks';
import type { Inventory } from './inventory';
import { itemDef } from './items';
import { ACHIEVEMENTS, type Missions, PRIZES } from './missions';
import type { Rating } from './rating';
import { formatBerries } from './shop';

export interface MissionsPanelContext {
  missions: Missions;
  inventory: Inventory;
  atlas: HTMLCanvasElement;
  rating: () => Rating;
  toast: (text: string) => void;
  /** Al canjear un premio, para que suene y se guarde. */
  redeemed: () => void;
}

/** Ventana de tareas: valoración de la isla, tareas del día, premios y logros. */
export class MissionsPanel {
  readonly el = document.querySelector<HTMLDivElement>('#missions')!;
  private pointsEl = document.querySelector<HTMLParagraphElement>('#missions-points')!;
  private starsEl = document.querySelector<HTMLDivElement>('#missions-rating')!;
  private tasksEl = document.querySelector<HTMLUListElement>('#missions-tasks')!;
  private prizesEl = document.querySelector<HTMLUListElement>('#missions-prizes')!;
  private achEl = document.querySelector<HTMLUListElement>('#missions-achievements')!;
  private achCountEl = document.querySelector<HTMLSpanElement>('#missions-ach-count')!;

  constructor(private ctx: MissionsPanelContext) {}

  open() {
    this.el.hidden = false;
    this.render();
  }

  close() {
    this.el.hidden = true;
  }

  render() {
    const m = this.ctx.missions;
    this.pointsEl.textContent = `${formatBerries(m.points)} puntos`;

    const r = this.ctx.rating();
    const stars = '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars);
    this.starsEl.innerHTML = `<span class="stars" aria-label="${r.stars} de 5 estrellas">${stars}</span><p></p>`;
    this.starsEl.querySelector('p')!.textContent = r.tip;

    this.tasksEl.innerHTML = '';
    for (const t of m.tasks) {
      const li = document.createElement('li');
      const done = m.isDone(t);
      li.className = done ? 'done' : '';
      const p = m.progressOf(t);
      li.innerHTML = `<div><b></b><small>${done ? '¡Hecho!' : `${formatBerries(p)} de ${formatBerries(t.goal)}`} · ${t.points} puntos</small></div><progress max="${t.goal}" value="${p}"></progress>`;
      li.querySelector('b')!.textContent = t.text;
      this.tasksEl.appendChild(li);
    }

    this.prizesEl.innerHTML = '';
    for (const prize of PRIZES) {
      const def = itemDef(prize.id);
      const li = document.createElement('li');
      li.innerHTML = `<img alt="" src="${tileCanvas(this.ctx.atlas, def.tile).toDataURL()}"><div><b></b><small>${formatBerries(prize.cost)} puntos</small></div><span class="actions"></span>`;
      li.querySelector('b')!.textContent = `${def.name}${prize.count > 1 ? ` ×${prize.count}` : ''}`;
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = 'Canjear';
      b.disabled = m.points < prize.cost;
      b.addEventListener('click', () => this.redeem(prize.id, prize.count, prize.cost));
      li.querySelector('.actions')!.appendChild(b);
      this.prizesEl.appendChild(li);
    }

    this.achCountEl.textContent = `${m.achievements.size} de ${ACHIEVEMENTS.length}`;
    this.achEl.innerHTML = '';
    for (const a of ACHIEVEMENTS) {
      const li = document.createElement('li');
      const got = m.achievements.has(a.id);
      li.className = got ? 'got' : '';
      li.innerHTML = `<b></b><small></small>`;
      li.querySelector('b')!.textContent = `${got ? '🏆 ' : ''}${a.name}`;
      li.querySelector('small')!.textContent = `${a.text} · ${a.points} puntos`;
      this.achEl.appendChild(li);
    }
  }

  private redeem(id: string, count: number, cost: number) {
    const inv = this.ctx.inventory;
    if (!inv.canFit(id, count)) {
      this.ctx.toast('No te cabe en los bolsillos');
      return;
    }
    if (!this.ctx.missions.spend(cost)) return;
    inv.add(id, count);
    this.ctx.toast(`Has canjeado: ${itemDef(id).name.toLowerCase()}`);
    this.ctx.redeemed();
    this.render();
  }
}
