import { BLOCKS } from './blocks';
import { SLOTS, type SaveData, backupName, deleteGame, exportSave, importSave, loadGame, saveGame } from './save';
import { formatBerries } from './shop';
import { islandFruit } from './world';

export interface IslandsContext {
  /** La isla que se está jugando ahora. */
  active: number;
  /** Guarda ya la partida en curso, para que la copia salga al día. */
  flush(): void;
  /** Deja de guardar la isla en curso (antes de borrarla o sustituirla). */
  stopSaving(): void;
  /** Cambia de isla: hay que recargar el juego. */
  switchTo(slot: number): void;
  toast(text: string): void;
}

const dateFormat = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Pantalla "Mis islas": varias islas guardadas, y copias de seguridad en un archivo. */
export class Islands {
  private list = document.querySelector<HTMLUListElement>('#islands-list')!;
  private fileInput = document.createElement('input');
  private importSlot = 0;
  /** Botón de borrar que ya se ha pulsado una vez y espera la confirmación. */
  private confirming: number | null = null;

  constructor(private ctx: IslandsContext) {
    this.fileInput.type = 'file';
    this.fileInput.accept = '.json,application/json';
    this.fileInput.hidden = true;
    this.fileInput.addEventListener('change', () => void this.readFile());
    document.body.appendChild(this.fileInput);
  }

  render() {
    this.list.replaceChildren();
    for (let slot = 0; slot < SLOTS; slot++) {
      const data = slot === this.ctx.active ? (this.ctx.flush(), loadGame(slot)) : loadGame(slot);
      this.list.appendChild(this.card(slot, data));
    }
  }

  private card(slot: number, data: SaveData | null): HTMLLIElement {
    const active = slot === this.ctx.active;
    const li = document.createElement('li');
    li.className = 'island-card' + (active ? ' active' : '') + (data ? '' : ' empty');

    const head = document.createElement('div');
    head.className = 'island-head';
    const name = document.createElement('strong');
    name.textContent = `Isla ${slot + 1}`;
    head.appendChild(name);
    if (active) {
      const badge = document.createElement('span');
      badge.className = 'island-badge';
      badge.textContent = 'Jugando ahora';
      head.appendChild(badge);
    }
    li.appendChild(head);

    const info = document.createElement('p');
    info.className = 'island-summary';
    if (data) {
      const fruit = BLOCKS[islandFruit(data.seed)].name.toLowerCase();
      const parts = [`Fruta: ${fruit}`, `${formatBerries(data.wallet ?? 0)} bayas`];
      if (data.savedAt) parts.push(`guardada el ${dateFormat.format(new Date(data.savedAt))}`);
      info.textContent = parts.join(' · ');
    } else {
      info.textContent = active ? 'Isla nueva, aún sin guardar' : 'Hueco libre';
    }
    li.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'island-actions';
    if (!active) actions.appendChild(this.button(data ? 'Jugar aquí' : 'Crear isla aquí', 'primary', () => this.ctx.switchTo(slot)));
    if (data) actions.appendChild(this.button('Guardar copia', '', () => this.download(slot, data)));
    actions.appendChild(this.button('Cargar copia', '', () => this.pickFile(slot)));
    if (data) {
      const confirming = this.confirming === slot;
      const label = confirming ? (active ? '¿Seguro? Empezarás una isla nueva' : '¿Seguro? Pulsa otra vez') : 'Borrar';
      actions.appendChild(this.button(label, 'danger', () => this.remove(slot)));
    }
    li.appendChild(actions);
    return li;
  }

  private button(text: string, kind: string, onClick: () => void) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `island-btn ${kind}`.trim();
    b.textContent = text;
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    return b;
  }

  private download(slot: number, data: SaveData) {
    const url = URL.createObjectURL(new Blob([exportSave(data)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = backupName(slot);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.ctx.toast('Copia guardada en tus descargas');
  }

  private pickFile(slot: number) {
    this.importSlot = slot;
    this.fileInput.value = '';
    this.fileInput.click();
  }

  private async readFile() {
    const file = this.fileInput.files?.[0];
    if (!file) return;
    const slot = this.importSlot;
    let data: SaveData;
    try {
      data = importSave(await file.text());
    } catch (e) {
      this.ctx.toast((e as Error).message);
      return;
    }
    if (slot === this.ctx.active) {
      // La isla en curso se sustituye entera: se carga de nuevo.
      this.ctx.stopSaving();
      saveGame(data, slot);
      this.ctx.switchTo(slot);
      return;
    }
    saveGame(data, slot);
    this.ctx.toast(`Copia cargada en la isla ${slot + 1}`);
    this.render();
  }

  private remove(slot: number) {
    if (this.confirming !== slot) {
      this.confirming = slot;
      this.render();
      return;
    }
    this.confirming = null;
    if (slot === this.ctx.active) {
      this.ctx.stopSaving();
      deleteGame(slot);
      this.ctx.switchTo(slot);
      return;
    }
    deleteGame(slot);
    this.ctx.toast(`Isla ${slot + 1} borrada`);
    this.render();
  }

  /** Al salir de la pantalla se olvida cualquier "¿Seguro?" pendiente. */
  reset() {
    this.confirming = null;
  }
}
