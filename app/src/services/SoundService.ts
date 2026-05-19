import { Platform } from 'react-native';
import { createAudioPlayer, AudioPlayer, setAudioModeAsync } from 'expo-audio';

// ─────────────────────────────────────────────────────────────────────────────
// SoundService
//   SFX   → Web Audio API oscillators (zero files, instant)
//   Music → expo-audio AudioPlayer  (real MP3 files, looped)
// ─────────────────────────────────────────────────────────────────────────────
class SoundService {
  // ── SFX ────────────────────────────────────────────────────────────────────
  private ctx: AudioContext | null = null;
  private sfxEnabled = true;

  private getCtx(): AudioContext | null {
    if (Platform.OS !== 'web') return null;
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch { return null; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  setEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
    if (!enabled) this.stopMusic();
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainVal = 0.4,
    startDelay = 0
  ) {
    if (!this.sfxEnabled) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime + startDelay);
    gain.gain.setValueAtTime(0, ctx.currentTime + startDelay);
    gain.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + startDelay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + duration);
    osc.start(ctx.currentTime + startDelay);
    osc.stop(ctx.currentTime + startDelay + duration + 0.01);
  }

  // ── Chiptune helpers (sweeps + noise bursts) ────────────────────────────────
  private playSweep(
    fromHz: number,
    toHz: number,
    duration: number,
    type: OscillatorType = 'square',
    gainVal = 0.3,
    startDelay = 0,
  ) {
    if (!this.sfxEnabled) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(fromHz, ctx.currentTime + startDelay);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(1, toHz),
      ctx.currentTime + startDelay + duration,
    );
    gain.gain.setValueAtTime(0, ctx.currentTime + startDelay);
    gain.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + startDelay + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + startDelay);
    osc.stop(ctx.currentTime + startDelay + duration + 0.01);
  }

  private playNoise(
    duration: number,
    gainVal = 0.3,
    lowpassHz?: number,
    startDelay = 0,
  ) {
    if (!this.sfxEnabled) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    const sampleRate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(duration * sampleRate));
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime + startDelay);
    gain.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + startDelay + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + duration);

    if (lowpassHz !== undefined) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpassHz;
      src.connect(filter);
      filter.connect(gain);
    } else {
      src.connect(gain);
    }
    gain.connect(ctx.destination);

    src.start(ctx.currentTime + startDelay);
    src.stop(ctx.currentTime + startDelay + duration + 0.01);
  }

  // Per-SFX rate limiter so spammy events (every projectile hit) don't drown the mix
  private lastSfx: Record<string, number> = {};
  private throttle(key: string, ms: number): boolean {
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if ((this.lastSfx[key] ?? 0) + ms > now) return false;
    this.lastSfx[key] = now;
    return true;
  }

  correct() {
    this.playTone(660, 0.12, 'sine', 0.35, 0);
    this.playTone(880, 0.18, 'sine', 0.3, 0.1);
  }

  wrong() {
    this.playTone(220, 0.08, 'sawtooth', 0.3, 0);
    this.playTone(160, 0.15, 'sawtooth', 0.25, 0.08);
  }

  combo(_level: number) {
    this._playMp3Sfx('combo');
  }

  timerTick() {
    this.playTone(1200, 0.04, 'square', 0.15, 0);
  }

  gameOver() {
    this.playTone(330, 0.25, 'sine', 0.3, 0);
    this.playTone(277, 0.3, 'sine', 0.25, 0.15);
    this.playTone(220, 0.4, 'sine', 0.3, 0.3);
  }

  buttonTap() {
    this.playTone(800, 0.06, 'sine', 0.2, 0);
  }

  powerUp() {
    [500, 700, 900, 1100].forEach((f, i) => this.playTone(f, 0.08, 'sine', 0.25, i * 0.06));
  }

  // Two low thumps — used by Galactic Battle for low-HP heartbeat panic loop.
  heartbeat() {
    this.playTone(58, 0.10, 'sine', 0.45, 0);
    this.playTone(46, 0.14, 'sine', 0.35, 0.10);
  }

  // Short freeze "thunk" — paired with hitstop frames so big hits feel weighty.
  hitstop() {
    this.playTone(110, 0.05, 'square', 0.25, 0);
    this.playTone(80,  0.07, 'sine',  0.25, 0.02);
  }

  // ── RETRO SFX kit — used by Galactic Battle Mode only ─────────────────────
  // Other modes still call the originals above (correct/wrong/buttonTap/etc.)
  // so their feel is untouched.

  // Player laser shot — fast square pew with downward pitch sweep.
  laserShoot() {
    if (!this.throttle('laser', 35)) return;
    this.playSweep(1200, 600, 0.06, 'square', 0.22);
  }

  // Generic enemy hit — soft noise tick + low sawtooth thump. Throttled.
  enemyHit() {
    if (!this.throttle('enemyHit', 45)) return;
    this.playNoise(0.04, 0.14, 1200);
    this.playTone(220, 0.05, 'sawtooth', 0.16, 0);
  }

  // Critical-hit ping — bright triangle stab + overtone.
  crit() {
    this.playTone(1800, 0.09, 'triangle', 0.32, 0);
    this.playTone(2400, 0.07, 'triangle', 0.22, 0.02);
  }

  // Gold pickup / score bonus — classic two-note "ka-ching".
  coinGet() {
    this.playTone(1000, 0.06, 'square', 0.28, 0);
    this.playTone(1600, 0.10, 'square', 0.24, 0.06);
  }

  // Boss intro roar — detuned sawtooth pair sweeping down + noise wash.
  bossRoar() {
    this.playSweep(180, 65, 0.55, 'sawtooth', 0.40);
    this.playSweep(190, 70, 0.55, 'sawtooth', 0.30, 0.005);
    this.playNoise(0.45, 0.18, 500, 0.05);
  }

  // Boss death — big down-sweep, noise, then triumphant chord stab.
  bossDeath() {
    this.playSweep(800, 60, 0.80, 'sawtooth', 0.42);
    this.playNoise(0.70, 0.32, 800);
    // C major chord stab after the explosion finishes
    [523, 659, 784, 1047].forEach((f) =>
      this.playTone(f, 0.30, 'square', 0.22, 0.65),
    );
  }

  // Boss phase break — distorted warning chord that snaps down.
  phaseBreak() {
    this.playSweep(440, 220, 0.22, 'sawtooth', 0.34);
    this.playSweep(880, 220, 0.22, 'sawtooth', 0.22, 0.01);
  }

  // Player damage taken — visceral square stab + crunchy noise burst.
  damage() {
    if (!this.throttle('damage', 90)) return;
    this.playTone(120, 0.10, 'square', 0.40, 0);
    this.playNoise(0.10, 0.30, 600);
  }

  // EMP burst — descending sawtooth + wide noise wash.
  empBurst() {
    this.playSweep(2000, 80, 0.40, 'sawtooth', 0.35);
    this.playNoise(0.30, 0.25, 2000);
  }

  // Missile launch — rising square sweep + low rumble.
  missileLaunch() {
    this.playSweep(200, 1500, 0.25, 'square', 0.30);
    this.playNoise(0.22, 0.18, 600);
  }

  // Repair / heal — bright ascending arpeggio.
  repairChime() {
    [659, 784, 988].forEach((f, i) => this.playTone(f, 0.10, 'triangle', 0.28, i * 0.06));
  }

  // Shield drone deploy — synthy down-up "boop".
  droneDeploy() {
    this.playSweep(440, 880, 0.18, 'triangle', 0.30);
    this.playTone(1320, 0.10, 'square', 0.20, 0.18);
  }

  // Card-pick fanfare — 3-note major arpeggio.
  cardPick() {
    [523, 659, 784].forEach((f, i) => this.playTone(f, 0.12, 'square', 0.28, i * 0.08));
  }

  // Stage clear — 4-note ascending pentatonic jingle.
  stageClear() {
    [523, 587, 659, 880].forEach((f, i) => this.playTone(f, 0.14, 'square', 0.30, i * 0.10));
  }

  // Fever-mode trigger — power-up cascade for galactic.
  feverRoar() {
    this.playSweep(220, 1100, 0.30, 'sawtooth', 0.32);
    [880, 1100, 1320].forEach((f, i) => this.playTone(f, 0.16, 'square', 0.24, 0.10 + i * 0.05));
  }

  // ── MP3 SFX players ────────────────────────────────────────────────────────
  private sfxPlayers: Partial<Record<'combo', AudioPlayer>> = {};

  private _playMp3Sfx(name: 'combo') {
    try {
      if (!this.sfxPlayers[name]) {
        const sources: Record<'combo', number> = {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          combo: require('../../assets/sounds/combo-aacumulate.mp3'),
        };
        const player = createAudioPlayer(sources[name]);
        player.volume = 0.75;
        player.loop = false;
        this.sfxPlayers[name] = player;
      }
      const player = this.sfxPlayers[name]!;
      player.seekTo(0);
      player.play();
    } catch { /* silent fail — use no sound if asset missing */ }
  }

  // ── BACKGROUND MUSIC (expo-audio) ──────────────────────────────────────────
  private homePlayer: AudioPlayer | null = null;
  private gamePlayer: AudioPlayer | null = null;
  private currentTrack: 'home' | 'game' | null = null;
  private musicGeneration = 0;
  private musicVolume = 0.5;

  playHomeMusic() {
    if (this.currentTrack === 'home') return;
    const gen = ++this.musicGeneration;
    this._stopActivePlayers();
    this.currentTrack = 'home';
    this._startPlayer('home', gen);
  }

  playGameMusic() {
    if (this.currentTrack === 'game') return;
    const gen = ++this.musicGeneration;
    this._stopActivePlayers();
    this.currentTrack = 'game';
    this._startPlayer('game', gen);
  }

  private async _startPlayer(track: 'home' | 'game', gen: number) {
    try {
      await setAudioModeAsync({ playsInSilentModeIOS: true });

      if (gen !== this.musicGeneration) return;

      let player: AudioPlayer;

      if (track === 'home') {
        if (!this.homePlayer) {
          this.homePlayer = createAudioPlayer(
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require('../../assets/sounds/landing page.mp3')
          );
        }
        player = this.homePlayer;
      } else {
        if (!this.gamePlayer) {
          this.gamePlayer = createAudioPlayer(
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require('../../assets/sounds/in-game-background.mp3')
          );
        }
        player = this.gamePlayer;
      }

      if (gen !== this.musicGeneration) return;

      player.volume = this.musicVolume;
      player.loop = true;
      player.seekTo(0);
      player.play();
    } catch { /* silent fail */ }
  }

  private _stopActivePlayers() {
    try { this.homePlayer?.pause(); } catch {}
    try { this.gamePlayer?.pause(); } catch {}
  }

  stopMusic(fadeMs = 600) {
    this.musicGeneration++;
    this.currentTrack = null;
    setTimeout(() => { this._stopActivePlayers(); }, fadeMs);
  }

  setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.homePlayer) this.homePlayer.volume = this.musicVolume;
    if (this.gamePlayer) this.gamePlayer.volume = this.musicVolume;
  }
}

export const sound = new SoundService();
