/**
 * Zero-dependency Web Audio API procedural sound synthesizer for DripWatch IoT system.
 * Generates piezo buzzer alert pulses and liquid drip droplets.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private buzzerOsc: OscillatorNode | null = null;
  private buzzerGain: GainNode | null = null;
  private buzzerTimer: number | null = null;
  private enabled: boolean = true;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (!val) {
      this.stopBuzzer();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public playDripSound(fluidType: 'coolant' | 'oil' = 'coolant') {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const now = this.ctx.currentTime;
      // Coolant has crisp high drop plink, oil has lower viscous drip sound
      const startFreq = fluidType === 'coolant' ? 1200 : 680;
      const endFreq = fluidType === 'coolant' ? 600 : 380;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.08);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Audio autoplay policy catch
    }
  }

  public playBuzzerSound() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(2400, now);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
  }

  public startBuzzerAlert() {
    if (!this.enabled || this.buzzerTimer) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const playBeep = () => {
        this.playBuzzerSound();
      };

      playBeep();
      this.buzzerTimer = window.setInterval(playBeep, 450);
    } catch {}
  }

  public stopBuzzer() {
    if (this.buzzerTimer) {
      clearInterval(this.buzzerTimer);
      this.buzzerTimer = null;
    }
  }

  public playClickSound() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.03);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch {}
  }
}

export const soundEngine = new SoundEngine();
