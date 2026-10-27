import { CODE_LENGTH, inviteLink, normalizeCode } from './net/code';
import { GESTURES, type Gesture, MAX_CHAT, MAX_PLAYERS, type PeerInfo } from './net/protocol';

/** Cómo se ve cada gesto: un dibujito y su nombre. */
export const GESTURE_LOOK: Record<Gesture, { emoji: string; name: string }> = {
  saludo: { emoji: '👋', name: 'Saludar' },
  alegria: { emoji: '😄', name: 'Alegría' },
  risa: { emoji: '😂', name: 'Risa' },
  sorpresa: { emoji: '😮', name: 'Sorpresa' },
  corazon: { emoji: '❤️', name: 'Cariño' },
  sueno: { emoji: '💤', name: 'Sueño' },
};

/** Un jugador en la lista: su papel en la isla (v4.14) y, si tienes parcela, si le dejas construir en ella. */
export interface Player extends PeerInfo {
  status?: string;
  canBuild?: boolean;
}

export interface FriendsState {
  role: 'solo' | 'anfitrion' | 'invitado';
  /** Código de la isla abierta. */
  code: string | null;
  /** Todos los que están en la isla, contigo. */
  players: Player[];
  /** Se está abriendo la isla o buscando la de un amigo. */
  busy: boolean;
  /** Por qué no se puede abrir la isla ahora (de viaje, por ejemplo). */
  blocked?: string;
}

export interface FriendsContext {
  state(): FriendsState;
  /** Tu nombre para los demás. */
  name(): string;
  rename(name: string): void;
  host(): void;
  join(code: string): void;
  /** Cierra tu isla o vuelve a la tuya. */
  leave(): void;
  say(text: string): void;
  gesture(g: Gesture): void;
  toast(text: string): void;
  /** Deja (o deja de dejar) construir a un amigo en tu parcela. */
  togglePermit?(p: Player): void;
}

/** Ventanas de la partida con amigos: el menú para invitar y entrar, el chat y los gestos. */
export class FriendsUI {
  private body = document.querySelector<HTMLDivElement>('#friends-body')!;
  private log = document.querySelector<HTMLDivElement>('#chat-log')!;
  private form = document.querySelector<HTMLFormElement>('#chat-form')!;
  private input = document.querySelector<HTMLInputElement>('#chat-input')!;
  private gestures = document.querySelector<HTMLDivElement>('#gestures')!;
  /** Se llama al cerrar el chat o los gestos, para volver a jugar. */
  onClose: () => void = () => {};

  constructor(private ctx: FriendsContext) {
    this.input.maxLength = MAX_CHAT;
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.input.value.trim();
      if (text) ctx.say(text);
      this.closeChat();
    });
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeChat();
    });
    GESTURES.forEach((g, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = `<span class="emoji">${GESTURE_LOOK[g].emoji}</span><span>${GESTURE_LOOK[g].name}</span><kbd>${i + 1}</kbd>`;
      b.addEventListener('click', () => this.pickGesture(g));
      this.gestures.appendChild(b);
    });
  }

  get chatOpen() {
    return !this.form.hidden;
  }

  get gesturesOpen() {
    return !this.gestures.hidden;
  }

  openChat() {
    this.form.hidden = false;
    this.input.value = '';
    this.input.focus();
  }

  closeChat() {
    this.form.hidden = true;
    this.input.blur();
    this.onClose();
  }

  openGestures() {
    this.gestures.hidden = false;
  }

  closeGestures() {
    this.gestures.hidden = true;
    this.onClose();
  }

  /** Con los gestos abiertos, los números eligen uno. Devuelve si la tecla era para los gestos. */
  gestureKey(code: string): boolean {
    const n = /^Digit([1-9])$/.exec(code);
    if (!n) return false;
    const g = GESTURES[Number(n[1]) - 1];
    if (g) this.pickGesture(g);
    return true;
  }

  private pickGesture(g: Gesture) {
    this.ctx.gesture(g);
    this.closeGestures();
  }

  /** Añade una línea al chat; se va borrando sola. */
  addLine(name: string, text: string, color = 0x3d6b2f) {
    const line = document.createElement('p');
    const who = document.createElement('strong');
    who.textContent = `${name}: `;
    who.style.color = `#${color.toString(16).padStart(6, '0')}`;
    line.append(who, text);
    this.log.appendChild(line);
    while (this.log.children.length > 6) this.log.firstElementChild!.remove();
    window.setTimeout(() => line.classList.add('old'), 9000);
    window.setTimeout(() => line.remove(), 10000);
  }

  /** Pinta la pantalla «Jugar con amigos» según cómo esté la partida. */
  render() {
    const s = this.ctx.state();
    const el = (tag: string, cls = '', text = '') => {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text) e.textContent = text;
      return e;
    };
    const button = (text: string, onClick: () => void, cls = 'menu-btn') => {
      const b = el('button', cls, text) as HTMLButtonElement;
      b.type = 'button';
      b.disabled = s.busy;
      b.addEventListener('click', onClick);
      return b;
    };
    const players = () => {
      const ul = el('ul', 'friends-players');
      for (const p of s.players) {
        const li = el('li', '', p.name);
        li.style.setProperty('--c', `#${p.color.toString(16).padStart(6, '0')}`);
        if (p.status) li.append(' ', el('span', 'player-status', p.status));
        if (p.canBuild !== undefined) {
          const b = button(p.canBuild ? 'Quitar permiso' : 'Dejar construir', () => this.ctx.togglePermit?.(p), 'player-permit');
          b.title = p.canBuild ? 'Ahora puede construir en tu parcela' : 'Dejar que construya en tu parcela';
          li.append(' ', b);
        }
        ul.appendChild(li);
      }
      return ul;
    };
    this.body.innerHTML = '';
    if (s.role === 'anfitrion') {
      this.body.append(
        el('p', 'note', 'Tu isla está abierta. Pasa este código a tus amigos para que entren:'),
        el('p', 'invite-code', s.code ?? '…'),
      );
      const row = el('div', 'menu-row');
      row.append(
        button('Copiar enlace', () => this.copy(inviteLink(s.code!, location.href))),
        button('Copiar código', () => this.copy(s.code!)),
      );
      this.body.append(row, el('h3', '', `En la isla (${s.players.length} de ${MAX_PLAYERS})`), players(), button('Cerrar la isla', () => this.ctx.leave(), 'secondary'));
      return;
    }
    if (s.role === 'invitado') {
      this.body.append(el('p', 'note', 'Estás de visita en la isla de un amigo. Lo que llevas en los bolsillos es tuyo y te lo llevas al volver.'), el('h3', '', 'En la isla'), players(), button('Volver a mi isla', () => this.ctx.leave(), 'secondary'));
      return;
    }
    this.body.append(el('p', 'note', 'Juega con hasta 5 amigos en tu isla, cada uno desde su ordenador. No hace falta cuenta: solo un código.'));
    const nameRow = el('div', 'join-form');
    const nameLabel = el('label', '', 'Tu nombre') as HTMLLabelElement;
    const nameInput = el('input') as HTMLInputElement;
    nameInput.id = 'friend-name';
    nameInput.maxLength = 16;
    nameInput.value = this.ctx.name();
    nameInput.className = 'name-input';
    nameLabel.htmlFor = nameInput.id;
    nameInput.addEventListener('change', () => this.ctx.rename(nameInput.value));
    nameRow.append(nameLabel, nameInput);
    this.body.append(nameRow);
    if (s.blocked) this.body.append(el('p', 'note warn', s.blocked));
    else this.body.append(button(s.busy ? 'Abriendo…' : 'Abrir mi isla a amigos', () => this.ctx.host(), 'friends-open'));
    const form = el('form', 'join-form') as HTMLFormElement;
    const label = el('label', '', 'Código de un amigo') as HTMLLabelElement;
    const input = el('input') as HTMLInputElement;
    input.id = 'join-code';
    input.maxLength = CODE_LENGTH + 2;
    input.autocomplete = 'off';
    input.placeholder = 'ABC234';
    label.htmlFor = input.id;
    form.append(label, input, button(s.busy ? 'Buscando…' : 'Entrar', () => form.requestSubmit(), 'menu-btn'));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = normalizeCode(input.value);
      if (!code) {
        this.ctx.toast(`El código tiene ${CODE_LENGTH} letras o números`);
        return;
      }
      this.ctx.join(code);
    });
    this.body.append(form);
  }

  private copy(text: string) {
    navigator.clipboard?.writeText(text).then(
      () => this.ctx.toast('Copiado. Pégalo en un mensaje a tus amigos'),
      () => this.ctx.toast(text),
    ) ?? this.ctx.toast(text);
  }
}
