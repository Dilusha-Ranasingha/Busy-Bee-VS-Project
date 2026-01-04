import { useEffect, useState } from 'react';
import { handleOAuthCallback } from '../../contexts/AuthContext';

export default function OAuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (!code || !state) {
      setStatus('error');
      setError('Missing OAuth parameters');
      return;
    }

    handleOAuthCallback(code, state)
      .then(() => {
        setStatus('success');
        // Redirect to home after 1 second
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      })
      .catch((err) => {
        setStatus('error');
        setError(err.message || 'Authentication failed');
      });
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-vscode-editor-bg">
      <div className="max-w-md w-full bg-vscode-widget-bg border border-vscode-widget-border rounded-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-vscode-button-bg border-t-transparent rounded-full animate-spin"></div>
            <h2 className="text-xl font-semibold text-vscode-editor-fg mb-2">
              Authenticating...
            </h2>
            <p className="text-vscode-descriptionForeground">
              Please wait while we complete the authentication
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 text-green-500">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-vscode-editor-fg mb-2">
              Authentication Successful!
            </h2>
            <p className="text-vscode-descriptionForeground">
              Redirecting you to the dashboard...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 text-red-500">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-vscode-editor-fg mb-2">
              Authentication Failed
            </h2>
            <p className="text-vscode-descriptionForeground mb-4">
              {error}
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-vscode-button-bg hover:bg-vscode-button-hoverBg text-vscode-button-fg rounded"
            >
              Return to Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
