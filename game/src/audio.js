// Every sound is synthesised with WebAudio: no audio files, no network. The context
// is created on the first user gesture (a click or a key), so autoplay rules never
// block it; in a screenshot run it simply stays silent.

export function createAudio() {
  let context = null;
  let master = null;
  let drone = null;
  let muted = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume().catch(() => {});
      return context;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(context.destination);
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, dur, type, vol, slideTo) {
    const ctx = ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), now + dur);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  function noise(dur, vol, lowpass) {
    const ctx = ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(now);
  }

  return {
    /** Call from any user gesture so the context is allowed to start. */
    unlock() {
      ensure();
    },
    setMuted(value) {
      muted = value;
      if (master && context) master.gain.value = muted ? 0 : 0.5;
    },
    isMuted() {
      return muted;
    },
    shoot() {
      tone(880, 0.09, 'square', 0.08, 220);
    },
    hit() {
      noise(0.08, 0.12, 900);
      tone(160, 0.08, 'triangle', 0.1, 70);
    },
    enemyDie() {
      noise(0.18, 0.16, 1400);
      tone(320, 0.2, 'sawtooth', 0.07, 60);
    },
    pickupEmber() {
      tone(660, 0.12, 'sine', 0.12, 990);
    },
    pickupHeart() {
      tone(523, 0.14, 'sine', 0.12);
      tone(784, 0.2, 'sine', 0.12);
    },
    pickupPrism() {
      tone(440, 0.1, 'sine', 0.1, 660);
      tone(660, 0.12, 'sine', 0.1, 880);
      tone(880, 0.16, 'sine', 0.1, 1320);
    },
    hurt() {
      tone(110, 0.3, 'sawtooth', 0.18, 55);
      noise(0.2, 0.14, 500);
    },
    waveHorn() {
      tone(196, 0.5, 'triangle', 0.14, 294);
      tone(294, 0.5, 'triangle', 0.1, 392);
    },
    bossRoar() {
      tone(70, 0.8, 'sawtooth', 0.2, 45);
      noise(0.7, 0.16, 300);
    },
    gameOver() {
      tone(220, 0.9, 'triangle', 0.14, 55);
      tone(110, 1.2, 'sine', 0.12, 40);
    },
    victory() {
      [523, 659, 784, 1047].forEach((freq, i) => {
        setTimeout(() => tone(freq, 0.35, 'sine', 0.12), i * 130);
      });
    },
    uiClick() {
      tone(1200, 0.05, 'sine', 0.06);
    },
    /** The low ambient drone that runs under play. */
    startDrone() {
      const ctx = ensure();
      if (!ctx || drone) return;
      const gain = ctx.createGain();
      gain.gain.value = 0.035;
      gain.connect(master);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 220;
      filter.connect(gain);
      const oscA = ctx.createOscillator();
      oscA.type = 'sine';
      oscA.frequency.value = 55;
      const oscB = ctx.createOscillator();
      oscB.type = 'triangle';
      oscB.frequency.value = 82.5;
      oscA.connect(filter);
      oscB.connect(filter);
      oscA.start();
      oscB.start();
      drone = { oscA, oscB, gain };
    },
    stopDrone() {
      if (!drone) return;
      try {
        drone.oscA.stop();
        drone.oscB.stop();
      } catch {
        // Already stopped.
      }
      drone = null;
    },
  };
}
