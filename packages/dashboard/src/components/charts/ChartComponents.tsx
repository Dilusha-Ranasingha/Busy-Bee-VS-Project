import type { ReactNode } from 'react';

interface KpiCardProps {
  title: string;
  value: number;
}

export function KpiCard({ title, value }: KpiCardProps) {
  return (
    <div className="bg-vscode-widget-bg rounded-xl shadow-vscode ring-1 ring-vscode-widget-border p-4">
      <div className="text-sm text-vscode-description">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-vscode-foreground">
        {Number(value || 0).toLocaleString()}
      </div>
    </div>
  );
}

interface ChartCardProps {
  title: string;
  description?: string;
  className?: string;
  children: ReactNode;
}

export function ChartCard({ title, description, className = '', children }: ChartCardProps) {
  return (
    <section className={`bg-vscode-widget-bg rounded-xl shadow-vscode ring-1 ring-vscode-widget-border p-4 ${className}`}>
      <header className="mb-2">
        <h3 className="text-lg font-semibold leading-6 text-vscode-foreground">{title}</h3>
        {description && <p className="text-sm text-vscode-description">{description}</p>}
      </header>
      <div className="py-2 flex items-center justify-center">{children}</div>
    </section>
  );
}

export function EmptyState() {
  return <div className="text-vscode-description text-sm">No data</div>;
}

export function ChartSkeleton() {
  return (
    <div className="w-full flex items-center justify-center gap-2 text-vscode-description">
      <svg
        className="size-4 animate-spin text-brand-primary"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
        <path
          className="opacity-75"
          d="M4 12a8 8 0 018-8"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      <span>Loading…</span>
    </div>
  );
}
