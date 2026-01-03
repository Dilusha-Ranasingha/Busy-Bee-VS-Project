import ForecastWidget from '../../features/forecasting/ForecastWidget';

export default function ForecastingPage() {
  return (
    <div className="mx-auto w-full max-w-[820px] space-y-4">
      {/* Compact header for sidebar */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-vscode-editor-fg">Forecasting</h1>
          <p className="text-sm text-vscode-foreground/70">
            Next 7 days forecast (baseline). Chatbot will explain this in simple language later.
          </p>
        </div>

        <span className="shrink-0 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs
                         border border-vscode-widget-border bg-vscode-input-bg text-vscode-editor-fg">
          Baseline • Focus Streak
        </span>
      </div>

      <ForecastWidget />
    </div>
  );
}
