import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-vscode-foreground mb-1"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-lg border border-vscode-input-border bg-vscode-input-bg text-vscode-input-fg placeholder:text-vscode-input-placeholder shadow-sm focus:border-vscode-focus focus:ring-1 focus:ring-vscode-focus ${
            error ? 'border-vscode-error' : ''
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-vscode-error">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
