import type { Inventory } from './inventory';
import { itemDef } from './items';
import type { Personality, Villager } from './villagers';

// Frases de los vecinos. {c} es su coletilla y {saludo} depende de la hora.
const GREETINGS: Record<Personality, string[]> = {
  alegre: [
    '¡{saludo}! ¡Qué alegría verte, {c}!',
    '¡Eh, hola! Hoy me he levantado con ganas de bailar, {c}.',
    '¡{saludo}! ¿Has visto qué cielo tan bonito? Me dan ganas de cantar, {c}.',
  ],
  'gruñón': [
    'Hmm. {saludo}. Supongo que vienes a molestar, {c}.',
    'Ah, eres tú. Bueno, tampoco me caes tan mal, {c}.',
    '{saludo}. Estaba pensando en mis cosas, {c}.',
  ],
  'dormilón': [
    '{saludo}... uaaah... perdona, me he quedado medio dormido, {c}.',
    '¡Hola! ¿Tienes algo de comer? Es que me ha entrado hambre, {c}.',
    '{saludo}. Hoy es un buen día para echarse la siesta, {c}.',
  ],
  presumido: [
    '{saludo}. ¿Te has fijado en mi peinado nuevo? Fabuloso, {c}.',
    '¡Hola! Hoy estoy radiante, como siempre, {c}.',
    '{saludo}. Una isla tan bonita se merece vecinos con estilo, {c}.',
  ],
};

const CHATS: Record<Personality, string[]> = {
  alegre: [
    'Si sacudes los árboles cae fruta. ¡A veces también una rama, {c}!',
    'Me encanta pasear junto al río. El sonido del agua me pone contenta, {c}.',
    'Cuando sea mayor quiero tener la casa más bonita de la isla, {c}.',
    'He visto conchas en la playa esta mañana. ¡Cada día salen nuevas, {c}!',
  ],
  'gruñón': [
    'La piedra no se rompe con las manos. Necesitas un pico, eso lo sabe cualquiera, {c}.',
    'Antes esta isla era más tranquila. Ahora hay alguien rompiendo bloques todo el día, {c}.',
    'Si vas a construir algo, que no sea delante de mi ventana, {c}.',
    'Las herramientas se gastan. Lleva siempre ramas de sobra, {c}.',
  ],
  'dormilón': [
    'La fruta de esta isla está riquísima. Podría comer {fruta} todo el día, {c}.',
    'Por la noche me meto en casa pronto. Dormir es lo mejor del mundo, {c}.',
    'Si te encuentras una {fruta} de más, ya sabes dónde vivo, {c}.',
    'Nadar en el mar cansa mucho. Mejor mirarlo desde la arena, {c}.',
  ],
  presumido: [
    'Las flores quedan preciosas junto a una casa. Pon unas cuantas, {c}.',
    'Una estrella de mar sería el adorno perfecto para mi salón, {c}.',
    'He oído que pronto abrirá una tienda en la isla. ¡Necesito ropa nueva, {c}!',
    'Los tejados de colores son lo más. El mío es el más elegante, claro, {c}.',
  ],
};

const LIKED = [
  '¡¿Para mí?! ¡Es justo lo que quería! Muchas gracias, {c}.',
  '¡Qué detalle! Esto lo voy a guardar con mucho cariño, {c}.',
];
const POLITE = [
  'Oh, gracias. No sé muy bien qué haré con esto, pero gracias, {c}.',
  '¡Un regalo! Qué amable. Lo pondré en algún sitio, {c}.',
];
const ALREADY = 'Ya me has dado un regalo hoy. ¡Me vas a malacostumbrar, {c}!';
const RETURN_GIFT = 'Toma, esto es para ti. ¡Un regalo por otro regalo, {c}!';
const GOODBYE = ['¡Hasta luego, {c}!', '¡Nos vemos!', 'Venga, ¡que vaya bien, {c}!'];

const CATEGORY: Record<string, 'fruta' | 'conchas' | 'flores' | 'madera'> = {
  manzana: 'fruta', naranja: 'fruta', pera: 'fruta', melocoton: 'fruta', cereza: 'fruta', coco: 'fruta',
  concha: 'conchas', caracola: 'conchas', estrella: 'conchas',
  tulipan: 'flores', pensamiento: 'flores', cosmos: 'flores',
  tronco: 'madera', tablones: 'madera', rama: 'madera', tronco_palmera: 'madera',
};

const RETURN_ITEMS = ['tulipan', 'pensamiento', 'cosmos', 'tablones'];

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

export interface DialogContext {
  inventory: Inventory;
  selectedSlot: () => number;
  today: string;
  hour: number;
  fruitName: string;
  toast: (text: string) => void;
  /** Se llama al terminar la conversación. */
  onClose: () => void;
}

/** Ventana de conversación con un vecino, al estilo de Animal Crossing. */
export class Dialog {
  private el = document.querySelector<HTMLDivElement>('#dialog')!;
  private nameEl = document.querySelector<HTMLSpanElement>('#dialog-name')!;
  private textEl = document.querySelector<HTMLParagraphElement>('#dialog-text')!;
  private choicesEl = document.querySelector<HTMLDivElement>('#dialog-choices')!;
  private villager: Villager | null = null;
  private typing = 0;

  constructor(private ctx: DialogContext) {}

  get open() {
    return this.villager !== null;
  }

  private fill(line: string): string {
    const h = this.ctx.hour;
    const saludo = h < 12 && h >= 5 ? 'Buenos días' : h < 20 && h >= 12 ? 'Buenas tardes' : 'Buenas noches';
    return line
      .replace(/\{c\}/g, this.villager!.profile.catchphrase)
      .replace(/\{saludo\}/g, saludo)
      .replace(/\{fruta\}/g, this.ctx.fruitName);
  }

  start(v: Villager) {
    this.villager = v;
    v.talking = true;
    this.el.hidden = false;
    this.nameEl.textContent = v.name;
    this.nameEl.style.background = `#${v.profile.shirt.toString(16).padStart(6, '0')}`;
    const first = v.memory.talkedDay !== this.ctx.today;
    if (first) {
      v.memory.talkedDay = this.ctx.today;
      v.memory.friendship += 1;
    }
    this.say(pick(first ? GREETINGS[v.profile.personality] : CHATS[v.profile.personality]));
  }

  private say(line: string) {
    const text = this.fill(line);
    this.choicesEl.innerHTML = '';
    clearInterval(this.typing);
    let i = 0;
    this.textEl.textContent = '';
    // El texto aparece letra a letra; un clic en el cuadro lo completa.
    this.typing = window.setInterval(() => {
      i += 2;
      this.textEl.textContent = text.slice(0, i);
      if (i >= text.length) {
        clearInterval(this.typing);
        this.showChoices();
      }
    }, 30);
    this.textEl.onclick = () => {
      clearInterval(this.typing);
      this.textEl.textContent = text;
      this.showChoices();
    };
  }

  private showChoices() {
    if (this.choicesEl.childElementCount) return;
    const v = this.villager;
    if (!v) return;
    const add = (label: string, fn: () => void) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('click', fn);
      this.choicesEl.appendChild(b);
    };
    add('Charlar', () => this.say(pick(CHATS[v.profile.personality])));
    const slot = this.ctx.selectedSlot();
    const stack = this.ctx.inventory.slots[slot];
    if (stack && !itemDef(stack.id).tool) {
      add(`Regalar ${itemDef(stack.id).name.toLowerCase()}`, () => this.gift(slot));
    }
    add('Adiós', () => this.finish());
    (this.choicesEl.firstElementChild as HTMLButtonElement | null)?.focus();
  }

  private gift(slot: number) {
    const v = this.villager!;
    const stack = this.ctx.inventory.slots[slot];
    if (!stack) return;
    if (v.memory.giftDay === this.ctx.today) {
      this.say(ALREADY);
      return;
    }
    const liked = CATEGORY[stack.id] === v.profile.likes;
    this.ctx.inventory.consume(slot);
    v.memory.giftDay = this.ctx.today;
    v.memory.friendship += liked ? 3 : 1;
    if (v.memory.friendship >= 4 && Math.random() < 0.5) {
      const back = pick(RETURN_ITEMS);
      const count = back === 'tablones' ? 4 : 1;
      if (this.ctx.inventory.add(back, count) === 0) {
        this.say(`${pick(liked ? LIKED : POLITE)} ${RETURN_GIFT}`);
        this.ctx.toast(`${v.name} te ha regalado: ${itemDef(back).name.toLowerCase()}`);
        return;
      }
    }
    this.say(pick(liked ? LIKED : POLITE));
  }

  finish() {
    const v = this.villager;
    if (!v) return;
    clearInterval(this.typing);
    this.textEl.textContent = this.fill(pick(GOODBYE));
    this.choicesEl.innerHTML = '';
    v.talking = false;
    this.villager = null;
    window.setTimeout(() => {
      if (!this.villager) this.el.hidden = true;
    }, 700);
    this.ctx.onClose();
  }
}
