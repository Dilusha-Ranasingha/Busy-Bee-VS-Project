import React, { useState } from 'react';

interface PlanGeneratorFormProps {
  onGenerate: (startDate: string, endDate: string, targetHours: number) => void;
  isGenerating: boolean;
  error: string | null;
}

const PlanGeneratorForm: React.FC<PlanGeneratorFormProps> = ({
  onGenerate,
  isGenerating,
  error,
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [targetHours, setTargetHours] = useState<number>(40);

  // Set default dates (today to 7 days from now)
  React.useEffect(() => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 6); // +6 days to make it 7 days inclusive
    
    setStartDate(today.toISOString().split('T')[0]);
    setEndDate(nextWeek.toISOString().split('T')[0]);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startDate || !endDate || !targetHours) {
      return;
    }

    onGenerate(startDate, endDate, targetHours);
  };

  const getDaysCount = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    // Calculate difference in days (inclusive)
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // +1 to make it inclusive
  };

  const getAvgHoursPerDay = () => {
    const days = getDaysCount();
    if (days === 0) return 0;
    return (targetHours / days).toFixed(1);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">Create Productivity Plan</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            aria-label="Plan start date"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            min={startDate}
            aria-label="Plan end date"
          />
        </div>

        {/* Target Hours */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Target Hours
          </label>
          <input
            type="number"
            value={targetHours}
            onChange={(e) => setTargetHours(Number(e.target.value))}
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            min={1}
            max={200}
            aria-label="Target hours"
          />
          <p className="text-sm text-gray-400 mt-1">
            Total hours you want to work during this period
          </p>
        </div>

        {/* Summary */}
        {startDate && endDate && targetHours > 0 && (
          <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Duration:</span>
              <span className="text-white font-semibold">{getDaysCount()} days</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Avg Hours/Day:</span>
              <span className="text-white font-semibold">{getAvgHoursPerDay()} hours</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isGenerating || !startDate || !endDate || !targetHours}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Generating Plan...
            </span>
          ) : (
            'Generate Plan'
          )}
        </button>
      </form>
    </div>
  );
};

export default PlanGeneratorForm;
