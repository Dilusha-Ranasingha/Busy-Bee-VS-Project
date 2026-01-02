import * as vscode from 'vscode';

export interface GitHubUser {
  id: string;
  username: string;
  email: string;
  avatarUrl: string;
}

export class AuthManager {
  private static instance: AuthManager;
  private session?: vscode.AuthenticationSession;
  private user?: GitHubUser;
  private onAuthChangeCallbacks: ((user: GitHubUser | undefined) => void)[] = [];

  private constructor(private context: vscode.ExtensionContext) {
    // Try to restore session on initialization
    this.restoreSession();
  }

  public static getInstance(context: vscode.ExtensionContext): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager(context);
    }
    return AuthManager.instance;
  }

  /**
   * Sign in with GitHub using VS Code's built-in authentication
   */
  public async signIn(): Promise<GitHubUser | undefined> {
    try {
      console.log('[AuthManager] Initiating GitHub sign-in...');

      // Request GitHub authentication with required scopes
      this.session = await vscode.authentication.getSession('github', ['user:email'], {
        createIfNone: true, // Show sign-in UI if not already signed in
      });

      if (!this.session) {
        console.log('[AuthManager] Sign-in cancelled by user');
        return undefined;
      }

      // Fetch user info from GitHub API
      this.user = await this.fetchUserInfo(this.session.accessToken);

      // Store session for persistence
      await this.context.globalState.update('github_session', {
        id: this.session.id,
        account: this.session.account,
      });

      console.log(`[AuthManager] Sign-in successful: ${this.user.username}`);
      
      // Notify listeners
      this.notifyAuthChange();

      vscode.window.showInformationMessage(`Signed in as ${this.user.username}`);
      
      return this.user;
    } catch (error) {
      console.error('[AuthManager] Sign-in failed:', error);
      vscode.window.showErrorMessage('GitHub sign-in failed');
      return undefined;
    }
  }

  /**
   * Sign out and clear session
   */
  public async signOut(): Promise<void> {
    this.session = undefined;
    this.user = undefined;
    await this.context.globalState.update('github_session', undefined);
    
    console.log('[AuthManager] Signed out');
    this.notifyAuthChange();
    
    vscode.window.showInformationMessage('Signed out successfully');
  }

  /**
   * Get current signed-in user
   */
  public getUser(): GitHubUser | undefined {
    return this.user;
  }

  /**
   * Check if user is signed in
   */
  public isSignedIn(): boolean {
    return !!this.user;
  }

  /**
   * Get GitHub user ID (for database storage)
   */
  public getUserId(): string | undefined {
    return this.user?.id;
  }

  /**
   * Listen for authentication state changes
   */
  public onAuthChange(callback: (user: GitHubUser | undefined) => void): vscode.Disposable {
    this.onAuthChangeCallbacks.push(callback);
    
    return new vscode.Disposable(() => {
      const index = this.onAuthChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.onAuthChangeCallbacks.splice(index, 1);
      }
    });
  }

  /**
   * Restore session from storage (called on extension activation)
   */
  private async restoreSession(): Promise<void> {
    try {
      // Check if there's a stored session
      const storedSession = this.context.globalState.get<any>('github_session');
      if (!storedSession) {
        console.log('[AuthManager] No stored session found');
        return;
      }

      // Try to get existing session without prompting
      this.session = await vscode.authentication.getSession('github', ['user:email'], {
        createIfNone: false, // Don't show UI, just check if session exists
      });

      if (this.session) {
        this.user = await this.fetchUserInfo(this.session.accessToken);
        console.log(`[AuthManager] Session restored: ${this.user.username}`);
        this.notifyAuthChange();
      } else {
        // Session expired, clear stored data
        await this.context.globalState.update('github_session', undefined);
        console.log('[AuthManager] Stored session expired');
      }
    } catch (error) {
      console.error('[AuthManager] Failed to restore session:', error);
      await this.context.globalState.update('github_session', undefined);
    }
  }

  /**
   * Fetch user info from GitHub API
   */
  private async fetchUserInfo(accessToken: string): Promise<GitHubUser> {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      id: String(data.id),
      username: data.login,
      email: data.email || `${data.login}@users.noreply.github.com`,
      avatarUrl: data.avatar_url,
    };
  }

  /**
   * Notify all listeners of auth state change
   */
  private notifyAuthChange(): void {
    this.onAuthChangeCallbacks.forEach(callback => {
      try {
        callback(this.user);
      } catch (error) {
        console.error('[AuthManager] Error in auth change callback:', error);
      }
    });
  }
}
