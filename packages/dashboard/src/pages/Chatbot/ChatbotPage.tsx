import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useChatbot } from '../../hooks/useChatbot';
import ChatMessage from './ChatMessage';
import SuggestedPrompts from './SuggestedPrompts';

const ChatbotPage: React.FC = () => {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // TEMPORARY: Use test user for demo since we have synthetic data for test users
  const testUserId = 'test_user_high_performer'; // TODO: Change back to user?.id after real data collection
  const effectiveUserId = testUserId; // user?.id || 'test_user_high_performer';
  
  const { messages, isLoading, error, sendMessage, clearMessages } = useChatbot(effectiveUserId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    setShowSuggestions(false);
    await sendMessage(input);
    setInput('');
  };

  const handlePromptClick = async (prompt: string) => {
    setShowSuggestions(false);
    setInput(prompt);
    await sendMessage(prompt);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    clearMessages();
    setShowSuggestions(true);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-400">Please log in to use the chatbot</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>🤖</span>
            Productivity Assistant
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Ask me about your productivity forecasts and work plans
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="px-3 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Clear Chat
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome Message */}
        {messages.length === 0 && (
          <div className="text-center py-12 space-y-6">
            <div className="text-6xl mb-4">👋</div>
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Welcome to Your Productivity Assistant!
              </h2>
              <p className="text-gray-400 max-w-md mx-auto">
                I can help you understand your productivity patterns, forecast future performance, and
                create realistic work plans. Try asking a question or click a suggestion below.
              </p>
            </div>
          </div>
        )}

        {/* Chat Messages */}
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
              </div>
              <span className="text-sm text-gray-400">Thinking...</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-400 text-sm">
            Error: {error}
          </div>
        )}

        {/* Suggested Prompts */}
        {showSuggestions && messages.length === 0 && (
          <SuggestedPrompts onPromptClick={handlePromptClick} disabled={isLoading} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-700 p-4 bg-gray-900/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your productivity..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            aria-label="Chat message input"
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 Tip: Ask about forecasts, work plans, or your productivity trends
        </p>
      </div>
    </div>
  );
};

export default ChatbotPage;
