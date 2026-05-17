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
