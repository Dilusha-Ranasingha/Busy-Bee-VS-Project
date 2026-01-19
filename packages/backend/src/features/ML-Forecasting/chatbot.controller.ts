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
  } catch (error) {
    console.error('Date extraction error:', error);
    return {};
  }
}

/**
 * Determine user intent (forecast, plan, analysis) using simple keyword matching
 * Optimized to avoid extra API calls and rate limits
 */
function determineIntent(message: string): 'forecast' | 'plan' | 'analysis' | 'general' {
  const lowerMessage = message.toLowerCase();
  
  // Forecast keywords
  if (lowerMessage.match(/predict|forecast|expect|will (i|my)|tomorrow|next (week|day|monday|tuesday|wednesday|thursday|friday)|productive/)) {
    return 'forecast';
  }
  
  // Plan keywords
  if (lowerMessage.match(/plan|schedule|create.*plan|generate.*plan|hours|work.*plan/)) {
    return 'plan';
  }
  
  // Analysis keywords
  if (lowerMessage.match(/analyz|insight|trend|pattern|how.*been|improve/)) {
    return 'analysis';
  }
  
  return 'general';
}

/**
 * Format forecast data for conversational response
 */
function formatForecastResponse(forecast: any): string {
  const predictions = forecast.predictions || [];
  
  if (predictions.length === 0) {
    return "I couldn't generate a forecast at this time. Please try again later.";
  }

  // Get top 3 most important metrics
  const topMetrics = predictions.slice(0, 3);
  
  let response = "Here's what I predict for your productivity:\n\n";
  
  topMetrics.forEach((pred: any) => {
    const trendEmoji = pred.trend === 'up' ? '📈' : pred.trend === 'down' ? '📉' : '➡️';
    response += `${trendEmoji} **${pred.kpi_name}**: ${pred.value.toFixed(2)} on ${pred.date}\n`;
  });

  // Add summary
  const avgProductivity = predictions.find((p: any) => p.kpi_name === 'Productivity Score');
  if (avgProductivity) {
    if (avgProductivity.value > 70) {
      response += "\nYou're on track for a highly productive period! 🎉";
    } else if (avgProductivity.value > 50) {
      response += "\nYou should have moderate productivity. Consider taking breaks when needed.";
    } else {
      response += "\nProductivity might be lower than usual. Plan lighter tasks and prioritize self-care.";
    }
  }

  return response;
}

/**
 * Format plan data for conversational response
 */
function formatPlanResponse(plan: any): string {
  const { is_feasible, feasibility_score, daily_schedule, warnings } = plan;

  let response = "";

  if (is_feasible) {
    response += `Great news! I've created a feasible work plan with ${(feasibility_score * 100).toFixed(0)}% confidence. ✅\n\n`;
  } else {
    response += `I've analyzed your request, but it might be challenging (${(feasibility_score * 100).toFixed(0)}% feasibility). Here's the best plan I could create:\n\n`;
  }

  // Add schedule summary
  response += "**Your Schedule:**\n";
  daily_schedule.slice(0, 3).forEach((day: any) => {
    const emoji = day.productivity_level === 'high' ? '🟢' : day.productivity_level === 'medium' ? '🟡' : '🔴';
    response += `${emoji} ${day.date}: ${day.hours} hours (${day.productivity_level} productivity)\n`;
  });

  if (daily_schedule.length > 3) {
    response += `...and ${daily_schedule.length - 3} more days\n`;
  }

  // Add warnings
  if (warnings && warnings.length > 0) {
    response += "\n⚠️ **Important Notes:**\n";
    warnings.slice(0, 2).forEach((warning: string) => {
      response += `• ${warning}\n`;
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
      // Call ML forecasting service
      const startDate = dateRange.startDate || new Date().toISOString().split('T')[0];
      const endDate = dateRange.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Calculate days between dates
      const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (24 * 60 * 60 * 1000));

      const forecast = await getMLService().getForecast(user_id, days);
      
      responseText = formatForecastResponse(forecast);
      responseData = {
        type: 'forecast',
        data: {
          predictions: forecast.predictions || []
        }
      };

    } else if (intent === 'plan') {
      // Extract working hours if mentioned
      const hoursMatch = message.match(/(\d+)\s*hours?/i);
      const targetHours = hoursMatch ? parseInt(hoursMatch[1]) : 40;

      const planParams = {
        user_id,
        start_date: dateRange.startDate || new Date().toISOString().split('T')[0],
        end_date: dateRange.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        target_hours: targetHours,
      };

      const plan = await getMLService().generatePlan(
        planParams.user_id,
        planParams.start_date,
        planParams.end_date,
        planParams.target_hours
      );

      responseText = formatPlanResponse(plan);
      responseData = {
        type: 'plan',
        data: {
          schedule: plan.daily_schedule || [],
          feasibility: plan.feasibility_score || 0,
          warnings: plan.warnings || []
        }
      };

    } else if (intent === 'analysis') {
      // Use Gemini to provide general insights
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

    } else {
      // General greeting or question
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
    }

    res.json({
      message: responseText,
      data: responseData,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[Chatbot] Error:', error);
    console.error('[Chatbot] Error details:', JSON.stringify(error, null, 2));
    res.status(500).json({
      error: 'Failed to process chat message',
      details: JSON.stringify(error)
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
