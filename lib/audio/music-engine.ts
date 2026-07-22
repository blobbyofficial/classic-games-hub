/**
 * Procedural background-music engine (roadmap v1.3 "Background music tracks").
 *
 * Every track is composed in code and rendered live with the Web Audio API —
 * fully original, nothing to download or license, and a few hundred bytes per
 * track. Each track is a small pattern spec (tempo, chords, bass, lead,
 * percussion flags) played by a lookahead scheduler.
 */

type OscType = OscillatorType;

interface TrackSpec {
  bpm: number;
  /** Chord roots as semitone offsets from A2 (110 Hz). */
  chords: number[][];
  /** Bass pattern per beat (semitone offset or null for rest). */
  bass: (number | null)[];
  /** Lead notes per 8th (semitone offset above root octave, or null). */
  lead: (number | null)[];
  leadType: OscType;
  padType: OscType;
  bassType: OscType;
  hats: boolean;
  thump: boolean;
  padGain: number;
  leadGain: number;
  swing?: number;
}

const A2 = 110;
const st = (n: number) => A2 * Math.pow(2, n / 12);

export const TRACKS: Record<string, { name: string; spec: TrackSpec }> = {
  "neon-drift": {
    name: "Neon Drift",
    spec: {
      bpm: 84,
      chords: [
        [0, 3, 7, 10],
        [-4, 0, 3, 7],
        [-2, 2, 5, 8],
        [-5, -2, 3, 7],
      ],
      bass: [0, null, 0, 0, null, 0, null, 0],
      lead: [12, null, 15, null, 19, 17, null, 15, 12, null, 10, null, 12, null, null, null],
      leadType: "sawtooth",
      padType: "sawtooth",
      bassType: "sawtooth",
      hats: true,
      thump: true,
      padGain: 0.05,
      leadGain: 0.05,
    },
  },
  starlight: {
    name: "Starlight",
    spec: {
      bpm: 58,
      chords: [
        [0, 7, 14, 21],
        [-3, 4, 11, 16],
        [-5, 2, 9, 14],
        [-3, 4, 12, 19],
      ],
      bass: [0, null, null, null, null, null, null, null],
      lead: [24, null, null, 19, null, 21, null, null, 26, null, null, null, 24, null, null, null],
      leadType: "sine",
      padType: "triangle",
      bassType: "sine",
      hats: false,
      thump: false,
      padGain: 0.06,
      leadGain: 0.07,
    },
  },
  "arcade-heart": {
    name: "Arcade Heart",
    spec: {
      bpm: 128,
      chords: [
        [0, 4, 7],
        [5, 9, 12],
        [-2, 2, 5],
        [3, 7, 10],
      ],
      bass: [0, 0, 12, 0, 0, 0, 12, 0],
      lead: [12, 16, 19, 16, 12, null, 19, null, 17, 21, 24, 21, 17, null, 12, null],
      leadType: "square",
      padType: "triangle",
      bassType: "triangle",
      hats: true,
      thump: true,
      padGain: 0.03,
      leadGain: 0.045,
    },
  },
  "deep-focus": {
    name: "Deep Focus",
    spec: {
      bpm: 70,
      chords: [
        [0, 7, 12],
        [0, 7, 12],
        [-2, 5, 10],
        [-4, 3, 12],
      ],
      bass: [0, null, null, 0, null, null, 0, null],
      lead: [null, null, 12, null, null, null, null, 14, null, null, 12, null, null, null, null, null],
      leadType: "sine",
      padType: "sine",
      bassType: "sine",
      hats: false,
      thump: true,
      padGain: 0.05,
      leadGain: 0.05,
      swing: 0.02,
    },
  },
};

export class MusicEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextBarTime = 0;
  private bar = 0;
  private current: string | null = null;
  private _volume = 0.6;

  get playing(): string | null {
    return this.current;
  }

  get volume(): number {
    return this._volume;
  }

  setVolume(v: number) {
    this._volume = Math.min(1, Math.max(0, v));
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this._volume, this.ctx.currentTime, 0.05);
    }
  }

  /** Must be called from a user gesture (browser autoplay policy). */
  async play(slug: string): Promise<boolean> {
    const track = TRACKS[slug];
    if (!track) return false;
    this.stop();
    try {
      this.ctx = new AudioContext();
      await this.ctx.resume();
    } catch {
      return false;
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = this._volume;
    // Gentle master lowpass keeps everything warm at low volume.
    const soften = this.ctx.createBiquadFilter();
    soften.type = "lowpass";
    soften.frequency.value = 4200;
    this.master.connect(soften).connect(this.ctx.destination);

    this.current = slug;
    this.bar = 0;
    this.nextBarTime = this.ctx.currentTime + 0.06;
    const schedule = () => {
      if (!this.ctx) return;
      // Keep ~2 bars scheduled ahead.
      while (this.nextBarTime < this.ctx.currentTime + (60 / track.spec.bpm) * 8) {
        this.scheduleBar(track.spec, this.nextBarTime, this.bar);
        this.nextBarTime += (60 / track.spec.bpm) * 4;
        this.bar++;
      }
    };
    schedule();
    this.timer = setInterval(schedule, 400);
    return true;
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.current = null;
    if (this.ctx) {
      const ctx = this.ctx;
      this.master?.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
      setTimeout(() => void ctx.close().catch(() => undefined), 400);
    }
    this.ctx = null;
    this.master = null;
  }

  private note(freq: number, t: number, dur: number, type: OscType, gain: number, attack = 0.01) {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.setTargetAtTime(0, t + dur * 0.7, dur * 0.12);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.3);
  }

  private hat(t: number) {
    if (!this.ctx || !this.master) return;
    const len = 0.04;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    const g = this.ctx.createGain();
    g.gain.value = 0.05;
    src.connect(hp).connect(g).connect(this.master);
    src.start(t);
  }

  private thump(t: number) {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.16, t);
    g.gain.setTargetAtTime(0, t + 0.02, 0.06);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  private scheduleBar(spec: TrackSpec, barStart: number, bar: number) {
    const beat = 60 / spec.bpm;
    const eighth = beat / 2;
    const chord = spec.chords[bar % spec.chords.length];
    const root = chord[0];

    // Pad chord for the whole bar.
    for (const n of chord) {
      this.note(st(n) * 2, barStart, beat * 4, spec.padType, spec.padGain, 0.4);
    }
    // Bass per 8th.
    spec.bass.forEach((b, i) => {
      if (b === null) return;
      this.note(st(root + b) / 2, barStart + i * eighth, eighth * 0.9, spec.bassType, 0.09);
    });
    // Lead per 16th-ish (two bars of 8 events each alternate).
    const leadSlice = bar % 2 === 0 ? spec.lead.slice(0, 8) : spec.lead.slice(8, 16);
    leadSlice.forEach((n, i) => {
      if (n === null) return;
      const swing = spec.swing && i % 2 === 1 ? spec.swing : 0;
      this.note(st(root + n) * 2, barStart + i * eighth + swing, eighth * 1.6, spec.leadType, spec.leadGain, 0.02);
    });
    // Percussion.
    for (let i = 0; i < 4; i++) {
      if (spec.thump && (i === 0 || i === 2)) this.thump(barStart + i * beat);
      if (spec.hats) this.hat(barStart + i * beat + beat / 2);
    }
  }
}

export const musicEngine = typeof window !== "undefined" ? new MusicEngine() : null;
