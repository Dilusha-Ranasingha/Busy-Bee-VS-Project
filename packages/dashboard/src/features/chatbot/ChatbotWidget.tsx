import { useMemo, useState } from 'react';
import {
  getInsights,
  getExplain,
  createPlan,
  type InsightsResponse,
  type ExplainResponse,
  type PlanResponse,
} from '../forecasting/api';

type Role = 'user' | 'assistant';

type ChatMessage = {
  id: string;
  role: Role;
  text: string;
  time: string;
};

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function safeNumber(n: unknown, fallback = 0) {
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}

function calmRiskLine(risk: string) {
  if (risk === 'high') return '⚠️ A higher-risk week. We’ll keep the plan realistic and add a safety buffer.';
  if (risk === 'medium') return '🟡 Some uncertainty, but we can still plan safely.';
  return '✅ Low risk. Your pattern looks steady.';
}

function calmConfidenceLine(conf: string) {
  if (conf === 'low') return 'Confidence is low — so I’ll suggest a smaller target with extra buffer.';
  if (conf === 'medium') return 'Confidence is medium — good enough to plan with a small buffer.';
  return 'Confidence is high — the forecast is fairly consistent.';
}

function bestWindowLine(w: string) {
  if (w === 'day') return 'Best focus window: day-time (use it for harder tasks).';
  if (w === 'night') return 'Best focus window: night-time (use it for harder tasks).';
  return 'Best focus window: mixed (split work into 2 sessions).';
}

export default function ChatbotWidget() {
  // demo values (later replace with real logged-in user)
  const userId = 'testUser';

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid(),
      role: 'assistant',
      time: nowTime(),
      text:
        "Hi! I’m your calm productivity assistant.\n\nI won’t show numbers unless you ask.\nChoose an option below 👇",
    },
  ]);

  const [busy, setBusy] = useState(false);

  // planning controls
  const [period, setPeriod] = useState<'day' | 'week'>('day');
  const [targetHours, setTargetHours] = useState<number>(2);

  const quickActions = useMemo(
    () => [
      { key: 'outlook', label: 'What’s my outlook (next 7 days)?' },
      { key: 'plan_day', label: 'Plan my day' },
      { key: 'plan_week', label: 'Plan my week' },
      { key: 'why_conf', label: 'Why is confidence low/medium?' },
      { key: 'why_model', label: 'What is influencing the forecast?' },
    ],
    []
  );

  function push(role: Role, text: string) {
    setMessages((prev) => [...prev, { id: uid(), role, text, time: nowTime() }]);
  }

  function formatOutlook(i: InsightsResponse) {
    const risk = i.riskLevel ?? 'low';
    const conf = i.confidence ?? 'medium';
    const window = i.bestWindow ?? 'day';

    return [
      `Here’s your short-term outlook (next ${i.horizonDays ?? 7} days):`,
      '',
      `• Trend: ${i.trend ?? 'stable'}`,
      `• ${calmRiskLine(risk)}`,
      `• ${calmConfidenceLine(conf)}`,
      `• ${bestWindowLine(window)}`,
      '',
      'If you want, I can create a plan (day/week) based on your goal.',
    ].join('\n');
  }

  function formatWhyConfidence(i: InsightsResponse) {
    const conf = i.confidence ?? 'medium';
    const recent = safeNumber(i.recentAvgFocus14, 0);
    const pred = safeNumber(i.predictedAvg, 0);

    return [
      `Confidence: ${conf}`,
      '',
      'This is usually affected by:',
      '• How consistent your recent days were',
      '• How different the next-week pattern looks compared to your recent average',
      '',
      `Right now: recent avg ≈ ${recent} min, predicted avg ≈ ${pred} min.`,
      'If your days are uneven (some very high, some very low), confidence drops.',
    ].join('\n');
  }

  function formatExplain(e: ExplainResponse) {
    const top = (e.globalTopFeatures ?? []).slice(0, 5);
    if (!top.length) return 'I don’t have enough explanation data yet.';
    const lines = top.map((x) => `• ${x.feature}`);
    return [
      'Top signals that influenced the forecast:',
      ...lines,
      '',
      'If you want, I can explain these in simpler meaning.',
    ].join('\n');
  }

  function formatPlan(p: PlanResponse) {
    const ok = p.feasible ? '✅ Doable' : '⚠️ Too high (needs adjustment)';
    const best = p.bestWindow ?? 'day';
    const conf = p.confidence ?? 'medium';

    const planLines = (p.plan ?? []).slice(0, 7).map((x) => `• ${x.date}: ${x.hours}h (${x.window})`);

    const slotLines = (p.recommendedSlots ?? [])
      .slice(0, 3)
      .map((s) => `• ${s.label}: ${s.start}–${s.end}`);

    return [
      `${ok}`,
      '',
      `${p.reason}`,
      '',
      `Best window: ${best} • Confidence: ${conf}`,
      '',
      'Suggested plan:',
      ...planLines,
      slotLines.length ? '' : '',
      slotLines.length ? 'Suggested time slots:' : '',
      ...slotLines,
    ].join('\n');
  }

  async function handleAction(key: string) {
    if (busy) return;
    setBusy(true);

    try {
      if (key === 'outlook') {
        push('user', 'What’s my outlook for the next 7 days?');
        const i = await getInsights(userId, 7);
        push('assistant', formatOutlook(i));
      }

      if (key === 'plan_day') {
        push('user', `Plan my day for ${targetHours} hours.`);
        const p = await createPlan(userId, { period: 'day', targetHours });
        push('assistant', formatPlan(p));
      }

      if (key === 'plan_week') {
        push('user', `Plan my week for ${targetHours} hours.`);
        const p = await createPlan(userId, { period: 'week', targetHours });
        push('assistant', formatPlan(p));
      }

      if (key === 'why_conf') {
        push('user', 'Why is confidence low/medium?');
        const i = await getInsights(userId, 7);
        push('assistant', formatWhyConfidence(i));
      }

      if (key === 'why_model') {
        push('user', 'What is influencing the forecast?');
        const e = await getExplain(userId, 8);
        push('assistant', formatExplain(e));
      }
    } catch {
      push('assistant', 'Sorry — I couldn’t fetch that right now. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-vscode-widget-border bg-vscode-widget-bg shadow-vscode overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-vscode-widget-border flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-vscode-editor-fg truncate">Calm Assistant (Chatbot)</h2>
          <p className="text-xs text-vscode-foreground/70">
            Guided answers • No graphs unless asked • User:{' '}
            <span className="text-vscode-editor-fg font-medium">{userId}</span>
          </p>
        </div>

        <span
          className="shrink-0 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs
                     border border-vscode-widget-border bg-vscode-input-bg text-vscode-editor-fg"
        >
          Demo UI
        </span>
      </div>

      {/* Controls */}
      <div className="px-4 py-3 border-b border-vscode-widget-border bg-vscode-editor-bg/20">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {quickActions.map((a) => (
              <button
                key={a.key}
                onClick={() => handleAction(a.key)}
                disabled={busy}
                className="px-3 py-2 rounded-lg border border-vscode-widget-border bg-vscode-input-bg text-vscode-editor-fg text-sm
                           hover:bg-vscode-list-hover-bg disabled:opacity-60"
              >
                {a.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <select
              aria-label="Planning period"
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'day' | 'week')}
              className="px-3 py-2 rounded-lg border border-vscode-widget-border bg-vscode-editor-bg text-vscode-editor-fg text-sm"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
            </select>

            <input
              aria-label="Target hours"
              type="number"
              min={0.5}
              step={0.5}
              value={targetHours}
              onChange={(e) => setTargetHours(Number(e.target.value))}
              className="w-full sm:w-40 px-3 py-2 rounded-lg border border-vscode-widget-border bg-vscode-editor-bg text-vscode-editor-fg text-sm"
              placeholder="Target hours"
            />

            <button
              onClick={() => handleAction(period === 'day' ? 'plan_day' : 'plan_week')}
              disabled={busy}
              className="px-4 py-2 rounded-lg border border-vscode-widget-border bg-vscode-button-bg text-vscode-button-fg text-sm font-semibold
                         hover:opacity-95 disabled:opacity-60"
            >
              {busy ? 'Working…' : 'Generate Plan'}
            </button>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="p-4 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[820px] rounded-xl border border-vscode-widget-border p-3 whitespace-pre-wrap text-sm ${
                m.role === 'user'
                  ? 'bg-vscode-input-bg text-vscode-editor-fg'
                  : 'bg-vscode-editor-bg/25 text-vscode-editor-fg'
              }`}
            >
              <div className="text-[11px] text-vscode-foreground/60 mb-1">
                {m.role === 'user' ? 'You' : 'Assistant'} • {m.time}
              </div>
              {m.text}
            </div>
          </div>
        ))}

        {busy && <div className="text-xs text-vscode-foreground/70">Assistant is thinking…</div>}
      </div>
    </section>
  );
}
