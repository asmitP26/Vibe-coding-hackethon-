import { useCallback, useRef, useState } from 'react';
import { useApp, createId } from '../context/AppContext';
import { runAssistant } from '../services/assistantEngine';

/**
 * Rebuild short-term memory (last few {user, assistant, intent} turns) from the
 * shared conversation, so replies can build on what was just discussed even
 * after a refresh or when switching between the page and the floating panel.
 */
function buildHistory(messages, limit = 5) {
  const list = Array.isArray(messages) ? messages : [];
  const turns = [];
  for (let i = 0; i < list.length; i += 1) {
    if (list[i]?.role === 'user') {
      const next = list[i + 1];
      if (next && next.role === 'assistant') {
        turns.push({ user: list[i].content, assistant: next.content, intent: next.kind });
      }
    }
  }
  return turns.slice(-limit);
}

/**
 * useCopilot - shared chat logic for the Assistant page and the floating panel.
 *
 * The messages now live in AppContext (persisted to localStorage), so every
 * consumer renders the SAME conversation and it survives navigation + refresh.
 * The `seed` option is accepted for backward compatibility but no longer forks
 * state - both surfaces share one conversation.
 */
export function useCopilot() {
  const {
    tasks,
    habits,
    scheduleBlocks,
    productivityStats,
    assistantConversation,
    appendAssistantMessages,
  } = useApp();
  const [thinking, setThinking] = useState(false);
  const busy = useRef(false);

  const send = useCallback(
    async (text) => {
      const content = (text ?? '').trim();
      if (!content || busy.current) return;
      busy.current = true;
      // History must reflect prior turns only (before this new message).
      const history = buildHistory(assistantConversation);
      appendAssistantMessages({ id: createId('u'), role: 'user', content });
      setThinking(true);
      try {
        const res = await runAssistant(content, {
          tasks,
          habits,
          scheduleBlocks,
          productivityStats,
          history,
        });
        appendAssistantMessages({
          id: createId('a'),
          role: 'assistant',
          content: res.content,
          cards: res.cards,
          kind: res.kind,
          // Per-response AI metadata so the UI can flag a single fallback message.
          mode: res.mode,
          fallbackUsed: res.fallbackUsed,
          configured: res.configured,
        });
      } catch (err) {
        // runAssistant falls back to mock internally, so this only fires on a
        // truly unexpected throw. Surface a graceful message instead of letting
        // it become an unhandled rejection or stall the "thinking" state.
        console.warn('[useCopilot] assistant failed - showing a graceful message.', err);
        appendAssistantMessages({
          id: createId('a'),
          role: 'assistant',
          content:
            "I hit a snag reaching the assistant just now. Please try again in a moment — your tasks and data are safe.",
          kind: 'error',
        });
      } finally {
        setThinking(false);
        busy.current = false;
      }
    },
    [tasks, habits, scheduleBlocks, productivityStats, assistantConversation, appendAssistantMessages],
  );

  return { messages: assistantConversation, thinking, send };
}

export default useCopilot;
