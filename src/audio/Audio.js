export class Audio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.musicPlaying = false;
    this.musicLayer = 1;
    this.musicTimer = null;
  }

  _ensureContext() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /** Layered procedural rally music: intensity grows with combo. */
  startMusic() {
    if (!this.enabled || this.musicPlaying) return;
    this._ensureContext();
    if (!this.ctx) return;
    if (!this.musicBus) {
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.5;
      this.musicBus.connect(this.ctx.destination);
    }
    this.musicPlaying = true;
    this.musicStep = 0;
    this.musicNextTime = this.ctx.currentTime + 0.1;
    this.musicTimer = setInterval(() => this._scheduleMusic(), 80);
  }

  stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
    this.musicPlaying = false;
  }

  setMusicIntensity(combo) {
    this.musicLayer = combo >= 15 ? 4 : combo >= 10 ? 3 : combo >= 5 ? 2 : 1;
  }

  _scheduleMusic() {
    if (!this.ctx || !this.musicPlaying) return;
    const stepDur = 60 / 128 / 2; // eighth notes at 128 BPM
    while (this.musicNextTime < this.ctx.currentTime + 0.4) {
      this._musicStep(this.musicStep, this.musicNextTime);
      this.musicNextTime += stepDur;
      this.musicStep = (this.musicStep + 1) % 32;
    }
  }

  _musicStep(step, t) {
    const layer = this.musicLayer || 1;
    const roots = [55, 55, 65.41, 49]; // A1 A1 C2 G1, one per bar
    const root = roots[Math.floor(step / 8) % 4];

    if (step % 4 === 0) this._musicNote(root, t, 'triangle', 0.22, 0.12);
    if (layer >= 2) {
      const arp = [2, 3, 4, 3][step % 4];
      this._musicNote(root * arp, t, 'square', 0.09, 0.035);
    }
    if (layer >= 3 && step % 2 === 1) this._musicHat(t);
    if (layer >= 4 && step % 8 === 2) {
      const lead = [4, 5, 6, 5][Math.floor(step / 8) % 4];
      this._musicNote(root * lead, t, 'sawtooth', 0.3, 0.04);
    }
  }

  _musicNote(freq, t, type, dur, vol) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.musicBus);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  _musicHat(t) {
    if (!this.noiseBuffer) {
      const len = Math.floor(this.ctx.sampleRate * 0.05);
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBus);
    src.start(t);
    src.stop(t + 0.05);
  }

  playPaddleHit(speed, combo = 0) {
    if (!this.enabled) return;
    this._ensureContext();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = 'sine';
    // Rally ramp: pitch climbs ~semitone-ish per hit, capped so it stays pleasant
    const comboStep = Math.min(combo, 16) * 22;
    osc.frequency.value = 200 + (speed / 40) * 400 + comboStep;
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playWallBounce() {
    if (!this.enabled) return;
    this._ensureContext();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = 'triangle';
    osc.frequency.value = 150;
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playNetGrazed() {
    if (!this.enabled) return;
    this._ensureContext();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(550, this.ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playScore(isPlayer) {
    if (!this.enabled) return;
    this._ensureContext();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = 'sine';
    if (isPlayer) {
      osc.frequency.setValueAtTime(400, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(800, this.ctx.currentTime + 0.2);
    } else {
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(300, this.ctx.currentTime + 0.2);
    }
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playComboMilestone(combo) {
    if (!this.enabled) return;
    this._ensureContext();
    if (!this.ctx) return;
    // Rising major arpeggio, pitch climbs with each milestone (5, 10, 15, ...)
    const milestone = Math.max(1, Math.floor(combo / 5));
    const root = 440 * Math.pow(2, Math.min(milestone - 1, 4) / 12);
    const intervals = [1, 1.25, 1.5, 2];
    intervals.forEach((ratio, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'square';
      osc.frequency.value = root * ratio;
      const t = this.ctx.currentTime + i * 0.06;
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  playPowerup(puType) {
    if (!this.enabled) return;
    this._ensureContext();
    if (!this.ctx) return;
    const freqs = {
      wide: [523, 784],
      shrink: [392, 262],
      slowmo: [660, 330, 165],
      double: [523, 523, 784],
      ghost: [880, 660, 494],
      freeze: [1400, 300],
    };
    const notes = freqs[puType] || [440];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = this.ctx.currentTime + i * 0.07;
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      osc.start(t);
      osc.stop(t + 0.12);
    });
  }

  playPaddleShift(mode) {
    if (!this.enabled) return;
    this._ensureContext();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = 'sawtooth';
    // shrink: downward sweep, grow: upward sweep
    const t0 = this.ctx.currentTime;
    if (mode === 'shrink') {
      osc.frequency.setValueAtTime(300, t0);
      osc.frequency.exponentialRampToValueAtTime(120, t0 + 0.15);
    } else {
      osc.frequency.setValueAtTime(150, t0);
      osc.frequency.exponentialRampToValueAtTime(380, t0 + 0.15);
    }
    gain.gain.setValueAtTime(0.1, t0);
    gain.gain.exponentialRampToValueAtTime(0.01, t0 + 0.15);
    osc.start(t0);
    osc.stop(t0 + 0.15);
  }

  playMultiBall() {
    if (!this.enabled) return;
    this._ensureContext();
    if (!this.ctx) return;
    // Quick rising double-blip signaling a second ball
    const notes = [660, 880, 1320];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'square';
      osc.frequency.value = freq;
      const t = this.ctx.currentTime + i * 0.05;
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      osc.start(t);
      osc.stop(t + 0.12);
    });
  }

  playWin() {
    if (!this.enabled) return;
    this._ensureContext();
    if (!this.ctx) return;
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = this.ctx.currentTime + i * 0.15;
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  playLose() {
    if (!this.enabled) return;
    this._ensureContext();
    if (!this.ctx) return;
    const notes = [400, 350, 300, 200];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = this.ctx.currentTime + i * 0.15;
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }
}
