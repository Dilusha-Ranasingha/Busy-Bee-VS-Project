import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-900">
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-8 max-w-md">
            <h2 className="text-xl font-bold text-red-400 mb-4">⚠️ Something went wrong</h2>
            <p className="text-red-300 mb-4 text-sm">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <details className="text-red-200 text-xs bg-black/50 p-3 rounded overflow-auto max-h-48">
              <summary className="cursor-pointer font-semibold mb-2">Error details</summary>
              <pre className="whitespace-pre-wrap break-words">
                {this.state.error?.stack}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 w-full"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
