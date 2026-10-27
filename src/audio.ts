// Música y sonidos hechos con el sintetizador del navegador: no hace falta ningún archivo.
// La música cambia cada hora, como en Animal Crossing: alegre por la mañana, tranquila de noche.
// Y cada estación le da su aire: el verano más animado, el invierno lento y con campanillas.

const KEY = 'maxycraft.sonido';

export type Material = 'hierba' | 'arena' | 'piedra' | 'madera' | 'nieve' | 'plantas';
export type Season = 'primavera' | 'verano' | 'otoño' | 'invierno';

const PENTA_MAJOR = [0, 2, 4, 7, 9];
const PENTA_MINOR = [0, 3, 5, 7, 10];

/** Cómo suena cada hora del día. */
function hourStyle(hour: number) {
  if (hour >= 5 && hour < 10) return { tempo: 104, scale: PENTA_MAJOR, wave: 'triangle' as OscillatorType, hat: true, bright: 1 };
  if (hour >= 10 && hour < 17) return { tempo: 112, scale: PENTA_MAJOR, wave: 'square' as OscillatorType, hat: true, bright: 0.8 };
  if (hour >= 17 && hour < 21) return { tempo: 92, scale: PENTA_MAJOR, wave: 'triangle' as OscillatorType, hat: false, bright: 0.7 };
  return { tempo: 72, scale: PENTA_MINOR, wave: 'sine' as OscillatorType, hat: false, bright: 0.5 };
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface Note {
  step: number;
  /** Semitonos sobre la tónica. */
  pitch: number;
  len: number;
}

/** Cómo cambia la música con la estación: velocidad, tono y si suenan campanillas. */
export const SEASON_STYLE: Record<Season, { tempo: number; transpose: number; bells: boolean; hat: boolean | null; wave: OscillatorType | null }> = {
  primavera: { tempo: 4, transpose: 2, bells: false, hat: null, wave: null },
  verano: { tempo: 10, transpose: 0, bells: false, hat: true, wave: null },
  'otoño': { tempo: -8, transpose: -3, bells: false, hat: false, wave: 'triangle' },
  invierno: { tempo: -14, transpose: -1, bells: true, hat: false, wave: 'sine' },
};

/** Una canción de 8 compases que se repite durante toda la hora. */
export function compose(hour: number, seed: number, season: Season = 'verano') {
  const seasonIndex = ['primavera', 'verano', 'otoño', 'invierno'].indexOf(season);
  const r = rng(seed * 31 + hour * 977 + seasonIndex * 7919);
  const base = hourStyle(hour);
  const sty = SEASON_STYLE[season];
  // De noche la música siempre es tranquila: la estación no le pone platillos.
  const night = hour < 5 || hour >= 21;
  const style = {
    ...base,
    tempo: base.tempo + sty.tempo,
    wave: sty.wave && !night ? sty.wave : base.wave,
    hat: night ? false : (sty.hat ?? base.hat),
    bells: sty.bells,
  };
  const root = 57 + Math.floor(r() * 7) + sty.transpose; // de La3 a Mi4 (MIDI), movido según la estación
  const melody: Note[] = [];
  let degree = 5;
  for (let step = 0; step < 64; step++) {
    if (r() < (step % 2 === 0 ? 0.28 : 0.6)) continue; // silencios, más en los contratiempos
    degree = Math.max(0, Math.min(9, degree + Math.round((r() - 0.5) * 4)));
    const octave = Math.floor(degree / 5);
    const pitch = style.scale[degree % 5] + octave * 12;
    melody.push({ step, pitch, len: r() < 0.3 ? 2 : 1 });
  }
  // Bajo: tónica, cuarta, quinta y tónica, un compás cada una.
  const progression = [0, 5, 7, 0, 9, 5, 7, 0].map((n) => (style.scale === PENTA_MINOR && n === 9 ? 8 : n));
  return { style, root, melody, progression };
}

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export class Sound {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private sfx!: GainNode;
  private rain: GainNode | null = null;
  private noise!: AudioBuffer;
  private song: ReturnType<typeof compose> | null = null;
  private songHour = -1;
  private hour = 12;
  /** Estación de la partida; cambia la música. */
  season: Season = 'verano';
  private nextStep = 0;
  private stepTime = 0;
  /** Volumen elegido en las opciones, de 0 a 1. */
  private musicVolume = 1;
  private sfxVolume = 1;
  private rainAmount = 0;
  enabled: boolean;

  constructor(private seed: number) {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {
      // sin almacenamiento: con sonido
    }
    this.enabled = saved !== 'no';
  }

  /** El navegador solo deja sonar después de que el jugador toque algo, así que se arranca en el primer clic. */
  start() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.enabled ? 1 : 0;
    this.master.connect(this.ctx.destination);
    this.music = this.ctx.createGain();
    this.music.gain.value = this.musicGain;
    this.music.connect(this.master);
    this.sfx = this.ctx.createGain();
    this.sfx.gain.value = 0.5 * this.sfxVolume;
    this.sfx.connect(this.master);
    this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.stepTime = this.ctx.currentTime + 0.2;
    window.setInterval(() => this.schedule(), 100);
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem(KEY, this.enabled ? 'si' : 'no');
    } catch {
      // no se recuerda, pero funciona
    }
    if (this.ctx) this.master.gain.setTargetAtTime(this.enabled ? 1 : 0, this.ctx.currentTime, 0.05);
    return this.enabled;
  }

  /** Volúmenes de música y efectos, de 0 a 1. */
  setVolumes(music: number, sfx: number) {
    this.musicVolume = music;
    this.sfxVolume = sfx;
    if (!this.ctx) return;
    this.music.gain.setTargetAtTime(this.musicGain, this.ctx.currentTime, 0.05);
    this.sfx.gain.setTargetAtTime(0.5 * sfx, this.ctx.currentTime, 0.05);
  }

  /** Con lluvia la música baja un poco para que se oiga. */
  private get musicGain() {
    return 0.16 * this.musicVolume * (1 - this.rainAmount * 0.4);
  }

  setHour(hour: number) {
    this.hour = Math.floor(hour);
  }

  // --- Música ---

  private schedule() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    // Si la pestaña estuvo parada, no se intenta recuperar lo perdido.
    if (this.stepTime < ctx.currentTime - 0.5) this.stepTime = ctx.currentTime + 0.05;
    while (this.stepTime < ctx.currentTime + 0.35) {
      // La canción cambia al empezar la vuelta, para que no se corte a mitad de frase.
      if (this.nextStep === 0 && this.songHour !== this.hour) {
        this.song = compose(this.hour, this.seed, this.season);
        this.songHour = this.hour;
      }
      this.playStep(this.nextStep, this.stepTime);
      const song = this.song!;
      this.stepTime += 60 / song.style.tempo / 2;
      this.nextStep = (this.nextStep + 1) % 64;
    }
  }

  private playStep(step: number, t: number) {
    const song = this.song!;
    const beat = 60 / song.style.tempo / 2;
    for (const n of song.melody) {
      if (n.step !== step) continue;
      this.tone(midi(song.root + n.pitch + 12), t, beat * n.len * 0.9, song.style.wave, 0.22 * song.style.bright, this.music);
      // Campanillas de invierno: la misma nota dos octavas más arriba, cortita, en los tiempos fuertes.
      if (song.style.bells && step % 4 === 0) this.tone(midi(song.root + n.pitch + 36), t, beat * 2.5, 'sine', 0.07, this.music);
    }
    if (step % 8 === 0 || step % 8 === 4) {
      const bass = song.root - 12 + song.progression[Math.floor(step / 8)];
      this.tone(midi(bass), t, beat * 3.5, 'triangle', 0.4, this.music);
    }
    if (song.style.hat && step % 2 === 1) this.hiss(t, 0.03, 0.05, 7000, this.music);
  }

  private tone(freq: number, t: number, len: number, wave: OscillatorType, vol: number, out: AudioNode, slideTo?: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + len);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + len + 0.05);
  }

  private hiss(t: number, len: number, vol: number, freq: number, out: AudioNode, type: BiquadFilterType = 'highpass') {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + len + 0.05);
  }

  // --- Efectos ---

  private get now() {
    return this.ctx?.state === 'running' ? this.ctx.currentTime : -1;
  }

  /** Romper un bloque: un golpe seco que suena distinto según el material. */
  dig(material: Material) {
    const t = this.now;
    if (t < 0) return;
    const freq = { hierba: 900, arena: 1400, piedra: 500, madera: 350, nieve: 600, plantas: 2400 }[material];
    this.hiss(t, 0.12, 0.6, freq, this.sfx, 'bandpass');
    if (material === 'madera' || material === 'piedra') this.tone(freq / 3, t, 0.08, 'square', 0.15, this.sfx);
  }

  place() {
    const t = this.now;
    if (t < 0) return;
    this.tone(160, t, 0.08, 'triangle', 0.5, this.sfx, 90);
    this.hiss(t, 0.05, 0.3, 1200, this.sfx, 'bandpass');
  }

  step(material: Material) {
    const t = this.now;
    if (t < 0) return;
    if (material === 'nieve') {
      // Crujido: más grave y largo, con un segundo golpecito.
      this.hiss(t, 0.1, 0.22, 450, this.sfx, 'lowpass');
      this.hiss(t + 0.05, 0.06, 0.12, 900, this.sfx, 'bandpass');
      return;
    }
    const freq = { hierba: 700, arena: 1100, piedra: 1800, madera: 500, plantas: 3200 }[material];
    this.hiss(t, material === 'plantas' ? 0.1 : 0.06, material === 'plantas' ? 0.12 : 0.18, freq, this.sfx, 'bandpass');
  }

  /** Brazada al nadar. */
  swim() {
    const t = this.now;
    if (t < 0) return;
    this.hiss(t, 0.3, 0.3, 700, this.sfx, 'lowpass');
    this.hiss(t + 0.08, 0.15, 0.1, 1600, this.sfx, 'bandpass');
  }

  pickup() {
    const t = this.now;
    if (t < 0) return;
    this.tone(880, t, 0.07, 'square', 0.12, this.sfx);
    this.tone(1320, t + 0.06, 0.09, 'square', 0.12, this.sfx);
  }

  rustle() {
    const t = this.now;
    if (t < 0) return;
    for (let i = 0; i < 3; i++) this.hiss(t + i * 0.07, 0.12, 0.35, 2500 + i * 600, this.sfx, 'bandpass');
  }

  coin() {
    const t = this.now;
    if (t < 0) return;
    this.tone(1046, t, 0.08, 'square', 0.12, this.sfx);
    this.tone(1568, t + 0.07, 0.2, 'square', 0.12, this.sfx);
  }

  splash() {
    const t = this.now;
    if (t < 0) return;
    this.hiss(t, 0.35, 0.6, 900, this.sfx, 'lowpass');
    this.tone(500, t, 0.15, 'sine', 0.2, this.sfx, 200);
  }

  /** Chisporroteo de la lava al apagarse con agua (v4.20). */
  sizzle() {
    const t = this.now;
    if (t < 0) return;
    this.hiss(t, 0.5, 0.5, 2400, this.sfx, 'highpass');
  }

  /** Fanfarria al pescar o atrapar algo. */
  fanfare() {
    const t = this.now;
    if (t < 0) return;
    [0, 4, 7, 12].forEach((n, i) => this.tone(midi(72 + n), t + i * 0.09, i === 3 ? 0.4 : 0.12, 'square', 0.12, this.sfx));
  }

  /** Hacerse daño (v4.1): un golpe sordo y un quejido corto. */
  hurt() {
    const t = this.now;
    if (t < 0) return;
    this.hiss(t, 0.12, 0.5, 400, this.sfx, 'lowpass');
    this.tone(330, t, 0.16, 'square', 0.12, this.sfx, 180);
  }

  /** Comer: tres mordiscos. */
  eat() {
    const t = this.now;
    if (t < 0) return;
    for (let i = 0; i < 3; i++) this.hiss(t + i * 0.12, 0.07, 0.35, 1800 - i * 200, this.sfx, 'bandpass');
  }

  click() {
    const t = this.now;
    if (t < 0) return;
    this.tone(660, t, 0.04, 'triangle', 0.2, this.sfx);
  }

  /** La voz de los vecinos: pitidos cortos al ir saliendo el texto, más agudos o graves según quién hable. */
  voice(pitch: number) {
    const t = this.now;
    if (t < 0) return;
    this.tone(pitch * (0.85 + Math.random() * 0.3), t, 0.05, 'square', 0.06, this.sfx);
  }

  /** Lluvia de fondo: ruido suave que entra y sale con el tiempo. */
  setRain(amount: number) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    if (!this.rain) {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1800;
      this.rain = ctx.createGain();
      this.rain.gain.value = 0;
      src.connect(f).connect(this.rain).connect(this.sfx);
      src.start();
    }
    this.rainAmount = amount;
    // La lluvia va con los efectos, que ya llevan su volumen (0,5).
    this.rain.gain.setTargetAtTime(amount * 0.24, ctx.currentTime, 0.5);
    this.music.gain.setTargetAtTime(this.musicGain, ctx.currentTime, 0.5);
  }
}

export function materialOf(name: string): Material {
  if (/arena|tierra|hierba|hojas|flor|tulip|pensam|cosmos/i.test(name)) return name.match(/arena/i) ? 'arena' : 'hierba';
  if (/tronco|tabl|madera|valla|mesa|lona/i.test(name)) return 'madera';
  return 'piedra';
}
