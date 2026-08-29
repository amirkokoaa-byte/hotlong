// Web Audio API Synthesizer for VoIP Sound Effects (Ringback, Ringtone, DTMF, Chimes)

class SoundEffectsService {
  private ctx: AudioContext | null = null;
  private ringtoneInterval: number | null = null;
  private ringbackInterval: number | null = null;

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Play dual-tone ringback (Customer hearing "Ring... Ring..." when dialing agent)
  playRingbackTone(): void {
    this.stopRingbackTone();
    const playBurst = () => {
      try {
        const ctx = this.getContext();
        const now = ctx.currentTime;
        
        // 440Hz + 480Hz dual tone (standard North American / VoIP ringback)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);
        osc1.type = 'sine';
        osc2.type = 'sine';

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
        gain.gain.setValueAtTime(0.08, now + 1.8);
        gain.gain.linearRampToValueAtTime(0, now + 2.0);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 2.0);
        osc2.stop(now + 2.0);
      } catch {
        // audio context not yet allowed by user gesture
      }
    };

    playBurst();
    this.ringbackInterval = window.setInterval(playBurst, 4000);
  }

  stopRingbackTone(): void {
    if (this.ringbackInterval) {
      clearInterval(this.ringbackInterval);
      this.ringbackInterval = null;
    }
  }

  // Play ringing sound for incoming call on Agent Dashboard (like modern VoIP phone)
  playIncomingRingtone(): void {
    this.stopIncomingRingtone();
    const playCycle = () => {
      try {
        const ctx = this.getContext();
        const now = ctx.currentTime;

        const playTone = (freq: number, start: number, duration: number, vol = 0.12) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);
          
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(vol, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + duration);
        };

        // Ring 1 (Two melodious chords)
        playTone(784, now, 0.4); // G5
        playTone(1046.5, now + 0.1, 0.5); // C6
        
        playTone(880, now + 0.6, 0.4); // A5
        playTone(1174.6, now + 0.7, 0.6); // D6

        // Ring 2
        playTone(784, now + 1.4, 0.4);
        playTone(1046.5, now + 1.5, 0.5);
      } catch {
        // audio context suspended
      }
    };

    playCycle();
    this.ringtoneInterval = window.setInterval(playCycle, 3200);
  }

  stopIncomingRingtone(): void {
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }

  // Chime when call is successfully connected
  playCallConnected(): void {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.35);
      });
    } catch {}
  }

  // Sound when call ends / is disconnected
  playCallEnded(): void {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const notes = [783.99, 587.33, 440]; // G5 -> D5 -> A4 descending
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.25);
      });
    } catch {}
  }

  // Subtle chat message alert
  playMessageBeep(): void {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.1);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
  }

  // DTMF keypad beep
  playDtmfKey(key: string): void {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const dtmfFreqs: Record<string, [number, number]> = {
        '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
        '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
        '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
        '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
      };

      const freqs = dtmfFreqs[key] || [800, 1200];
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.setValueAtTime(freqs[0], now);
      osc2.frequency.setValueAtTime(freqs[1], now);
      osc1.type = 'sine';
      osc2.type = 'sine';

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.18);
      osc2.stop(now + 0.18);
    } catch {}
  }

  stopAll(): void {
    this.stopRingbackTone();
    this.stopIncomingRingtone();
  }
}

export const soundEffects = new SoundEffectsService();
