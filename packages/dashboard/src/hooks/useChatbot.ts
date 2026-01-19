import { useState, useEffect } from 'react';
import { chatbotService } from '../services/ML-Forecasting/chatbot.service';
import type { ChatMessage } from '../types/ML-Forecasting/chatbot.types';

export const useChatbot = (userId: string | null) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (message: string) => {
    if (!userId || !message.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    setIsLoading(true);
    setError(null);

    try {
      const response = await chatbotService.sendMessage(userId, message, messages);

      // Handle error response
      if (!response || (response as any).error) {
        const errorMsg = (response as any).error || (response as any).message || 'Failed to get response';
        setError(errorMsg);
        return;
      }

      // Normalize data shape: backend sends { type, data }; ensure `type` is preserved
      const rawData = (response as any)?.data;
      const innerData = (response as any)?.data?.data;
      const payloadData = innerData
        ? { ...innerData, type: innerData.type ?? rawData?.type }
        : rawData;

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message || 'No response',
        timestamp: new Date(),
        data: payloadData || undefined,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      console.error('Chatbot error:', err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setError(null);
  };

  return { messages, isLoading, error, sendMessage, clearMessages };
};

export const useSuggestedPrompts = (userId: string | null) => {
  const [prompts, setPrompts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPrompts = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const response = await chatbotService.getSuggestedPrompts(userId);
      setPrompts(response.prompts);
    } catch (err) {
      console.error('Failed to fetch prompts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return { prompts, isLoading, refetch: fetchPrompts };
};
