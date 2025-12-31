export type ForecastPoint = {
  date: string;                 // YYYY-MM-DD
  productiveMinutes: number;    // predicted productive minutes
  lower?: number;               // optional confidence band
  upper?: number;
};

export type ForecastResponse = {
  userId: string;
  horizonDays: number;
  generatedAt: string;          // ISO timestamp
  points: ForecastPoint[];
  note?: string;                // for dev/testing
};
