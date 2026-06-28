import { Lightbulb } from 'lucide-react';
import Card, { CardHeader } from '../common/Card';
import { useApp } from '../../context/AppContext';
import { getRiskMeta } from '../../utils/uiMeta';
import { cn } from '../../lib/cn';

/** Personalized AI recommendations list. */
export default function RecommendationsCard() {
  const { recommendations } = useApp();
  const list = Array.isArray(recommendations) ? recommendations : [];

  return (
    <Card>
      <CardHeader
        icon={Lightbulb}
        title="Personalized Recommendations"
        subtitle="AI suggestions for your day"
        iconClass="bg-amber-50 text-amber-600"
      />
      {list.length === 0 ? (
        <p className="text-sm text-slate-500">No recommendations right now. You're all set.</p>
      ) : (
        <ul className="space-y-2.5">
          {list.map((r) => {
            const tone = getRiskMeta(r.tone);
            return (
              <li
                key={r.id}
                className="flex items-start gap-3 rounded-2xl border border-slate-100 p-3 transition-colors hover:border-slate-200"
              >
                <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl text-base', tone.soft)}>
                  {r.emoji}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{r.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{r.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
