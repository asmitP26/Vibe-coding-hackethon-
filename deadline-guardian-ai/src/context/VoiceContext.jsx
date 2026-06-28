import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from './AppContext';
import {
  isVoiceSupported,
  startListening,
  stopListening,
  onResult,
  onError,
  onStart,
  onEnd,
} from '../services/voiceService';
import { parseVoiceCommand, executeVoiceCommand } from '../services/voiceCommands';

/**
 * VoiceContext - one shared voice session for the whole app.
 *
 * Every mic button (Topbar, floating assistant panel, Assistant page) drives
 * this single session, and the global VoiceOverlay reflects its live status, so
 * voice behaves identically everywhere. The provider:
 *   1. subscribes once to the singleton voiceService,
 *   2. streams the live transcript into state ("Listening…"),
 *   3. on a final transcript, parses + executes the command ("Processing…"),
 *   4. surfaces the outcome via the app Toast and a brief overlay state.
 */
const VoiceContext = createContext(null);

// How long a final success/error state lingers before the overlay resets.
const RESET_MS = 2600;

export function VoiceProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { tasks, addTaskWithAnalysis, toggleTask, showToast, preferences } = useApp();

  const [supported] = useState(() => isVoiceSupported());
  const [status, setStatus] = useState('idle'); // idle | listening | processing | success | error
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  // A spoken question that should land in the Assistant input (not an action).
  // Consumers (Assistant page + floating panel) read this, fill their input,
  // then call clearAssistantDraft(). Stored as an object so repeating the same
  // phrase still produces a new reference and re-triggers the consumer effect.
  const [assistantDraft, setAssistantDraftState] = useState(null);
  // When true, a captured voice question is sent automatically; otherwise it
  // just fills the input and waits for the user to press send. Driven by the
  // user's saved preference (Topbar profile menu), defaulting to fill-only.
  const voiceAutoSend = preferences?.voiceAutoSend === true;

  const resetTimer = useRef(null);
  const finalHandled = useRef(false);
  const lastTranscript = useRef('');
  // Track the current route without re-subscribing the recognizer on each nav.
  const locationRef = useRef(location.pathname);
  locationRef.current = location.pathname;

  const setAssistantDraft = useCallback((text) => {
    const value = typeof text === 'string' ? text.trim() : '';
    if (!value) return;
    setAssistantDraftState({ text: value, token: Date.now() });
  }, []);

  const clearAssistantDraft = useCallback(() => setAssistantDraftState(null), []);

  // Keep the freshest app data/handlers available to the executor without
  // re-subscribing to the (singleton) voice service on every state change.
  const depsRef = useRef({});
  depsRef.current = { tasks, addTaskWithAnalysis, toggleTask, navigate };

  const scheduleReset = useCallback(() => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      setStatus('idle');
      setTranscript('');
      setFeedback('');
    }, RESET_MS);
  }, []);

  const runCommand = useCallback(
    async (text) => {
      setStatus('processing');
      const parsed = parseVoiceCommand(text);

      // Natural language -> route it into the Assistant input instead of raising
      // a "didn't catch a command" error. The user can then press send (or it
      // auto-sends when voiceAutoSend is on).
      if (parsed.type === 'text') {
        const draft = (parsed.text || '').trim();
        if (!draft) {
          const msg = "I didn't catch that. Tap the mic and try again.";
          setFeedback(msg);
          setStatus('error');
          showToast(msg, 'info');
          scheduleReset();
          return;
        }
        setAssistantDraft(draft);
        const msg = 'Voice captured. Press send to ask Copilot.';
        setFeedback(msg);
        setStatus('success');
        showToast(msg, 'info');
        // Surface the filled input: hop to the Assistant page if we're elsewhere
        // (the floating panel, if open, fills from the same shared draft).
        try {
          if (!String(locationRef.current || '').startsWith('/assistant')) navigate('/assistant');
        } catch {
          /* navigation is best-effort */
        }
        scheduleReset();
        return;
      }

      let result;
      try {
        result = await executeVoiceCommand(parsed, depsRef.current);
      } catch (err) {
        console.warn('[voice] command failed:', err?.message || err);
        result = { ok: false, message: 'Something went wrong running that command.', tone: 'warning' };
      }
      setFeedback(result.message || '');
      setStatus(result.ok ? 'success' : 'error');
      if (result.message) showToast(result.message, result.tone || (result.ok ? 'success' : 'warning'));
      scheduleReset();
    },
    [showToast, scheduleReset, navigate, setAssistantDraft],
  );

  // Subscribe ONCE to the singleton recognizer.
  useEffect(() => {
    const offStart = onStart(() => {
      finalHandled.current = false;
      lastTranscript.current = '';
      setTranscript('');
      setFeedback('');
      setStatus('listening');
    });

    const offResult = onResult(({ transcript: text, isFinal }) => {
      lastTranscript.current = text;
      setTranscript(text);
      if (isFinal && text && !finalHandled.current) {
        finalHandled.current = true;
        runCommand(text);
      }
    });

    const offEnd = onEnd(() => {
      // If recognition ended without a final result, act on the last interim
      // transcript when we have one, otherwise show a gentle fallback.
      if (finalHandled.current) return;
      finalHandled.current = true;
      const text = lastTranscript.current.trim();
      if (text) {
        runCommand(text);
      } else {
        const msg = "I didn't catch that. Tap the mic and try again.";
        setFeedback(msg);
        setStatus('error');
        showToast(msg, 'warning');
        scheduleReset();
      }
    });

    const offError = onError((err) => {
      finalHandled.current = true;
      const msg = err?.message || 'Voice recognition error.';
      setFeedback(msg);
      setStatus('error');
      if (msg) showToast(msg, err?.type === 'permission' ? 'warning' : 'info');
      scheduleReset();
    });

    return () => {
      offStart();
      offResult();
      offEnd();
      offError();
    };
  }, [runCommand, showToast, scheduleReset]);

  // Clean up any pending reset timer on unmount.
  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const start = useCallback(() => {
    if (!supported) {
      const msg = "Voice commands aren't supported in this browser. Try Chrome or Edge.";
      setFeedback(msg);
      setStatus('error');
      showToast(msg, 'info');
      scheduleReset();
      return;
    }
    finalHandled.current = false;
    lastTranscript.current = '';
    setTranscript('');
    setFeedback('');
    setStatus('listening'); // optimistic: instant UI feedback before onstart fires
    startListening();
  }, [supported, showToast, scheduleReset]);

  const stop = useCallback(() => {
    stopListening();
  }, []);

  const toggle = useCallback(() => {
    if (status === 'listening') stop();
    else start();
  }, [status, start, stop]);

  const value = useMemo(
    () => ({
      supported,
      status,
      transcript,
      feedback,
      listening: status === 'listening',
      processing: status === 'processing',
      start,
      stop,
      toggle,
      // assistant draft channel (voice -> Assistant input)
      assistantDraft,
      setAssistantDraft,
      clearAssistantDraft,
      voiceAutoSend,
    }),
    [supported, status, transcript, feedback, start, stop, toggle, assistantDraft, setAssistantDraft, clearAssistantDraft, voiceAutoSend],
  );

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return ctx;
}

export default VoiceContext;
