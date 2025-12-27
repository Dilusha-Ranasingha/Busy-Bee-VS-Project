import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-vscode-foreground mb-1"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`w-full min-h-24 rounded-lg border border-vscode-input-border bg-vscode-input-bg text-vscode-input-fg placeholder:text-vscode-input-placeholder shadow-sm focus:border-vscode-focus focus:ring-1 focus:ring-vscode-focus ${
            error ? 'border-vscode-error' : ''
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-vscode-error">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
