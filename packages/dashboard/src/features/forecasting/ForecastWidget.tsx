import { useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  type TooltipItem,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

import {
  createPlan,
  getExplain,
  getForecast,
  getInsights,
  type ForecastResponse,
  type InsightsResponse,
  type ExplainResponse,
  type PlanResponse,
} from './api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

type UiState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready' };

type PlanState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: PlanResponse };

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Something went wrong';
}

function cssVar(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function badgeTone(value: string) {
  if (value === 'high' || value === 'improving') return 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30';
  if (value === 'medium' || value === 'stable') return 'bg-sky-500/15 text-sky-200 border-sky-500/30';
  return 'bg-amber-500/15 text-amber-200 border-amber-500/30';
}

function friendlyFeatureName(raw: string) {
  const map: Record<string, string> = {
    focus_rollmean_7: 'Weekly focus average',
    focus_lag_1: 'Yesterday focus',
    focus_lag_2: 'Focus 2 days ago',
    focus_lag_3: 'Focus 3 days ago',
    focus_lag_4: 'Focus 4 days ago',
    focus_lag_5: 'Focus 5 days ago',
    focus_lag_6: 'Focus 6 days ago',
    focus_lag_7: 'Focus 7 days ago',
    dow: 'Day-of-week pattern',
    is_weekend: 'Weekend effect',
    idle_rollmean_7: 'Weekly idle pattern',
    error_fix_rollmean_7: 'Weekly debugging time',
    night_focus_ratio_14: 'Night-focus tendency',
  };
  return map[raw] || raw.replaceAll('_', ' ');
}

export default function ForecastWidget() {
  // demo values (later replace with real user)
  const userId = 'testUser';
  const days = 7;

  const [ui, setUi] = useState<UiState>({ status: 'loading' });
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [explain, setExplain] = useState<ExplainResponse | null>(null);

  // Planning form state
  const [period, setPeriod] = useState<'day' | 'week'>('day');
  const [targetHours, setTargetHours] = useState<number>(2);
  const [planState, setPlanState] = useState<PlanState>({ status: 'idle' });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setUi({ status: 'loading' });

        const [f, i, e] = await Promise.all([
          getForecast(userId, days),
          getInsights(userId, days),
          getExplain(userId, 8),
        ]);

        if (cancelled) return;

        setForecast(f);
        setInsights(i);
        setExplain(e);
        setUi({ status: 'ready' });
      } catch (err: unknown) {
        if (cancelled) return;
        setUi({ status: 'error', message: getErrorMessage(err) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const chartTheme = useMemo(() => {
    const fg = cssVar('--vscode-editor-foreground', '#e5e7eb');
    const grid = cssVar('--vscode-widget-border', 'rgba(255,255,255,0.12)');
    const accent = cssVar('--vscode-focusBorder', '#3b82f6');
    const tooltipBg = cssVar('--vscode-editorHoverWidget-background', '#111827');
    const tooltipBorder = cssVar('--vscode-editorHoverWidget-border', grid);
    return { fg, grid, accent, tooltipBg, tooltipBorder };
  }, [ui.status]);

  const peak = useMemo(() => {
    const pts = forecast?.points ?? [];
    if (!pts.length) return null;
    return pts.reduce((best, p) => (p.productiveMinutes > best.productiveMinutes ? p : best));
  }, [forecast]);

  const chartData = useMemo(() => {
    const points = forecast?.points ?? [];
    const labels = points.map((p) => p.date);
    const pred = points.map((p) => p.productiveMinutes);
    const lower = points.map((p) => (p.lower ?? null));
    const upper = points.map((p) => (p.upper ?? null));

    return {
      labels,
      datasets: [
        {
          label: 'Upper',
          data: upper,
          borderColor: 'transparent',
          backgroundColor: `${chartTheme.accent}22`,
          pointRadius: 0,
          fill: '-1',
          tension: 0.35,
        },
        {
          label: 'Lower',
          data: lower,
          borderColor: 'transparent',
          backgroundColor: `${chartTheme.accent}22`,
          pointRadius: 0,
          fill: false,
          tension: 0.35,
        },
        {
          label: 'Predicted',
          data: pred,
          borderColor: chartTheme.accent,
          backgroundColor: chartTheme.accent,
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    };
  }, [forecast, chartTheme.accent]);

  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: chartTheme.tooltipBg,
          borderColor: chartTheme.tooltipBorder,
          borderWidth: 1,
          titleColor: chartTheme.fg,
          bodyColor: chartTheme.fg,
          callbacks: {
            label: (item: TooltipItem<'line'>) => {
              const y = item.parsed.y;
              if (y === null) return '';
              return `${Math.round(y)} min`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: chartTheme.fg, maxRotation: 0, autoSkip: true },
          grid: { display: false },
        },
        y: {
          ticks: { color: chartTheme.fg },
          grid: { color: chartTheme.grid },
          beginAtZero: true,
        },
      },
    };
  }, [chartTheme]);

  async function onGeneratePlan() {
    try {
      setPlanState({ status: 'loading' });
      const res = await createPlan(userId, { period, targetHours });
      setPlanState({ status: 'ready', data: res });
    } catch (err: unknown) {
      setPlanState({ status: 'error', message: getErrorMessage(err) });
    }
  }

  const isLoading = ui.status === 'loading';
  const isError = ui.status === 'error';

  return (
    <section className="rounded-xl border border-vscode-widget-border bg-vscode-widget-bg shadow-vscode overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-vscode-widget-border flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-vscode-editor-fg truncate">
            Forecast & Planning Assistant
          </h2>
          <p className="text-xs text-vscode-foreground/70">
            User: <span className="font-medium text-vscode-editor-fg">{userId}</span> • Next {days} days
          </p>
        </div>

        {peak ? (
          <div className="text-right shrink-0">
            <div className="text-[11px] text-vscode-foreground/70">Peak day</div>
            <div className="text-sm font-semibold text-vscode-editor-fg">
              {peak.date} • {peak.productiveMinutes} min
            </div>
          </div>
        ) : (
          <span className="text-xs text-vscode-foreground/70">—</span>
        )}
      </div>

      {/* Error banner */}
      {isError && (
        <div className="px-4 py-3 border-b border-vscode-widget-border bg-vscode-editor-bg">
          <p className="text-sm text-red-400">{ui.message}</p>
        </div>
      )}

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-lg border border-vscode-widget-border bg-vscode-input-bg/30 p-3">
            <div className="text-[11px] text-vscode-foreground/70">Next 7 days</div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-vscode-editor-fg">Trend</div>
              <span className={`text-xs px-2 py-1 rounded-md border ${badgeTone(insights?.trend || 'stable')}`}>
                {isLoading ? '…' : (insights?.trend || '—')}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-vscode-foreground/70">
              {isLoading ? 'Loading summary…' : (insights?.summary || '—')}
            </div>
          </div>

          <div className="rounded-lg border border-vscode-widget-border bg-vscode-input-bg/30 p-3">
            <div className="text-[11px] text-vscode-foreground/70">Early warning</div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-vscode-editor-fg">Risk</div>
              <span className={`text-xs px-2 py-1 rounded-md border ${badgeTone(insights?.riskLevel || 'low')}`}>
                {isLoading ? '…' : (insights?.riskLevel || '—')}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-vscode-foreground/70">
              Idle: <span className="text-vscode-editor-fg">{insights?.latestIdleMinutes ?? '—'}m</span> • Debug:{' '}
              <span className="text-vscode-editor-fg">{insights?.latestErrorFixMinutes ?? '—'}m</span>
            </div>
          </div>

          <div className="rounded-lg border border-vscode-widget-border bg-vscode-input-bg/30 p-3">
            <div className="text-[11px] text-vscode-foreground/70">Best working style</div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-vscode-editor-fg">Window</div>
              <span className={`text-xs px-2 py-1 rounded-md border ${badgeTone(insights?.bestWindow || 'mixed')}`}>
                {isLoading ? '…' : (insights?.bestWindow || '—')}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-vscode-foreground/70">
              Use this window for harder tasks.
            </div>
          </div>

          <div className="rounded-lg border border-vscode-widget-border bg-vscode-input-bg/30 p-3">
            <div className="text-[11px] text-vscode-foreground/70">Model certainty</div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-vscode-editor-fg">Confidence</div>
              <span className={`text-xs px-2 py-1 rounded-md border ${badgeTone(insights?.confidence || 'medium')}`}>
                {isLoading ? '…' : (insights?.confidence || '—')}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-vscode-foreground/70">
              Avg: <span className="text-vscode-editor-fg">{insights?.predictedAvg ?? '—'}m</span> • Recent:{' '}
              <span className="text-vscode-editor-fg">{insights?.recentAvgFocus14 ?? '—'}m</span>
            </div>
          </div>
        </div>

        {/* Chart + Table */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-vscode-widget-border bg-vscode-input-bg/30 p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-xs font-semibold text-vscode-editor-fg">Short-term outlook</h3>
                <p className="text-[11px] text-vscode-foreground/70">Predicted line + confidence band</p>
              </div>
              <span className="text-[11px] text-vscode-foreground/70">
                {forecast?.generatedAt ? `Generated: ${formatTime(forecast.generatedAt)}` : ' '}
              </span>
            </div>

            <div className="h-44">
              {isLoading ? (
                <div className="h-full rounded-md bg-vscode-list-hover-bg animate-pulse" />
              ) : isError ? (
                <div className="h-full flex items-center justify-center rounded-md border border-vscode-widget-border bg-vscode-editor-bg p-3">
                  <p className="text-sm text-red-400">{ui.message}</p>
                </div>
              ) : (
                <Line data={chartData} options={chartOptions} />
              )}
            </div>

            {forecast?.note && <p className="mt-2 text-[11px] text-vscode-foreground/70">{forecast.note}</p>}
          </div>

          <div className="rounded-lg border border-vscode-widget-border bg-vscode-input-bg/30 p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-vscode-editor-fg">Daily values</h3>
              <span className="text-[11px] text-vscode-foreground/70">lower–upper</span>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                <div className="h-8 rounded bg-vscode-list-hover-bg animate-pulse" />
                <div className="h-8 rounded bg-vscode-list-hover-bg animate-pulse" />
                <div className="h-8 rounded bg-vscode-list-hover-bg animate-pulse" />
                <div className="h-8 rounded bg-vscode-list-hover-bg animate-pulse" />
              </div>
            ) : isError ? (
              <div className="rounded-md border border-vscode-widget-border bg-vscode-editor-bg p-3">
                <p className="text-sm text-red-400">{ui.message}</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-md border border-vscode-widget-border">
                <table className="w-full text-sm">
                  <thead className="bg-vscode-list-hover-bg">
                    <tr>
                      <th className="text-left font-semibold text-vscode-editor-fg px-3 py-2">Date</th>
                      <th className="text-right font-semibold text-vscode-editor-fg px-3 py-2">Forecast</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vscode-widget-border">
                    {(forecast?.points ?? []).map((p) => (
                      <tr key={p.date} className="hover:bg-vscode-list-hover-bg/70 transition-colors">
                        <td className="px-3 py-2 text-vscode-editor-fg">{p.date}</td>
                        <td className="px-3 py-2 text-right">
                          <span className="font-semibold text-vscode-editor-fg">{p.productiveMinutes} min</span>
                          <span className="ml-2 text-xs text-vscode-foreground/70">
                            ({p.lower ?? '-'}–{p.upper ?? '-'})
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Explain + Planning */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Explainability */}
          <div className="rounded-lg border border-vscode-widget-border bg-vscode-input-bg/30 p-3 lg:col-span-1">
            <h3 className="text-xs font-semibold text-vscode-editor-fg">Why the assistant expects this</h3>
            <p className="text-[11px] text-vscode-foreground/70 mt-1">Top signals used by the model</p>

            <div className="mt-3 space-y-2">
              {isLoading ? (
                <>
                  <div className="h-12 rounded bg-vscode-list-hover-bg animate-pulse" />
                  <div className="h-12 rounded bg-vscode-list-hover-bg animate-pulse" />
                  <div className="h-12 rounded bg-vscode-list-hover-bg animate-pulse" />
                </>
              ) : (
                (explain?.globalTopFeatures ?? []).slice(0, 6).map((x) => (
                  <div key={x.feature} className="rounded-lg border border-vscode-widget-border bg-vscode-editor-bg/30 p-2">
                    <div className="text-xs font-semibold text-vscode-editor-fg">{friendlyFeatureName(x.feature)}</div>
                    <div className="text-[11px] text-vscode-foreground/70">
                      Importance: {Math.round(x.importance).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>

            {explain?.note && <div className="mt-3 text-[11px] text-vscode-foreground/60">{explain.note}</div>}
          </div>

          {/* Planning */}
          <div className="rounded-lg border border-vscode-widget-border bg-vscode-input-bg/30 p-3 lg:col-span-2">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold text-vscode-editor-fg">Set a goal → get a plan</h3>
                <p className="text-[11px] text-vscode-foreground/70">This output is chatbot-ready.</p>
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
                  onClick={onGeneratePlan}
                  disabled={planState.status === 'loading'}
                  className="px-4 py-2 rounded-lg border border-vscode-widget-border bg-vscode-button-bg text-vscode-button-fg text-sm font-semibold
                             hover:opacity-95 disabled:opacity-60"
                >
                  {planState.status === 'loading' ? 'Planning…' : 'Generate Plan'}
                </button>
              </div>
            </div>

            <div className="mt-4">
              {planState.status === 'idle' ? (
                <div className="rounded-lg border border-vscode-widget-border bg-vscode-editor-bg/25 p-3 text-sm text-vscode-foreground/70">
                  Try a goal above (example: day 2h, week 10h). The assistant will check feasibility and suggest time slots.
                </div>
              ) : planState.status === 'error' ? (
                <div className="rounded-lg border border-vscode-widget-border bg-vscode-editor-bg p-3">
                  <p className="text-sm text-red-400">{planState.message}</p>
                </div>
              ) : planState.status === 'ready' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div className="lg:col-span-2 rounded-lg border border-vscode-widget-border bg-vscode-editor-bg/25 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-vscode-editor-fg">Plan</div>
                      <span
                        className={`text-xs px-2 py-1 rounded-md border ${
                          planState.data.feasible ? badgeTone('improving') : badgeTone('declining')
                        }`}
                      >
                        {planState.data.feasible ? 'Feasible' : 'Adjust target'}
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-vscode-foreground/70">{planState.data.reason}</div>

                    <div className="mt-3 overflow-hidden rounded-md border border-vscode-widget-border">
                      <table className="w-full text-sm">
                        <thead className="bg-vscode-list-hover-bg">
                          <tr>
                            <th className="text-left font-semibold text-vscode-editor-fg px-3 py-2">Date</th>
                            <th className="text-right font-semibold text-vscode-editor-fg px-3 py-2">Hours</th>
                            <th className="text-right font-semibold text-vscode-editor-fg px-3 py-2">Window</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-vscode-widget-border">
                          {planState.data.plan.map((p) => (
                            <tr key={p.date} className="hover:bg-vscode-list-hover-bg/70 transition-colors">
                              <td className="px-3 py-2 text-vscode-editor-fg">{p.date}</td>
                              <td className="px-3 py-2 text-right text-vscode-editor-fg font-semibold">{p.hours}</td>
                              <td className="px-3 py-2 text-right text-vscode-foreground/80">{p.window}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-lg border border-vscode-widget-border bg-vscode-editor-bg/25 p-3">
                    <div className="text-sm font-semibold text-vscode-editor-fg">Chatbot preview</div>
                    <div className="mt-2 text-sm text-vscode-editor-fg whitespace-pre-wrap">
                      {planState.data.chatMessage || '—'}
                    </div>

                    {planState.data.recommendedSlots?.length ? (
                      <div className="mt-3">
                        <div className="text-xs text-vscode-foreground/70 mb-2">Suggested slots</div>
                        <div className="flex flex-wrap gap-2">
                          {planState.data.recommendedSlots.map((s, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-1 rounded-md border border-vscode-widget-border bg-vscode-widget-bg text-vscode-editor-fg"
                            >
                              {s.label} • {s.start}–{s.end}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
