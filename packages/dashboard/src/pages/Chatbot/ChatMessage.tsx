import React from 'react';
import type { ChatMessage as ChatMessageType } from '../../types/ML-Forecasting/chatbot.types';
import ForecastResultCard from './ForecastResultCard';
import PlanResultCard from './PlanResultCard';

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Message bubble */}
        <div
          className={`rounded-lg p-4 ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-200 border border-gray-700'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Data cards for assistant messages */}
        {!isUser && message.data && (
          <div className="mt-3">
            {message.data.type === 'forecast' && <ForecastResultCard data={message.data} />}
            {message.data.type === 'plan' && <PlanResultCard data={message.data} />}
          </div>
        )}

        {/* Timestamp */}
        <div
          className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}
        >
          {new Date(message.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
