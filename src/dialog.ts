import type { Inventory } from './inventory';
import { itemDef } from './items';
import type { Holiday } from './seasons';
import { formatBerries } from './shop';
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
    'A veces el mar trae botellas con recetas dentro. ¡Mira bien en la playa, {c}!',
  ],
  'gruñón': [
    'La piedra no se rompe con las manos. Necesitas un pico, eso lo sabe cualquiera, {c}.',
    'Antes esta isla era más tranquila. Ahora hay alguien rompiendo bloques todo el día, {c}.',
    'Si vas a construir algo, que no sea delante de mi ventana, {c}.',
    'Las herramientas se gastan. Lleva siempre ramas de sobra, {c}.',
    'Para fabricar muebles hace falta una mesa de trabajo. Cuatro tablones y listo, {c}.',
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
const SHOP_GREETINGS = [
  '¡{saludo}! ¡Bienvenida, bienvenido a mi tienda! Hoy tengo cosas muy bonitas, {c}.',
  '¡Hola! Si traes fruta o conchas, te las compro a buen precio, {c}.',
  '¡{saludo}! Los precios de venta cambian cada día. ¡Mira bien antes de vender, {c}!',
];
const MUSEUM_GREETINGS = [
  '¡Ejem! {saludo}. Bienvenida, bienvenido al museo de la isla, {c}.',
  'Cada pez y cada insecto que dones ayuda a conocer mejor la isla, {c}.',
  '{saludo}. ¿Traes algo nuevo para la colección? Me encantaría verlo, {c}.',
];
const BIRTHDAY = '¡Hoy es mi cumpleaños! ¿Has venido a felicitarme? ¡Qué ilusión, {c}!';
const BIRTHDAY_GIFT = '¡Un regalo de cumpleaños! Es el mejor regalo que me han hecho nunca. ¡Toma, esto para ti, {c}!';
const DONATED = '¡Oh! ¡Un ejemplar magnífico! Lo pondré en la colección ahora mismo, {c}.';
const NOTHING_NEW = 'Mmm, no veo nada que el museo no tenga ya. ¡Sigue buscando, {c}!';
const GOODBYE = ['¡Hasta luego, {c}!', '¡Nos vemos!', 'Venga, ¡que vaya bien, {c}!'];

const CATEGORY: Record<string, 'fruta' | 'conchas' | 'flores' | 'madera'> = {
  manzana: 'fruta', naranja: 'fruta', pera: 'fruta', melocoton: 'fruta', cereza: 'fruta', coco: 'fruta',
  concha: 'conchas', caracola: 'conchas', estrella: 'conchas',
  tulipan: 'flores', pensamiento: 'flores', cosmos: 'flores',
  tronco: 'madera', tablones: 'madera', rama: 'madera', tronco_palmera: 'madera',
};

const RETURN_ITEMS = ['tulipan', 'pensamiento', 'cosmos', 'tablones'];

/** La casa del jugador: de la tienda de campaña a la casa grande, pagando poco a poco. */
export const HOUSE_NAMES = ['tienda de campaña', 'casa pequeña', 'casa mediana', 'casa grande'];
export const HOUSE_COSTS = [5000, 15000, 40000];
const ROOF_NAMES = ['Rojo', 'Azul', 'Verde', 'Amarillo'];
const PAYMENT = 1000;

export interface HomeActions {
  /** Si la isla tiene parcela para el jugador. */
  available: boolean;
  state(): { level: number; debt: number; wallet: number };
  /** Construye el siguiente nivel con el tejado elegido (índice de ROOFS) y suma su precio a la deuda. */
  upgrade(roof: number): void;
  pay(amount: number): void;
}

type Option = [string, () => void];

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
  /** Abre la tienda (al hablar con la dependienta). */
  openShop: () => void;
  /** Lo que se puede donar al museo y cómo donarlo. */
  donatable: () => string[];
  donate: (id: string) => boolean;
  openCollection: () => void;
  home: HomeActions;
  /** Aprende una receta nueva para la mesa de trabajo; devuelve su nombre o null. */
  learnRecipe: () => string | null;
  /** Fiesta de hoy, si la hay. */
  holiday: Holiday | null;
  isBirthday: (v: Villager) => boolean;
  /** Pitido de voz mientras sale el texto. */
  voice?: (v: Villager) => void;
}

/** Ventana de conversación con un vecino, al estilo de Animal Crossing. */
export class Dialog {
  private el = document.querySelector<HTMLDivElement>('#dialog')!;
  private nameEl = document.querySelector<HTMLSpanElement>('#dialog-name')!;
  private textEl = document.querySelector<HTMLParagraphElement>('#dialog-text')!;
  private choicesEl = document.querySelector<HTMLDivElement>('#dialog-choices')!;
  private villager: Villager | null = null;
  private typing = 0;
  /** Respuestas para la frase actual; si no hay, salen las de siempre. */
  private options: Option[] | null = null;

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
    const party = first && this.ctx.isBirthday(v);
    if (party) this.say(BIRTHDAY);
    else if (first && this.ctx.holiday && !v.isCurator) this.say(this.ctx.holiday.greeting);
    else if (v.isShopkeeper) this.say(pick(SHOP_GREETINGS));
    else if (v.isCurator) this.say(pick(MUSEUM_GREETINGS));
    else if (first && v.memory.friendship >= 3 && Math.random() < 0.4 && this.teach()) return;
    else this.say(pick(first ? GREETINGS[v.profile.personality] : CHATS[v.profile.personality]));
  }

  private say(line: string, options: Option[] | null = null) {
    this.options = options;
    const text = this.fill(line);
    this.choicesEl.innerHTML = '';
    clearInterval(this.typing);
    let i = 0;
    this.textEl.textContent = '';
    // El texto aparece letra a letra; un clic en el cuadro lo completa.
    this.typing = window.setInterval(() => {
      i += 2;
      if (i % 4 === 0 && this.villager && text[i] !== ' ') this.ctx.voice?.(this.villager);
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
    if (this.options) {
      for (const [label, fn] of this.options) add(label, fn);
      (this.choicesEl.firstElementChild as HTMLButtonElement | null)?.focus();
      return;
    }
    if (v.isShopkeeper) {
      add('Comprar y vender', () => {
        this.finish(true);
        this.ctx.openShop();
      });
      if (this.ctx.home.available) add('Mi casa', () => this.homeMenu());
    } else if (v.isCurator) {
      add('Donar', () => this.donateAll());
      add('Ver la colección', () => {
        this.finish(true);
        this.ctx.openCollection();
      });
    } else {
      add('Charlar', () => this.say(pick(CHATS[v.profile.personality])));
    }
    const slot = this.ctx.selectedSlot();
    const stack = this.ctx.inventory.slots[slot];
    if (stack && !itemDef(stack.id).tool && !v.isCurator) {
      add(`Regalar ${itemDef(stack.id).name.toLowerCase()}`, () => this.gift(slot));
    }
    add('Adiós', () => this.finish());
    (this.choicesEl.firstElementChild as HTMLButtonElement | null)?.focus();
  }

  /** El vecino comparte una receta, como en Animal Crossing cuando están haciendo manualidades. */
  private teach(): boolean {
    const name = this.ctx.learnRecipe();
    if (!name) return false;
    this.say(`¡Hola! Estaba haciendo manualidades y se me ha ocurrido cómo fabricar: ${name.toLowerCase()}. ¡Toma, te regalo la receta, {c}!`);
    this.ctx.toast(`Receta nueva: ${name.toLowerCase()}. Úsala en la mesa de trabajo`);
    return true;
  }

  private back = () => this.say('¿Algo más, {c}?');

  private homeMenu() {
    const { level, debt, wallet } = this.ctx.home.state();
    if (debt > 0) {
      const part = Math.min(PAYMENT, debt);
      const options: Option[] = [];
      if (wallet >= part) options.push([`Pagar ${formatBerries(part)}`, () => this.pay(part)]);
      if (debt > part && wallet >= debt) options.push(['Pagar todo', () => this.pay(debt)]);
      options.push(['Volver', this.back]);
      this.say(`Todavía te quedan ${formatBerries(debt)} bayas por pagar de tu ${HOUSE_NAMES[level]}. Sin prisa, ¡aquí no se cobran intereses, {c}!`, options);
      return;
    }
    if (level >= HOUSE_COSTS.length) {
      this.say('¡Tu casa ya es la más grande de la isla! Ha quedado preciosa, {c}.', [['Volver', this.back]]);
      return;
    }
    const cost = formatBerries(HOUSE_COSTS[level]);
    const line = level === 0
      ? `Así que duermes en una tienda de campaña… ¿Quieres una casa de verdad? Una ${HOUSE_NAMES[1]} cuesta ${cost} bayas, y me las puedes ir pagando poco a poco, {c}.`
      : `¿Quieres ampliar tu casa? Una ${HOUSE_NAMES[level + 1]} cuesta ${cost} bayas. Como siempre, pagas cuando puedas, {c}.`;
    this.say(line, [
      ['¡Sí, por favor!', () => this.chooseRoof()],
      ['Ahora no', this.back],
    ]);
  }

  private chooseRoof() {
    this.say(
      '¡Estupendo! ¿De qué color quieres el tejado, {c}?',
      ROOF_NAMES.map((name, i): Option => [name, () => {
        this.ctx.home.upgrade(i);
        const { level } = this.ctx.home.state();
        this.say(`¡Listo! Tu ${HOUSE_NAMES[level]} ya está construida. ¡Ve a verla y llénala de muebles, {c}!`);
      }]),
    );
  }

  private pay(amount: number) {
    this.ctx.home.pay(amount);
    const { debt } = this.ctx.home.state();
    this.say(debt > 0
      ? `¡Gracias! Te quedan ${formatBerries(debt)} bayas por pagar, {c}.`
      : '¡Ya has pagado toda la casa! Cuando quieras, podemos hacerla más grande, {c}.');
  }

  private donateAll() {
    const ids = this.ctx.donatable();
    if (!ids.length) {
      this.say(NOTHING_NEW);
      return;
    }
    const names = ids.filter((id) => this.ctx.donate(id)).map((id) => itemDef(id).name.toLowerCase());
    this.ctx.toast(`Has donado: ${names.join(', ')}`);
    this.say(DONATED);
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
    if (this.ctx.isBirthday(v)) {
      // En su cumpleaños cualquier regalo hace mucha ilusión, y siempre devuelve uno.
      v.memory.friendship += 5;
      const back = pick(RETURN_ITEMS);
      this.ctx.inventory.add(back, back === 'tablones' ? 4 : 1);
      this.ctx.toast(`${v.name} te ha regalado: ${itemDef(back).name.toLowerCase()}`);
      this.say(BIRTHDAY_GIFT);
      return;
    }
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

  /** Termina la conversación. Con `quiet` se cierra sin despedida ni avisar (para pasar a la tienda). */
  finish(quiet = false) {
    const v = this.villager;
    if (!v) return;
    clearInterval(this.typing);
    if (quiet) {
      v.talking = false;
      this.villager = null;
      this.el.hidden = true;
      return;
    }
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
