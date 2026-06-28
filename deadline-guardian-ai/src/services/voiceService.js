/*
 * voiceService - a thin, singleton wrapper around the browser Web Speech API
 * (SpeechRecognition / webkitSpeechRecognition) for hands-free voice commands.
 *
 * Design goals:
 *   - Lightweight & demo-friendly: one recognizer, simple subscribe API.
 *   - Never throw: capability gaps and runtime errors are surfaced through the
 *     onError channel as friendly, user-readable messages (no raw error codes).
 *   - Live transcript: interimResults is enabled so the UI can echo speech as
 *     it is recognized; the onResult payload flags when a result is final.
 *
 * Public API (as required):
 *   - startListening()        begin a single-utterance capture
 *   - stopListening()         stop the current capture
 *   - onResult(callback)      subscribe to { transcript, isFinal } updates
 *   - onError(callback)       subscribe to { type, message } errors
 * Plus small helpers used by the UI layer:
 *   - onStart(cb) / onEnd(cb) lifecycle hooks
 *   - isVoiceSupported()      feature detection
 *
 * Every subscribe function returns an unsubscribe function.
 */

let recognition = null;
let active = false;

const listeners = {
  result: new Set(),
  error: new Set(),
  start: new Set(),
  end: new Set(),
};

/** Feature-detect the Web Speech API. Safe to call during SSR/build. */
export function isVoiceSupported() {
  return (
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  );
}

function emit(type, payload) {
  listeners[type].forEach((cb) => {
    try {
      cb(payload);
    } catch (err) {
      // A listener throwing must never break recognition or other listeners.
      console.warn('[voiceService] listener error:', err?.message || err);
    }
  });
}

function subscribe(type, cb) {
  if (typeof cb !== 'function') return () => {};
  listeners[type].add(cb);
  return () => listeners[type].delete(cb);
}

export const onResult = (cb) => subscribe('result', cb);
export const onError = (cb) => subscribe('error', cb);
export const onStart = (cb) => subscribe('start', cb);
export const onEnd = (cb) => subscribe('end', cb);

// Map raw SpeechRecognition error codes to friendly, actionable messages.
const FRIENDLY_ERRORS = {
  'not-allowed': {
    type: 'permission',
    message:
      'Microphone access is blocked. Allow mic permission in your browser to use voice commands.',
  },
  'service-not-allowed': {
    type: 'permission',
    message:
      'Microphone access is blocked. Allow mic permission in your browser to use voice commands.',
  },
  'audio-capture': {
    type: 'no-mic',
    message: 'No microphone was found. Connect a mic and try again.',
  },
  'no-speech': {
    type: 'no-speech',
    message: "I didn't hear anything. Tap the mic and try again.",
  },
  network: {
    type: 'network',
    message: 'The voice service had a network problem. Check your connection and retry.',
  },
  // User/programmatic abort - not worth surfacing a message for.
  aborted: { type: 'aborted', message: '' },
};

function toFriendlyError(raw) {
  const code = typeof raw === 'string' ? raw : raw?.error || raw?.message || 'unknown';
  return (
    FRIENDLY_ERRORS[code] || {
      type: 'error',
      message: 'Voice recognition hit a problem. Please try again.',
    }
  );
}

function buildRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new Recognition();
  rec.lang = 'en-US';
  rec.interimResults = true; // stream partial results for the live transcript
  rec.continuous = false; // one command per activation keeps the UX predictable
  rec.maxAlternatives = 1;

  rec.onstart = () => {
    active = true;
    emit('start');
  };
  rec.onend = () => {
    active = false;
    emit('end');
  };
  rec.onerror = (event) => emit('error', toFriendlyError(event));
  rec.onresult = (event) => {
    let finalText = '';
    let interimText = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      const text = result?.[0]?.transcript ?? '';
      if (result.isFinal) finalText += text;
      else interimText += text;
    }
    const transcript = (finalText || interimText).trim();
    emit('result', { transcript, isFinal: Boolean(finalText) });
  };

  return rec;
}

/**
 * Begin listening for a single voice command. Returns true if recognition was
 * (or already is) started, false if it could not start. Errors are also
 * reported through the onError channel so the UI can react in one place.
 */
export function startListening() {
  if (!isVoiceSupported()) {
    emit('error', {
      type: 'unsupported',
      message: "Voice commands aren't supported in this browser. Try Chrome or Edge.",
    });
    return false;
  }
  if (active) return true;
  try {
    // A fresh recognizer per session avoids the API getting stuck in a bad state.
    recognition = buildRecognition();
    recognition.start();
    return true;
  } catch (err) {
    // .start() throws if invoked again too quickly after a previous session.
    emit('error', toFriendlyError(err));
    return false;
  }
}

/** Stop the active capture (a final result + 'end' will follow if available). */
export function stopListening() {
  try {
    recognition?.stop();
  } catch {
    /* no-op: stopping an already-stopped recognizer is harmless */
  }
}
