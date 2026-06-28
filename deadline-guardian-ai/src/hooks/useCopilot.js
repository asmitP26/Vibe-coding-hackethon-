import { useCallback, useRef, useState } from 'react';
import { useApp, createId } from '../context/AppContext';
import { runAssistant } from '../services/assistantEngine';
import { getAIMode } from '../services/geminiService';

const GREETING = {
  id: 'copilot-greeting',
  role: 'assistant',
  content:
    "Hi! I'm your Productivity Copilot. Ask me to plan your day, surface deadline risks, or break down your biggest task - I'll use your real tasks, habits, and schedule.",
};

/**
 * useCopilot - shared chat logic for the Assistant page and the floating panel.
 * `seed`: "full" reuses the seeded demo history; "compact" starts with a single
 * greeting (better for the small popover). Each consumer owns its own history.
 */
export function useCopilot({ seed = 'full' } = {}) {
  const { tasks, habits, scheduleBlocks, productivityStats, assistantMessages } = useApp();
  const [messages, setMessages] = useState(() =>
    seed === 'full' ? assistantMessages : [GREETING],
  );
  const [thinking, setThinking] = useState(false);
  const busy = useRef(false);
  // Short-term memory: last 5 {user, assistant, intent} turns sent to the brain
  // so replies can build on what was just discussed.
  const historyRef = useRef([]);

  const send = useCallback(
    async (text) => {
      const content = (text ?? '').trim();
      if (!content || busy.current) return;
      busy.current = true;
      setMessages((prev) => [...prev, { id: createId('u'), role: 'user', content }]);
      setThinking(true);
      try {
        const res = await runAssistant(content, {
          tasks,
          habits,
          scheduleBlocks,
          productivityStats,
          history: historyRef.current,
        });
        setMessages((prev) => [
          ...prev,
          { id: createId('a'), role: 'assistant', content: res.content, cards: res.cards, kind: res.kind },
        ]);
        // Record this turn (cap at the last 5 interactions).
        historyRef.current = [
          ...historyRef.current,
          { user: content, assistant: res.content, intent: res.kind },
        ].slice(-5);
      } catch (err) {
        // runAssistant falls back to mock internally, so this only fires on a
        // truly unexpected throw. Surface a graceful message instead of letting
        // it become an unhandled rejection or stall the "thinking" state.
        console.warn('[useCopilot] assistant failed - showing a graceful message.', err);
        setMessages((prev) => [
          ...prev,
          {
            id: createId('a'),
            role: 'assistant',
            content:
              "I hit a snag reaching the assistant just now. Please try again in a moment — your tasks and data are safe.",
            kind: 'error',
          },
        ]);
      } finally {
        setThinking(false);
        busy.current = false;
      }
    },
    [tasks, habits, scheduleBlocks, productivityStats],
  );

  return { messages, thinking, send, mode: getAIMode() };
}

export default useCopilot;
