import React from 'react';
import type { SuggestedPrompt } from '../../types/ML-Forecasting/chatbot.types';

interface SuggestedPromptsProps {
  onPromptClick: (prompt: string) => void;
  disabled?: boolean;
}

const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    id: '1',
    text: 'How will my focus be tomorrow?',
    icon: '🎯',
    category: 'forecast',
  },
  {
    id: '2',
    text: 'Show my productivity forecast for next week',
    icon: '📊',
    category: 'forecast',
  },
  {
    id: '3',
    text: 'Can I work 40 hours this week?',
    icon: '⏰',
    category: 'plan',
  },
  {
    id: '4',
    text: 'Generate a plan for the next 7 days',
    icon: '📅',
    category: 'plan',
  },
  {
    id: '5',
    text: "What's my predicted error rate tomorrow?",
    icon: '🐛',
    category: 'forecast',
  },
  {
    id: '6',
    text: 'When should I schedule deep work?',
    icon: '💡',
    category: 'analysis',
  },
  {
    id: '7',
    text: 'Will I be productive on Friday?',
    icon: '📈',
    category: 'forecast',
  },
  {
    id: '8',
    text: 'Create a 5-day work plan',
    icon: '📝',
    category: 'plan',
  },
];

const SuggestedPrompts: React.FC<SuggestedPromptsProps> = ({ onPromptClick, disabled = false }) => {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-400 px-1">Suggested Questions</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt.id}
            onClick={() => onPromptClick(prompt.text)}
            disabled={disabled}
            className="flex items-center gap-3 p-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">{prompt.icon}</span>
            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
              {prompt.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SuggestedPrompts;
