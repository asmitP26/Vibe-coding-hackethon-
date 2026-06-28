/*
 * sound - a single, dependency-free reminder chime via the Web Audio API.
 *
 * Used by the notifications panel so the "Reminder sound" preference does
 * something tangible. Fully guarded: if the browser lacks AudioContext, the
 * user hasn't interacted yet, or anything throws, it fails silently. No audio
 * files are bundled - the tone is synthesized on the fly.
 */
let audioCtx = null;

function getCtx() {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  try {
    if (!audioCtx) audioCtx = new Ctx();
    return audioCtx;
  } catch {
    return null;
  }
}

/** Play a short, soft two-note chime. No-op if audio is unavailable. */
export function playChime() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const notes = [
      { freq: 660, at: 0 },
      { freq: 880, at: 0.12 },
    ];
    notes.forEach(({ freq, at }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.12, now + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + 0.24);
    });
  } catch {
    /* ignore - sound is a nicety, never critical */
  }
}

/**
 * Play a short, attention-grabbing three-note rising alarm. Used by the task
 * reminder engine when an alarm fires, so it sounds distinct from the softer
 * panel-open chime. No-op if audio is unavailable.
 */
export function playAlarm() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const beeps = [
      { freq: 784, at: 0 }, // G5
      { freq: 988, at: 0.18 }, // B5
      { freq: 1175, at: 0.36 }, // D6
    ];
    beeps.forEach(({ freq, at }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.16, now + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + 0.18);
    });
  } catch {
    /* ignore - sound is a nicety, never critical */
  }
}

export default playChime;
