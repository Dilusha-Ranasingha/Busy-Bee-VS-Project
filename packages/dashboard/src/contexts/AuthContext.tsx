import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface GitHubUser {
  id: string;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

interface AuthContextType {
  user: GitHubUser | null;
  isLoading: boolean;
  signIn: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || 'Ov23liABjmFCB9YjjfRA'; // Default for development
const GITHUB_REDIRECT_URI = import.meta.env.VITE_GITHUB_REDIRECT_URI || 'http://localhost:5173/auth/callback';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if running inside VS Code extension
  const isInExtension = typeof window !== 'undefined' && (window as any).__EXTENSION_USER__;

  // Restore session from localStorage or extension
  useEffect(() => {
    // If running in extension, use extension's auth
    if (isInExtension) {
      const extensionUser = (window as any).__EXTENSION_USER__;
      setUser({
        id: String(extensionUser.id),
        login: extensionUser.username,
        name: extensionUser.username,
        email: extensionUser.email,
        avatar_url: extensionUser.avatarUrl,
      });
      setIsLoading(false);
      return;
    }

    // Listen for auth from extension (iframe case)
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'extension-auth') {
        const extensionUser = event.data.user;
        setUser({
          id: String(extensionUser.id),
          login: extensionUser.username,
          name: extensionUser.username,
          email: extensionUser.email,
          avatar_url: extensionUser.avatarUrl,
        });
        setIsLoading(false);
      }
    };
    window.addEventListener('message', handleMessage);
    
    // Otherwise, use normal web auth
    const storedUser = localStorage.getItem('github_user');
    const storedToken = localStorage.getItem('github_token');
    
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse stored user', e);
        localStorage.removeItem('github_user');
        localStorage.removeItem('github_token');
      }
    }
    setIsLoading(false);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [isInExtension]);

  const signIn = () => {
    // If in extension, show message that auth is handled by extension
    if (isInExtension) {
      alert('Please use the extension sidebar to sign in');
      return;
    }

    // GitHub OAuth flow
    const scope = 'user:email read:user';
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem('oauth_state', state);

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_REDIRECT_URI)}&scope=${encodeURIComponent(scope)}&state=${state}`;
    
    window.location.href = authUrl;
  };

  const signOut = () => {
    // If in extension, show message
    if (isInExtension) {
      alert('Please use the extension sidebar to sign out');
      return;
    }

    setUser(null);
    localStorage.removeItem('github_user');
    localStorage.removeItem('github_token');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Handle OAuth callback
export async function handleOAuthCallback(code: string, state: string) {
  const storedState = localStorage.getItem('oauth_state');
  if (state !== storedState) {
    throw new Error('Invalid OAuth state');
  }
  localStorage.removeItem('oauth_state');

  // Exchange code for token (this should be done via your backend to keep client_secret secure)
  // For now, we'll use a simple approach - in production, proxy this through your backend
  const tokenResponse = await fetch('http://localhost:4000/api/auth/github/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirect_uri: GITHUB_REDIRECT_URI }),
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to exchange code for token');
  }

  const { access_token } = await tokenResponse.json();
  localStorage.setItem('github_token', access_token);

  // Fetch user info
  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${access_token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!userResponse.ok) {
    throw new Error('Failed to fetch user info');
  }

  const userData = await userResponse.json();
  const user: GitHubUser = {
    id: String(userData.id),
    login: userData.login,
    name: userData.name,
    email: userData.email,
    avatar_url: userData.avatar_url,
  };

  localStorage.setItem('github_user', JSON.stringify(user));
  return user;
}
