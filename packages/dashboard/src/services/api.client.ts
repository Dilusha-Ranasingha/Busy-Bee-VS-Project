// Declare VS Code API for webview
declare function acquireVsCodeApi(): unknown;

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    
    // VS Code webview integration
    if (typeof acquireVsCodeApi === 'function') {
      window.addEventListener('message', (event) => {
        const msg = event.data;
        if (msg?.type === 'init' && msg.apiBaseUrl) {
          this.baseUrl = msg.apiBaseUrl;
        }
      });
    }
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      // Try to parse response as JSON
      let data: any;
      try {
        data = await response.json();
      } catch {
        data = { error: `HTTP ${response.status}`, message: await response.text() };
      }

      // Return both success and error responses
      // Let the consumer handle error checking
      if (!response.ok) {
        return { ...data, error: data.error || `HTTP ${response.status}` } as T;
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
