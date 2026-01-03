import { useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { getForecast } from './api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

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
  try {
    return JSON.stringify(err);
  } catch {
    return 'Failed to load forecast';
  }
}

export default function ForecastWidget() {
  const [state, setState] = useState<UiState>({ status: 'loading' });

  // demo values for now
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

  const chartData = useMemo(() => {
    const points = data?.points ?? [];
    return {
      labels: points.map((p) => p.date),
      datasets: [
        {
          label: 'Productive minutes',
          data: points.map((p) => p.productiveMinutes),
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 3,
        },
      ],
    };
  }, [data]);

  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true },
      },
    } as const;
  }, []);

  const peak = useMemo(() => {
    if (!data?.points?.length) return null;
    return data.points.reduce((best, p) =>
      p.productiveMinutes > best.productiveMinutes ? p : best
    );
  }, [data]);

  return (
    <section className="rounded-xl border border-vscode-widget-border bg-vscode-widget-bg shadow-vscode overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-vscode-widget-border flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-vscode-editor-fg">
            Productive Minutes Forecast
          </h2>
          <p className="text-sm text-vscode-foreground/70">
            User: <span className="font-medium text-vscode-editor-fg">{userId}</span> • Next {days}{' '}
            days
          </p>
        </div>

        <div className="text-right">
          {peak ? (
            <div className="inline-flex flex-col items-end">
              <span className="text-xs text-vscode-foreground/70">Peak day</span>
              <span className="text-sm font-semibold text-vscode-editor-fg">
                {peak.date} • {peak.productiveMinutes} min
              </span>
            </div>
          ) : (
            <span className="text-xs text-vscode-foreground/70">—</span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 grid gap-5 lg:grid-cols-2">
        {/* Chart */}
        <div className="rounded-lg border border-vscode-widget-border bg-vscode-input-bg/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-vscode-editor-fg">Trend</h3>
            <span className="text-xs text-vscode-foreground/70">
              Generated: {data?.generatedAt ? formatTime(data.generatedAt) : '—'}
            </span>
          </div>

          <div className="h-52">
            {state.status === 'loading' ? (
              <div className="h-full rounded-md bg-vscode-list-hover-bg animate-pulse" />
            ) : state.status === 'error' ? (
              <div className="h-full flex items-center justify-center rounded-md border border-vscode-widget-border bg-vscode-editor-bg">
                <p className="text-sm text-red-400">{state.message}</p>
              </div>
            ) : (
              <Line data={chartData} options={chartOptions} />
            )}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-vscode-widget-border bg-vscode-input-bg/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-vscode-editor-fg">Daily values</h3>
            <span className="text-xs text-vscode-foreground/70">Range (lower–upper)</span>
          </div>

          {state.status === 'loading' ? (
            <div className="space-y-2">
              <div className="h-9 rounded bg-vscode-list-hover-bg animate-pulse" />
              <div className="h-9 rounded bg-vscode-list-hover-bg animate-pulse" />
              <div className="h-9 rounded bg-vscode-list-hover-bg animate-pulse" />
              <div className="h-9 rounded bg-vscode-list-hover-bg animate-pulse" />
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

          {data?.note && <p className="mt-3 text-xs text-vscode-foreground/70">{data.note}</p>}
        </div>
      </div>
    </section>
  );
}
