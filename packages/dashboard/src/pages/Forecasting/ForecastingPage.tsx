import ForecastWidget from '../../features/forecasting/ForecastWidget';

export default function ForecastingPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-vscode-editor-fg">Forecasting</h1>
          <p className="text-sm text-vscode-foreground/70">
            Short-term prediction for the next 7 days (baseline model).  
            Later we’ll extend with more KPIs and ML models.
          </p>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs
                         border border-vscode-widget-border bg-vscode-input-bg text-vscode-editor-fg">
          Baseline • Focus Streak
        </span>
      </div>

      <ForecastWidget />
    </div>
  );
}
