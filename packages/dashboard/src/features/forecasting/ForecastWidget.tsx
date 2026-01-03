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
import { getForecast } from './api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

type ForecastPoint = {
  date: string;
  productiveMinutes: number;
  lower?: number;
  upper?: number;
};

type ForecastResponse = {
  userId: string;
  horizonDays: number;
  generatedAt: string;
  points: ForecastPoint[];
  note?: string;
};

type UiState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: ForecastResponse };

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
  return 'Failed to load forecast';
}

function cssVar(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export default function ForecastWidget() {
  const [state, setState] = useState<UiState>({ status: 'loading' });

  // demo values (later replace with real user)
  const userId = 'testUser';
  const days = 7;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await getForecast(userId, days);
        if (cancelled) return;
        setState({ status: 'ready', data: res });
      } catch (e: unknown) {
        if (cancelled) return;
        setState({ status: 'error', message: getErrorMessage(e) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const data = state.status === 'ready' ? state.data : null;

  const peak = useMemo(() => {
    if (!data?.points?.length) return null;
    return data.points.reduce((best, p) =>
      p.productiveMinutes > best.productiveMinutes ? p : best
    );
  }, [data]);

  const chartTheme = useMemo(() => {
    const fg = cssVar('--vscode-editor-foreground', '#e5e7eb');
    const grid = cssVar('--vscode-widget-border', 'rgba(255,255,255,0.12)');
    const accent = cssVar('--vscode-focusBorder', '#3b82f6');
    const tooltipBg = cssVar('--vscode-editorHoverWidget-background', '#111827');
    const tooltipBorder = cssVar('--vscode-editorHoverWidget-border', grid);

    return { fg, grid, accent, tooltipBg, tooltipBorder };
  }, [state.status]);

  const chartData = useMemo(() => {
    const points = data?.points ?? [];
    return {
      labels: points.map((p) => p.date),
      datasets: [
        {
          label: 'Productive minutes',
          data: points.map((p) => p.productiveMinutes),
          borderColor: chartTheme.accent,
          backgroundColor: chartTheme.accent,
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    };
  }, [data, chartTheme.accent]);

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
              const y = item.parsed.y; // number | null
              if (y === null) return '';
              return `${y} min`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: chartTheme.fg,
            maxRotation: 0,
            autoSkip: true,
          },
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

  return (
    <section className="rounded-xl border border-vscode-widget-border bg-vscode-widget-bg shadow-vscode overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-vscode-widget-border flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-vscode-editor-fg truncate">
            Productive Minutes Forecast
          </h2>
          <p className="text-xs text-vscode-foreground/70">
            User: <span className="font-medium text-vscode-editor-fg">{userId}</span> • Next {days}{' '}
            days
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

      {/* Body */}
      <div className="p-4 grid gap-4 lg:grid-cols-2">
        {/* Chart */}
        <div className="rounded-lg border border-vscode-widget-border bg-vscode-input-bg/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-vscode-editor-fg">Trend</h3>
            <span className="text-[11px] text-vscode-foreground/70">
              {data?.generatedAt ? `Generated: ${formatTime(data.generatedAt)}` : ' '}
            </span>
          </div>

          <div className="h-44">
            {state.status === 'loading' ? (
              <div className="h-full rounded-md bg-vscode-list-hover-bg animate-pulse" />
            ) : state.status === 'error' ? (
              <div className="h-full flex items-center justify-center rounded-md border border-vscode-widget-border bg-vscode-editor-bg p-3">
                <p className="text-sm text-red-400">{state.message}</p>
              </div>
            ) : (
              <Line data={chartData} options={chartOptions} />
            )}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-vscode-widget-border bg-vscode-input-bg/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-vscode-editor-fg">Daily values</h3>
            <span className="text-[11px] text-vscode-foreground/70">lower–upper</span>
          </div>

          {state.status === 'loading' ? (
            <div className="space-y-2">
              <div className="h-8 rounded bg-vscode-list-hover-bg animate-pulse" />
              <div className="h-8 rounded bg-vscode-list-hover-bg animate-pulse" />
              <div className="h-8 rounded bg-vscode-list-hover-bg animate-pulse" />
              <div className="h-8 rounded bg-vscode-list-hover-bg animate-pulse" />
            </div>
          ) : state.status === 'error' ? (
            <div className="rounded-md border border-vscode-widget-border bg-vscode-editor-bg p-3">
              <p className="text-sm text-red-400">{state.message}</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-vscode-widget-border">
              <table className="w-full text-sm">
                <thead className="bg-vscode-list-hover-bg">
                  <tr>
                    <th className="text-left font-semibold text-vscode-editor-fg px-3 py-2">Date</th>
                    <th className="text-right font-semibold text-vscode-editor-fg px-3 py-2">
                      Forecast
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vscode-widget-border">
                  {data!.points.map((p) => (
                    <tr key={p.date} className="hover:bg-vscode-list-hover-bg/70 transition-colors">
                      <td className="px-3 py-2 text-vscode-editor-fg">{p.date}</td>
                      <td className="px-3 py-2 text-right">
                        <span className="font-semibold text-vscode-editor-fg">
                          {p.productiveMinutes} min
                        </span>
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

          {data?.note && <p className="mt-2 text-[11px] text-vscode-foreground/70">{data.note}</p>}
        </div>
      </div>
    </section>
  );
}
