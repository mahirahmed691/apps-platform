let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

async function ensureRunning(ctx: AudioContext): Promise<void> {
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
}

/** Soft chime when a CV section lands on the document. */
export async function playCaptureChime(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    await ensureRunning(ctx);

    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    master.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.18);
    osc.connect(master);
    osc.start(now);
    osc.stop(now + 0.5);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1320, now + 0.04);
    osc2.frequency.exponentialRampToValueAtTime(990, now + 0.22);
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.0001, now + 0.04);
    gain2.gain.exponentialRampToValueAtTime(0.035, now + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.04);
    osc2.stop(now + 0.4);
  } catch {
    // Audio unavailable — silent fail
  }
}

/** Triumphant tone when the interview completes. */
export async function playCompleteChime(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    await ensureRunning(ctx);

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99];

    notes.forEach((freq, index) => {
      const start = now + index * 0.09;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.06, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      gain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      osc.connect(gain);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  } catch {
    // silent fail
  }
}
