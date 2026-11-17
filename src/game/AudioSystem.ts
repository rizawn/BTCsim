/**
 * AudioSystem — procedural Web Audio API synthesizer for SFX and era ambience.
 * Zero external audio file dependencies.
 *
 * Supported sounds:
 * - epoch_tick: pitch ascends per epoch
 * - block_found: celebratory chime + sub-bass
 * - fan_hum: continuous oscillator pitch scaled by heat
 * - heist_clack: metallic click
 * - coin_split: metallic halving split
 * - verify_chime: rising two-tone chime
 */

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private fanOsc: OscillatorNode | null = null;
  private fanGain: GainNode | null = null;

  private isMuted = false;
  private sfxVolume = 0.7;
  private musicVolume = 0.5;

  init(): void {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.masterGain);

      // Setup continuous fan hum loop
      this.setupFanHum();
    } catch {
      // Audio not supported in headless environments
    }
  }

  private setupFanHum(): void {
    if (!this.ctx || !this.sfxGain) return;
    try {
      this.fanOsc = this.ctx.createOscillator();
      this.fanGain = this.ctx.createGain();
      this.fanOsc.type = 'triangle';
      this.fanOsc.frequency.setValueAtTime(60, this.ctx.currentTime); // Low hum
      this.fanGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      this.fanOsc.connect(this.fanGain);
      this.fanGain.connect(this.sfxGain);
      this.fanOsc.start();
    } catch {
      // Ignore
    }
  }

  playEpochTick(epochNumber: number): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const baseFreq = 440 + Math.min(600, epochNumber * 4);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch {}
  }

  playBlockFound(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      // High chime
      const chime = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(880, t);
      chime.frequency.exponentialRampToValueAtTime(1760, t + 0.3);
      chimeGain.gain.setValueAtTime(0.3, t);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      chime.connect(chimeGain);
      chimeGain.connect(this.sfxGain);
      chime.start(t);
      chime.stop(t + 0.6);

      // Sub-bass
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'triangle';
      sub.frequency.setValueAtTime(110, t);
      sub.frequency.exponentialRampToValueAtTime(55, t + 0.4);
      subGain.gain.setValueAtTime(0.4, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      sub.connect(subGain);
      subGain.connect(this.sfxGain);
      sub.start(t);
      sub.stop(t + 0.5);
    } catch {}
  }

  playHeistClack(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(120, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.04);
    } catch {}
  }

  playCoinSplit(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(150, t + 0.4);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.5);
    } catch {}
  }

  updateFanPitch(heatLevel: number): void {
    if (!this.ctx || !this.fanOsc || !this.fanGain || this.isMuted) return;
    try {
      // As heat rises 0 -> 1, fan pitch rises 60 Hz -> 240 Hz
      const targetFreq = 60 + heatLevel * 180;
      this.fanOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
      const targetVol = 0.02 + heatLevel * 0.08;
      this.fanGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.1);
    } catch {}
  }

  setMute(mute: boolean): void {
    this.isMuted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(mute ? 0 : 1, this.ctx.currentTime);
    }
  }

  toggleMute(): boolean {
    this.setMute(!this.isMuted);
    return this.isMuted;
  }
}

export const globalAudio = new AudioSystem();

