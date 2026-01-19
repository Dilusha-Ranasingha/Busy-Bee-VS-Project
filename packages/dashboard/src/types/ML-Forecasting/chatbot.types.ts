// Chatbot Types

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: ForecastData | PlanData;
}

export interface ForecastData {
  type: 'forecast';
  predictions: Array<{
    date: string;
    kpi: string;
    value: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  summary: string;
}

export interface PlanData {
  type: 'plan';
  startDate: string;
  endDate: string;
  targetHours: number;
  isFeasible: boolean;
  feasibilityScore: number;
  schedule: Array<{
    date: string;
    hours: number;
    productivity: 'high' | 'medium' | 'low';
  }>;
  warnings: Array<{
    message: string;
    severity: 'high' | 'medium' | 'low';
  }>;
}

export interface ChatRequest {
  user_id: string;
  message: string;
  conversation_history?: ChatMessage[];
}

export interface ChatResponse {
  status: 'success' | 'error';
  message: string;
  data?: ForecastData | PlanData;
  suggested_prompts?: string[];
}

export interface SuggestedPrompt {
  id: string;
  text: string;
  icon: string;
  category: 'forecast' | 'plan' | 'analysis';
}
