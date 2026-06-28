import { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, ArrowRight, Send } from 'lucide-react';
import AssistantMessage from './AssistantMessage';
import { useApp } from '../../context/AppContext';
import { useCopilot } from '../../hooks/useCopilot';
import MicButton from '../common/MicButton';
import { cn } from '../../lib/cn';

/** Compact assistant chat popover opened from the floating button. */
export default function AssistantPanel({ onClose }) {
  const navigate = useNavigate();
  const { quickPrompts } = useApp();
  const { messages, thinking, send } = useCopilot({ seed: 'compact' });
  const [input, setInput] = useState('');
  const endRef = useRef(null);

  // Only the latest assistant message animates; seed the rest as already typed.
  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'assistant') return messages[i].id;
    }
    return null;
  }, [messages]);
  const typedRef = useRef(null);
  if (typedRef.current === null) {
    typedRef.current = new Set(
      messages.filter((m) => m.role === 'assistant').map((m) => m.id),
    );
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  function submit(text) {
    const content = (text ?? input).trim();
    if (!content) return;
    setInput('');
    send(content);
  }

  function openFull() {
    onClose?.();
    navigate('/assistant');
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="card flex w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-0"
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-brand-600 to-indigo-600 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/15">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Productivity Copilot</p>
            <p className="text-[11px] text-white/80">Powered by your tasks &amp; schedule</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 hover:bg-white/15">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Quick prompts */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-100 px-3 py-2 [scrollbar-width:none]">
        {quickPrompts.map((p) => (
          <button
            key={p}
            onClick={() => submit(p)}
            disabled={thinking}
            className="chip shrink-0 whitespace-nowrap text-xs hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-60"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="scrollbar-thin flex h-80 flex-col gap-3 overflow-y-auto bg-slate-50/40 p-3">
        {messages.map((m) => (
          <div key={m.id} className={cn('flex flex-col', m.role === 'user' ? 'items-end' : 'items-start')}>
            {m.role === 'assistant' ? (
              <AssistantMessage
                message={m}
                animate={m.id === lastAssistantId && !typedRef.current.has(m.id)}
                onTyped={() => typedRef.current.add(m.id)}
                cardsClassName="w-full"
                bubbleClassName="max-w-[88%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-sm text-slate-800 ring-1 ring-slate-100"
              />
            ) : (
              <div className="max-w-[88%] rounded-2xl rounded-tr-sm bg-brand-600 px-3 py-2 text-sm text-white">
                {m.content}
              </div>
            )}
          </div>
        ))}

        {thinking && (
          <div className="flex items-center gap-2 self-start rounded-2xl rounded-tl-sm bg-white px-3 py-2 ring-1 ring-slate-100">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
            </span>
            <span className="text-xs text-slate-500">Productivity Copilot is thinking...</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center gap-2 border-t border-slate-100 p-2.5"
      >
        <MicButton title="Speak a command" className="h-10 w-10" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your Copilot..."
          className="input h-10 flex-1 text-sm"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!input.trim() || thinking}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

      {/* Footer */}
      <button
        onClick={openFull}
        className="flex items-center justify-center gap-1.5 border-t border-slate-100 bg-white px-4 py-2 text-xs font-semibold text-slate-500 transition-colors hover:text-brand-600"
      >
        Open full assistant
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}
