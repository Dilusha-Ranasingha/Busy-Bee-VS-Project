import type { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { MLForecastingService } from './mlForecasting.service';
import { getPool } from '../../config/db';

// Lazy initialization of Gemini AI
let genAI: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    console.log('[Chatbot] Initializing Gemini with API key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING');
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

// Track recent Gemini quota hits to avoid spamming requests
let lastGeminiQuotaHit = 0;

// Lazy-load the service after database connection
let mlForecastingService: MLForecastingService | null = null;
function getMLService(): MLForecastingService {
  if (!mlForecastingService) {
    mlForecastingService = new MLForecastingService(getPool());
  }
  return mlForecastingService;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SuggestedPrompt {
  id: string;
  text: string;
  category: string;
  icon: string;
}

/**
 * Extract date range from user message using Gemini
 */
async function extractDateRange(message: string): Promise<{ startDate?: string; endDate?: string }> {
  // Allow disabling Gemini date extraction via env to avoid quota errors
  if (process.env.GEMINI_DATES_DISABLED === '1') {
    return {};
  }

  // Cooldown if we recently hit Gemini quota
  if (Date.now() - lastGeminiQuotaHit < 10 * 60 * 1000) {
    return {};
  }

  const prompt = `Extract date information from this message: "${message}"
  
  If the message mentions:
  - "tomorrow" - return tomorrow's date
  - "next week" - return start and end of next week
  - "next 7 days" - return today + 7 days
  - "Friday" or specific day - return that day's date
  - Specific dates - extract them
  
  Return ONLY a JSON object with startDate and endDate in YYYY-MM-DD format.
  If no dates mentioned, return empty object {}.
  
  Today is ${new Date().toISOString().split('T')[0]}.
  
  Response format: {"startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD"}`;

  try {
    const result = await getGenAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const text = result.text?.trim() || '';
    
    // Try to extract JSON from response
    const jsonMatch = text.match(/\{[^}]+\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return {};
  } catch (error: any) {
    console.error('Date extraction error:', error);
    if (error?.status === 429) {
      lastGeminiQuotaHit = Date.now();
    }
    // Fallback: return empty date range to continue without blocking plan/forecast
    return {};
  }
}

/**
 * Determine user intent (forecast, plan, analysis) using simple keyword matching
 * Optimized to avoid extra API calls and rate limits
 */
function determineIntent(message: string): 'forecast' | 'plan' | 'analysis' | 'general' {
  const lowerMessage = message.toLowerCase();
  
  // Analysis keywords (highest priority - "when should")
  if (lowerMessage.match(/when\s+should|what\s+time|best\s+time|schedule\s+deep/)) {
    return 'analysis';
  }
  
  // Plan keywords (check before forecast to catch "work X hours", "create plan")
  // Must have explicit plan/create/generate or work hours mentioned
  if (lowerMessage.match(/create.*plan|generate.*plan|\bplan\s+for|work.*plan|\d+-day\s+plan|can\s+i\s+work.*hours/)) {
    return 'plan';
  }
  
  // Forecast keywords (specific metrics or future predictions)
  // "focus", "error rate", "productive", "tomorrow", "Friday", etc.
  if (lowerMessage.match(/how.*focus|predict|forecast|will\s+(i|my|you)|tomorrow|next\s+(week|day)|friday|monday|tuesday|wednesday|thursday|error\s+rate|produc/)) {
    return 'forecast';
  }
  
  // General analysis keywords
  if (lowerMessage.match(/how\s+(can|should)|insight|trend|pattern|improv|analyz/)) {
    return 'analysis';
  }
  
  return 'general';
}

/**
 * Format forecast data for conversational response
 */
function formatForecastResponse(forecast: any, userMessage: string = ''): string {
  const predictions = Array.isArray(forecast?.predictions) ? forecast.predictions : [];
  
  if (predictions.length === 0) {
    return "I couldn't generate a forecast at this time. Please try again later.";
  }

  // Map ML metric names to friendly display names
  const metricDisplayNames: { [key: string]: string } = {
    'focus_streak_longest_global': 'Focus Streak',
    'file_switch_avg_rate': 'File Switch Rate',
    'edit_session_total_duration': 'Editing Time',
    'diagnostics_avg_density': 'Code Issues',
    'error_fix_time_avg': 'Error Fix Time',
    'commits_daily_total': 'Daily Commits',
    'idle_distraction_time': 'Idle Time',
  };

  const lowerMsg = userMessage.toLowerCase();
  
  // Detect what the user is asking about
  const askingAboutFocus = lowerMsg.includes('focus');
  const askingAboutErrors = lowerMsg.includes('error');
  const askingAboutProductivity = lowerMsg.includes('produc');
  const askingAboutNextWeek = lowerMsg.includes('next week');
  
  // Check if asking about specific day
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const askedDay = dayNames.find(day => lowerMsg.includes(day));
  
  // Get the right prediction based on question
  let targetPrediction = predictions[0] || {};
  let targetDate = 'tomorrow';
  
  if (askedDay) {
    // Find prediction for that specific day of week
    const targetDayIndex = dayNames.indexOf(askedDay);
    const foundPred = predictions.find((p: any) => {
      const predDate = new Date(p.date);
      return predDate.getDay() === targetDayIndex;
    });
    if (foundPred) {
      targetPrediction = foundPred;
      targetDate = new Date(foundPred.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    } else {
      targetDate = askedDay.charAt(0).toUpperCase() + askedDay.slice(1);
    }
  } else if (askingAboutNextWeek) {
    // For "next week", show overview of all days
    targetDate = 'next week';
  } else {
    // Default to tomorrow
    targetDate = targetPrediction.date ? 
      new Date(targetPrediction.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : 
      'tomorrow';
  }
  
  let response = '';
  
  // Customize response based on question
  if (askingAboutNextWeek) {
    // Show overview of whole week
    response = `**📊 Productivity Forecast for Next Week:**\n\n`;
    
    const weekMetrics = predictions.slice(0, 7);
    const avgFocus = weekMetrics.reduce((sum: number, p: any) => sum + (p.focus_streak_longest_global || 0), 0) / weekMetrics.length;
    const avgErrors = weekMetrics.reduce((sum: number, p: any) => sum + (p.diagnostics_avg_density || 0), 0) / weekMetrics.length;
    
    response += `🎯 **Avg Focus**: ${avgFocus.toFixed(0)} min/day\n`;
    response += `🐛 **Avg Errors**: ${avgErrors.toFixed(1)} per KLOC\n`;
    response += `📅 **${weekMetrics.length} days** forecasted\n`;
    
    if (avgFocus > 60) {
      response += "\n✨ Strong focus week ahead - ideal for complex projects!";
    } else if (avgFocus > 40) {
      response += "\n👍 Balanced productivity week - mix deep work with collaboration.";
    } else {
      response += "\n💡 Lighter focus week - good time for learning and planning.";
    }
  } else if (askingAboutFocus) {
    const focusValue = targetPrediction.focus_streak_longest_global || 0;
    response = `**Focus Forecast for ${targetDate}:**\n\n`;
    response += `🎯 **Focus Streak**: ${focusValue.toFixed(0)} minutes\n`;
    if (focusValue > 60) {
      response += "\nGreat news! You'll likely have excellent focus. Perfect for deep work! 🚀";
    } else if (focusValue > 40) {
      response += "\nModerate focus expected. Break tasks into 45-minute chunks.";
    } else {
      response += "\nFocus might be challenging. Consider shorter work sessions with more breaks.";
    }
  } else if (askingAboutErrors) {
    const errorDensity = targetPrediction.diagnostics_avg_density || 0;
    const errorFixTime = targetPrediction.error_fix_time_avg || 0;
    response = `**Error Rate Forecast for ${targetDate}:**\n\n`;
    response += `🐛 **Error Density**: ${errorDensity.toFixed(1)} per KLOC\n`;
    response += `⏱️ **Avg Fix Time**: ${errorFixTime.toFixed(0)} minutes\n`;
    if (errorDensity < 5) {
      response += "\nLow error rate predicted - great coding day ahead!";
    } else {
      response += "\nHigher error rate expected. Plan extra time for debugging.";
    }
  } else {
    // General productivity forecast
    const metrics = Object.entries(targetPrediction)
      .filter(([key]) => key !== 'date')
      .map(([key, val]) => ({
        key,
        name: metricDisplayNames[key] || key.replace(/_/g, ' '),
        value: Number(val) || 0,
      }))
      .filter((m) => m.value > 0)
      .slice(0, 4);
    
    if (metrics.length === 0) {
      return "I couldn't generate a forecast at this time. Please try again later.";
    }
    
    response = `**Productivity Forecast for ${targetDate}:**\n\n`;
    metrics.forEach((metric) => {
      response += `📊 **${metric.name}**: ${metric.value.toFixed(1)}\n`;
    });
    
    const focusValue = targetPrediction.focus_streak_longest_global || 0;
    if (focusValue > 60) {
      response += "\n✨ High productivity expected - great day for complex tasks!";
    } else if (focusValue > 40) {
      response += "\n👍 Moderate productivity - plan balanced workload.";
    } else {
      response += "\n💡 Lower focus predicted - consider lighter tasks.";
    }
  }

  return response;
}

/**
 * Format plan data for conversational response
 */
function formatPlanResponse(plan: any, userMessage: string = ''): string {
  const is_feasible = !!plan?.is_feasible;
  const feasibility_score = plan?.feasibility_score ?? 0;
  const daily_schedule = Array.isArray(plan?.daily_schedule) ? plan.daily_schedule : [];
  const warnings = Array.isArray(plan?.warnings) ? plan.warnings : [];
  const targetHours = plan?.target_hours || 40;
  const planDays = daily_schedule.length;

  let response = "";

  // Extract context from user message
  const lowerMsg = userMessage.toLowerCase();
  const dayCount = lowerMsg.match(/(\d+)-day/) ? parseInt(lowerMsg.match(/(\d+)-day/)![1]) : planDays;
  
  if (is_feasible) {
    response += `✅ **Great news!** I've created a feasible ${dayCount}-day work plan with **${feasibility_score.toFixed(0)}% confidence**.\n\n`;
  } else {
    response += `⚠️ **${targetHours} hours in ${dayCount} days is challenging** (${feasibility_score.toFixed(0)}% feasibility).\n\nHere's the best plan I could create:\n\n`;
  }

  // Add schedule summary - show all days for shorter plans, top 3 for longer
  const displayDays = planDays <= 5 ? daily_schedule : daily_schedule.slice(0, 3);
  
  response += "**📅 Your Schedule:**\n";
  displayDays.forEach((day: any) => {
    const emoji = day.productivity_level === 'high' ? '🟢' : day.productivity_level === 'medium' ? '🟡' : '🔴';
    const hours = day.allocated_hours ?? day.hours ?? 0;
    const date = day.date ? new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
    response += `${emoji} **${date}**: ${hours.toFixed(1)}h (${day.productivity_level} productivity)\n`;
  });

  if (daily_schedule.length > displayDays.length) {
    response += `...and ${daily_schedule.length - displayDays.length} more days\n`;
  }

  // Add warnings
  if (warnings.length > 0) {
    response += "\n⚠️ **Important Notes:**\n";
    warnings.slice(0, 2).forEach((warning: any) => {
      const warningText = typeof warning === 'string' ? warning : warning.message || '';
      response += `• ${warningText}\n`;
    });
  }

  return response;
}

/**
 * Handle chat message from user
 */
export async function handleChatMessage(req: Request, res: Response): Promise<void> {
  try {
    const { user_id, message, conversation_history } = req.body;

    if (!user_id || !message) {
      res.status(400).json({ error: 'user_id and message are required' });
      return;
    }

    console.log(`[Chatbot] Processing message for user ${user_id}: ${message}`);

    // Step 1: Determine intent (using keyword matching to save API calls)
    const intent = determineIntent(message);
    console.log(`[Chatbot] Intent: ${intent}`);

    // Step 2: Extract date range if needed (only for forecast/plan intents)
    let dateRange: any = {};
    if (intent === 'forecast' || intent === 'plan') {
      dateRange = await extractDateRange(message);
      console.log(`[Chatbot] Date range:`, dateRange);
    }

    let responseText = '';
    let responseData: any = null;

    // Step 3: Execute based on intent
    if (intent === 'forecast') {
      // Determine forecast duration based on message
      const lowerMsg = message.toLowerCase();
      let forecastDays = 1; // Default to tomorrow
      
      if (lowerMsg.includes('next week') || lowerMsg.includes('7 day')) {
        forecastDays = 7;
      } else if (lowerMsg.includes('tomorrow')) {
        forecastDays = 1;
      } else if (lowerMsg.includes('friday') || lowerMsg.includes('monday') || lowerMsg.includes('tuesday') || 
                 lowerMsg.includes('wednesday') || lowerMsg.includes('thursday') || lowerMsg.includes('saturday') || 
                 lowerMsg.includes('sunday')) {
        // For specific day questions, get forecast for next 7 days and filter later
        forecastDays = 7;
      }
      
      // Call ML forecasting service
      const forecast = await getMLService().getForecast(user_id, forecastDays);
      
      console.log(`[Chatbot] ML forecast returned ${forecast.predictions?.length} predictions`);
      if (forecast.predictions?.length > 0) {
        console.log(`[Chatbot] Sample prediction dates:`, forecast.predictions.slice(0, 3).map((p: any) => p.date));
      }
      
      responseText = formatForecastResponse(forecast, message);
      
      // Detect if asking about a specific day (reuse lowerMsg from above)
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const askedDay = dayNames.find(day => lowerMsg.includes(day));
      
      // Transform raw ML predictions to frontend ForecastData format
      // ML returns: { date: string, metric_name: value, ... }
      // Frontend expects: { date, kpi, value, trend }
      let relevantPredictions = forecast.predictions || [];
      
      // If asking about specific day, filter to only that day
      if (askedDay && !lowerMsg.includes('next week')) {
        const targetDayIndex = dayNames.indexOf(askedDay);
        relevantPredictions = relevantPredictions.filter((pred: any) => {
          const predDate = new Date(pred.date);
          return predDate.getDay() === targetDayIndex;
        });
        console.log(`[Chatbot] Filtered to ${askedDay}: ${relevantPredictions.length} predictions`);
      }
      
      const predictions = relevantPredictions
        .flatMap((pred: any) => {
          return Object.entries(pred)
            .filter(([key]) => key !== 'date')
            .map(([key, value]) => ({
              date: pred.date,
              kpi: key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2'),
              value: Number(value) || 0,
              trend: 'stable' as const,
            }));
        })
        .filter((p) => p.value > 0)
        .slice(0, 10);

      responseData = {
        type: 'forecast',
        data: {
          type: 'forecast',
          predictions,
          summary: responseText,
        },
      };

    } else if (intent === 'plan') {
      // Extract day count from message first
      const lowerMsg = message.toLowerCase();
      let planDays = 7; // Default to 7 days
      const dayMatch = lowerMsg.match(/(\d+)-day/);
      if (dayMatch) {
        planDays = Math.min(parseInt(dayMatch[1]), 7); // Cap at 7 days
      } else if (lowerMsg.includes('week')) {
        planDays = 7;
      } else if (lowerMsg.includes('5')) {
        planDays = 5;
      }
      
      // Extract working hours if mentioned, otherwise scale based on plan days
      const hoursMatch = message.match(/(\d+)\s*hours?/i);
      const targetHours = hoursMatch ? parseInt(hoursMatch[1]) : (planDays * 6); // 6 hours per day default

      const planParams = {
        user_id,
        start_date: dateRange.startDate || new Date().toISOString().split('T')[0],
        // Calculate end date based on extracted day count
        end_date:
          dateRange.endDate ||
          new Date(Date.now() + (planDays - 1) * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
        target_hours: targetHours,
      };

      const plan = await getMLService().generatePlan(
        planParams.user_id,
        planParams.start_date,
        planParams.end_date,
        planParams.target_hours
      );

      if (!plan || plan.status === 'error') {
        const message = plan?.message || 'I could not create a plan right now.';
        responseText = `I couldn't create a plan: ${message}`;
        responseData = null;
      } else {
        responseText = formatPlanResponse(plan, message);

        // Transform schedule to match frontend expectations
        const transformedSchedule = (plan.daily_schedule || []).map((day: any) => ({
          date: day.date,
          hours: day.allocated_hours || day.hours || 0,
          productivity: day.productivity_level || day.productivity || 'low'
        }));

        // Transform warnings to match frontend expectations
        const transformedWarnings = (plan.warnings || []).map((warning: any) => ({
          message: typeof warning === 'string' ? warning : warning.message || '',
          severity: (warning.severity || 'medium') as 'high' | 'medium' | 'low'
        }));

        responseData = {
          type: 'plan',
          data: {
            type: 'plan',
            startDate: planParams.start_date,
            endDate: planParams.end_date,
            targetHours: planParams.target_hours,
            isFeasible: plan.is_feasible || false,
            feasibilityScore: plan.feasibility_score || 0,
            schedule: transformedSchedule,
            warnings: transformedWarnings
          }
        };
      }
    } else if (intent === 'analysis') {
      // Use Gemini to provide general insights
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        responseText = 'AI analysis is unavailable because GEMINI_API_KEY is not configured on the server.';
      } else {
        try {
          const conversationContext = conversation_history
            ?.map((msg: ChatMessage) => `${msg.role}: ${msg.content}`)
            .join('\n') || '';

          const analysisPrompt = `You are a helpful productivity AI assistant. The user asked: "${message}"
          
          Conversation history:
          ${conversationContext}
          
          Provide helpful insights about developer productivity, work patterns, or general advice.
          Keep response friendly and conversational (2-3 sentences).`;

          const result = await getGenAI().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: analysisPrompt }] }],
          });
          responseText = result.text || '';
        } catch (gemErr: any) {
          console.error('[Chatbot] Gemini analysis error:', gemErr);
          responseText = 'I had trouble reaching Gemini for analysis. Please try again in a moment.';
        }
      }

    } else {
      // General greeting or question
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        responseText = 'Hi! Gemini is not configured on the server right now, but I can still help with forecasts and plans.';
      } else {
        try {
          const generalPrompt = `You are a helpful productivity AI assistant named "Busy Bee AI". The user said: "${message}"
          
          Respond in a friendly, helpful way. Mention that you can:
          - Predict productivity for upcoming days
          - Generate feasible work plans
          - Provide insights on work patterns
          
          Keep it brief and welcoming (2-3 sentences).`;

          const result = await getGenAI().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: generalPrompt }] }],
          });
          responseText = result.text || '';
        } catch (gemErr: any) {
          console.error('[Chatbot] Gemini general error:', gemErr);
          responseText = 'I had trouble reaching Gemini just now. Please try again.';
        }
      }
    }

    res.json({
      message: responseText,
      data: responseData,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[Chatbot] Error:', error);
    console.error('[Chatbot] Error message:', error.message);
    console.error('[Chatbot] Error stack:', error.stack);
    const errorDetails = error.message || error.toString() || 'Unknown error';
    res.status(500).json({
      error: 'Failed to process chat message',
      details: errorDetails
    });
  }
}

/**
 * Get suggested prompts for user
 */
export async function getSuggestedPrompts(_req: Request, res: Response): Promise<void> {
  try {
    const prompts: SuggestedPrompt[] = [
      {
        id: '1',
        text: 'How will my focus be tomorrow?',
        category: 'forecast',
        icon: '🎯'
      },
      {
        id: '2',
        text: 'Show my productivity forecast for next week',
        category: 'forecast',
        icon: '📊'
      },
      {
        id: '3',
        text: 'Can I work 40 hours this week?',
        category: 'plan',
        icon: '⏰'
      },
      {
        id: '4',
        text: 'Generate a plan for the next 7 days',
        category: 'plan',
        icon: '📅'
      },
      {
        id: '5',
        text: "What's my predicted error rate tomorrow?",
        category: 'forecast',
        icon: '🐛'
      },
      {
        id: '6',
        text: 'When should I schedule deep work?',
        category: 'analysis',
        icon: '💡'
      },
      {
        id: '7',
        text: 'Will I be productive on Friday?',
        category: 'forecast',
        icon: '📈'
      },
      {
        id: '8',
        text: 'Create a 5-day work plan',
        category: 'plan',
        icon: '📝'
      }
    ];

    res.json({ prompts });

  } catch (error: any) {
    console.error('[Chatbot] Error getting prompts:', error);
    res.status(500).json({
      error: 'Failed to get suggested prompts',
      details: error.message
    });
  }
}
