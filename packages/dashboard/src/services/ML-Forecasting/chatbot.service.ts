import { apiClient } from '../api.client';
import type { ChatResponse } from '../../types/ML-Forecasting/chatbot.types';
import type { ChatMessage } from '../../types/ML-Forecasting/chatbot.types';

const CHATBOT_API_BASE = '/api/ml-forecasting/chat';

export const chatbotService = {
  /**
   * Send a message to the chatbot
   */
  sendMessage: async (userId: string, message: string, conversationHistory?: ChatMessage[]): Promise<ChatResponse> => {
    const response = await apiClient.post<ChatResponse>(`${CHATBOT_API_BASE}`, {
      user_id: userId,
      message,
      conversation_history: conversationHistory,
    });
    return response;
  },

  /**
   * Get suggested prompts for the user
   */
  getSuggestedPrompts: async (userId: string): Promise<{ prompts: string[] }> => {
    const response = await apiClient.get<{ prompts: string[] }>(
      `${CHATBOT_API_BASE}/prompts/${userId}`
    );
    return response;
  },
};
