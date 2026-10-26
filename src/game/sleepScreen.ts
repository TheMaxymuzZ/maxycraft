// Pantallas de dormir (v4.2, separadas de main.ts en la v4.5): elegir la hora de despertar y "durmiendo...".
import { WAKE_CHOICES, hourText } from '../sleep';

export interface SleepScreenDeps {
  /** Se elige despertar a ese minuto del día. */
  onChoose(wake: number): void;
  /** Se pulsa "Levantarse" o "Cancelar". */
  onGetUp(): void;
}

export class SleepScreen {
  private readonly choose = document.querySelector<HTMLDivElement>('#sleep')!;
  private readonly sleeping = document.querySelector<HTMLDivElement>('#sleeping')!;
  private readonly sleepingText = this.sleeping.querySelector<HTMLParagraphElement>('#sleeping-text')!;
  private readonly sleepingButton = this.sleeping.querySelector<HTMLButtonElement>('#sleeping-up')!;
  private readonly fade = document.querySelector<HTMLDivElement>('#night-fade')!;
  private readonly hour = this.choose.querySelector<HTMLInputElement>('#sleep-hour')!;
  private readonly hourText = this.choose.querySelector<HTMLElement>('#sleep-hour-text')!;

  constructor(deps: SleepScreenDeps) {
    for (const c of WAKE_CHOICES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = `<b>${c.hour}:00</b><small>${c.name}</small>`;
      b.addEventListener('click', () => deps.onChoose(c.hour * 60));
      this.choose.querySelector('#sleep-choices')!.appendChild(b);
    }
    this.hour.addEventListener('input', () => this.showHour());
    this.choose.querySelector('#sleep-custom-go')!.addEventListener('click', () => deps.onChoose(Number(this.hour.value) * 60));
    this.choose.querySelector('#sleep-cancel')!.addEventListener('click', () => deps.onGetUp());
    this.sleepingButton.addEventListener('click', () => deps.onGetUp());
  }

  private showHour() {
    this.hourText.textContent = hourText(Number(this.hour.value) * 60);
  }

  /** Pregunta a qué hora despertar; por defecto, ocho horas después de `hour`. */
  ask(text: string, hour: number) {
    this.hour.value = String(Math.round(((hour + 8) % 24) * 2) / 2);
    this.showHour();
    this.choose.querySelector('#sleep-text')!.textContent = text;
    this.choose.hidden = false;
  }

  /** Ya en la cama. */
  showSleeping(text: string) {
    this.choose.hidden = true;
    this.sleeping.hidden = false;
    this.sleeping.classList.remove('morning');
    this.sleepingButton.textContent = 'Levantarse';
    this.sleepingText.textContent = text;
  }

  setText(text: string) {
    this.sleepingText.textContent = text;
  }

  showMorning(text: string) {
    this.sleeping.classList.add('morning');
    this.sleepingText.textContent = text;
    this.sleepingButton.textContent = 'Levantarse';
  }

  hide() {
    this.choose.hidden = true;
    this.sleeping.hidden = true;
  }

  fadeOut(on: boolean) {
    this.fade.classList.toggle('on', on);
  }
}
