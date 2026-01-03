import ForecastWidget from '../../features/forecasting/ForecastWidget';

export default function ForecastingPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Forecasting</h1>
          <p className="text-sm text-white/60">
            Short-term productivity forecast based on Focus Streak (baseline model).
          </p>
        </div>

        {/* Later we can add dropdown filters here */}
        <span className="text-xs text-white/50">
          Horizon: 7 days
        </span>
      </div>

      <ForecastWidget />
    </div>
  );
}
