import { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, Sparkles, Bot, User as UserIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import AIModeBadge from '../components/common/AIModeBadge';
import MicButton from '../components/common/MicButton';
import AssistantMessage from '../components/assistant/AssistantMessage';
import { useApp } from '../context/AppContext';
import { useCopilot } from '../hooks/useCopilot';
import { cn } from '../lib/cn';

export default function Assistant() {
  const { quickPrompts } = useApp();
  const { messages, thinking, send } = useCopilot({ seed: 'full' });
  const [input, setInput] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const handledQuery = useRef(null);
  const endRef = useRef(null);

  // Only the most recent assistant message animates its typing.
  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'assistant') return messages[i].id;
    }
    return null;
  }, [messages]);
  // Track which assistant messages already typed out. Seed with the initial
  // history so pre-existing messages render instantly (no animation on load).
  const typedRef = useRef(null);
  if (typedRef.current === null) {
    typedRef.current = new Set(
      messages.filter((m) => m.role === 'assistant').map((m) => m.id),
    );
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  // Voice commands like "what should I do now" deep-link here as ?q=…; send the
  // spoken text to the Copilot once, then clear the param so it never re-fires.
  useEffect(() => {
    const q = searchParams.get('q');
    const value = (q ?? '').trim();
    if (!value || handledQuery.current === value) return;
    handledQuery.current = value;
    send(value);
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    setSearchParams(next, { replace: true });
  }, [searchParams, send, setSearchParams]);

  function submit(text) {
    const content = (text ?? input).trim();
    if (!content) return;
    setInput('');
    send(content);
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col lg:h-[calc(100vh-7rem)]">
      <PageHeader title="Productivity Copilot" subtitle="Ask anything about your tasks, plan, or deadlines.">
        <AIModeBadge />
      </PageHeader>

      {/* Quick prompts */}
      <div className="mb-3 flex flex-wrap gap-2">
        {quickPrompts.map((p) => (
          <button
            key={p}
            onClick={() => submit(p)}
            disabled={thinking}
            className="chip hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-60"
          >
            <Sparkles className="h-3.5 w-3.5 text-brand-500" />
            {p}
          </button>
        ))}
      </div>

      {/* Chat area */}
      <Card className="flex min-h-0 flex-1 flex-col p-0">
        <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5">
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('flex items-start gap-3', m.role === 'user' && 'flex-row-reverse')}
            >
              <span
                className={cn(
                  'grid h-9 w-9 shrink-0 place-items-center rounded-xl',
                  m.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-gradient-to-br from-brand-500 to-indigo-500 text-white',
                )}
              >
                {m.role === 'user' ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </span>
              <div className={cn('max-w-[80%] min-w-0', m.role === 'user' && 'flex flex-col items-end')}>
                {m.role === 'assistant' ? (
                  <AssistantMessage
                    message={m}
                    animate={m.id === lastAssistantId && !typedRef.current.has(m.id)}
                    onTyped={() => typedRef.current.add(m.id)}
                    bubbleClassName="rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2.5 text-sm text-slate-800"
                  />
                ) : (
                  <div className="rounded-2xl rounded-tr-sm bg-brand-600 px-4 py-2.5 text-sm text-white">
                    {m.content}
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {thinking && (
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-500 text-white">
                <Bot className="h-4 w-4" />
              </span>
              <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2.5">
                <span className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                </span>
                <span className="text-sm text-slate-500">Productivity Copilot is thinking...</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Composer */}
        <div className="border-t border-slate-100 p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex items-center gap-2"
          >
            <MicButton size="lg" title="Speak a command" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your AI companion..."
              className="input flex-1"
            />
            <button
              type="submit"
              aria-label="Send"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-glow transition-colors hover:bg-brand-700 disabled:opacity-50"
              disabled={!input.trim() || thinking}
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </Card>
    </div>
  );
}
