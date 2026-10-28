// Modo tester (v5.1): comandos en el chat que empiezan por «/» para probarlo todo sin depender de bayas ni de
// recursos. Primero se escribe /tester para encenderlo (así nadie hace trampas sin querer) y /ayuda dice qué hay.
// Aquí está lo que no depende de la partida: leer el comando, buscar objetos por nombre y la lista de comandos.

import { ITEMS, type ItemDef } from './items';

/** Lo que el comando necesita de la partida. Cada función devuelve el texto que se le enseña al jugador. */
export interface CommandContext {
  /** Si el modo tester está encendido. */
  tester: boolean;
  setTester(on: boolean): void;
  /** En casa de un amigo los comandos no cambian su isla. */
  visiting: boolean;
  wallet(): number;
  setWallet(n: number): void;
  give(id: string, n: number): number;
  setHour(h: number): void;
  setWeather(w: string | null): void;
  heal(): void;
  learnAll(): number;
  shipyard(stage: number | null): string;
  boat(kind: string): string;
  islands(): { id: string; name: string }[];
  goTo(place: string): string;
  revealSea(): number;
  invincible(on: boolean | null): boolean;
}

export interface Command {
  name: string;
  aliases?: string[];
  usage: string;
  text: string;
  /** Funciona aunque el modo tester esté apagado (solo /ayuda y /tester). */
  always?: boolean;
  run(ctx: CommandContext, args: string[]): string;
}

/** Quita tildes y mayúsculas, para que «/dar Piña» y «/dar pina» sean lo mismo. */
export function plain(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Lee «/dar tablones 20» → { name: 'dar', args: ['tablones', '20'] }. null si no es un comando. */
export function parseCommand(text: string): { name: string; args: string[] } | null {
  const t = text.trim();
  if (!t.startsWith('/') || t.length < 2) return null;
  const [name, ...args] = t.slice(1).split(/\s+/);
  return { name: plain(name), args };
}

/** Busca un objeto por su id o por su nombre (sin tildes; vale un trozo si solo hay uno que encaje). */
export function findItem(query: string, items: readonly ItemDef[] = ITEMS): ItemDef | null {
  const q = plain(query).replace(/\s+/g, '_');
  if (!q) return null;
  const exact = items.find((d) => d.id === q || plain(d.name).replace(/\s+/g, '_') === q);
  if (exact) return exact;
  const some = items.filter((d) => d.id.includes(q) || plain(d.name).replace(/\s+/g, '_').includes(q));
  return some.length ? some.sort((a, b) => a.id.length - b.id.length)[0] : null;
}

const int = (s: string | undefined) => (s !== undefined && /^-?\d+$/.test(s) ? Number(s) : null);

export const COMMANDS: Command[] = [
  {
    name: 'ayuda', aliases: ['help', 'comandos'], usage: '/ayuda', text: 'La lista de comandos.', always: true,
    run: (ctx) => (ctx.tester
      ? `Comandos: ${COMMANDS.map((c) => c.usage).join(' · ')}`
      : 'Escribe /tester para encender el modo tester y probarlo todo sin gastar bayas ni recursos.'),
  },
  {
    name: 'tester', usage: '/tester', text: 'Enciende o apaga el modo tester.', always: true,
    run: (ctx) => {
      ctx.setTester(!ctx.tester);
      return ctx.tester ? '🧪 Modo tester encendido. Escribe /ayuda para ver los comandos.' : 'Modo tester apagado.';
    },
  },
  {
    name: 'bayas', aliases: ['dinero'], usage: '/bayas 50000', text: 'Te deja con esas bayas (con + delante, te las suma).',
    run: (ctx, [n]) => {
      const add = n?.startsWith('+');
      const v = int(add ? n.slice(1) : n);
      if (v === null || v < 0) return 'Uso: /bayas 50000 o /bayas +1000';
      ctx.setWallet(Math.min(99_999_999, add ? ctx.wallet() + v : v));
      return `Ahora tienes ${ctx.wallet()} bayas`;
    },
  },
  {
    name: 'dar', aliases: ['give', 'objeto'], usage: '/dar tablones 64', text: 'Te da un objeto (por su nombre o su id).',
    run: (ctx, args) => {
      const last = int(args[args.length - 1]);
      const n = last !== null && args.length > 1 ? Math.max(1, Math.min(999, last)) : 1;
      const name = (last !== null && args.length > 1 ? args.slice(0, -1) : args).join(' ');
      const def = findItem(name);
      if (!def) return name ? `No conozco «${name}». Prueba /buscar ${name}` : 'Uso: /dar tablones 64';
      const left = ctx.give(def.id, n);
      return left ? `Te he dado ${n - left} de ${def.name} (no cabe más)` : `Te he dado ${n} de ${def.name}`;
    },
  },
  {
    name: 'buscar', usage: '/buscar madera', text: 'Busca objetos por su nombre, para usarlos con /dar.',
    run: (_ctx, args) => {
      const q = plain(args.join(' '));
      if (!q) return 'Uso: /buscar madera';
      const found = ITEMS.filter((d) => d.id.includes(q.replace(/\s+/g, '_')) || plain(d.name).includes(q)).slice(0, 12);
      return found.length ? found.map((d) => `${d.name} (${d.id})`).join(', ') : `Nada con «${q}»`;
    },
  },
  {
    name: 'hora', usage: '/hora 21', text: 'Pone el reloj a esa hora.',
    run: (ctx, [h]) => {
      const v = int(h);
      if (v === null || v < 0 || v > 23) return 'Uso: /hora 0 a 23';
      ctx.setHour(v);
      return `Son las ${v}:00`;
    },
  },
  {
    name: 'tiempo', aliases: ['clima'], usage: '/tiempo lluvia', text: 'Sol, nubes, lluvia o nieve (normal para volver al de hoy).',
    run: (ctx, [w]) => {
      const v = plain(w ?? '');
      if (v === 'normal') {
        ctx.setWeather(null);
        return 'Vuelve el tiempo de hoy';
      }
      if (!['sol', 'nubes', 'lluvia', 'nieve'].includes(v)) return 'Uso: /tiempo sol, nubes, lluvia, nieve o normal';
      ctx.setWeather(v);
      return `Tiempo: ${v}`;
    },
  },
  {
    name: 'curar', aliases: ['comer'], usage: '/curar', text: 'Vida y hambre a tope.',
    run: (ctx) => {
      ctx.heal();
      return 'Vida y hambre a tope ❤️';
    },
  },
  {
    name: 'invencible', usage: '/invencible', text: 'No te haces daño ni te entra hambre (otra vez para quitarlo).',
    run: (ctx) => (ctx.invincible(null) ? 'Invencible: nada te hace daño' : 'Ya no eres invencible'),
  },
  {
    name: 'recetas', usage: '/recetas', text: 'Aprendes todas las recetas de bricolaje.',
    run: (ctx) => `Has aprendido ${ctx.learnAll()} recetas nuevas`,
  },
  {
    name: 'astillero', usage: '/astillero 4', text: 'Arregla el astillero hasta esa etapa (de 1 a 4), gratis.',
    run: (ctx, [n]) => {
      if (ctx.visiting) return 'Eso solo en tu isla';
      return ctx.shipyard(int(n));
    },
  },
  {
    name: 'barco', usage: '/barco velero', text: 'Te da un barco: balsa, velero o expedicion.',
    run: (ctx, [k]) => {
      if (ctx.visiting) return 'Eso solo en tu isla';
      const v = plain(k ?? '');
      const kind = v.startsWith('bal') ? 'balsa' : v.startsWith('vel') ? 'velero' : v.startsWith('exp') ? 'expedicion' : null;
      return kind ? ctx.boat(kind) : 'Uso: /barco balsa, velero o expedicion';
    },
  },
  {
    name: 'ir', aliases: ['tp'], usage: '/ir casa', text: 'Te lleva a casa, al astillero o a una isla del mar (por su nombre).',
    run: (ctx, args) => {
      const where = plain(args.join(' '));
      if (!where) return `Uso: /ir casa, /ir astillero o /ir ${ctx.islands().map((i) => plain(i.name).replace(/^isla /, '')).join(', ')}`;
      return ctx.goTo(where);
    },
  },
  {
    name: 'islas', aliases: ['mar'], usage: '/islas', text: 'Descubre todas las islas en la carta náutica.',
    run: (ctx) => `Carta náutica completa: ${ctx.revealSea()} islas`,
  },
];

/** Ejecuta lo que se ha escrito en el chat. null si no era un comando (entonces es un mensaje normal). */
export function runCommand(ctx: CommandContext, text: string): string | null {
  const c = parseCommand(text);
  if (!c) return null;
  const cmd = COMMANDS.find((k) => k.name === c.name || k.aliases?.includes(c.name));
  if (!cmd) return `No conozco /${c.name}. Escribe /ayuda`;
  if (!cmd.always && !ctx.tester) return 'Primero enciende el modo tester con /tester';
  return cmd.run(ctx, c.args);
}
