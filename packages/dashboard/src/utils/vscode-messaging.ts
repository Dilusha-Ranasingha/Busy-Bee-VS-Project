type VsCodeApi = {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
};

// VS Code injects this into webviews.
// Using `typeof acquireVsCodeApi` is safe even when it's not defined.
declare const acquireVsCodeApi: undefined | (() => VsCodeApi);

let cachedApi: VsCodeApi | null = null;

declare global {
  interface Window {
    acquireVsCodeApi?: () => VsCodeApi;
    __BUSY_BEE_DEFAULT_TAB__?: string;
    __BUSY_BEE_VSCODE_API__?: VsCodeApi;
  }
}

/**
 * Safe VS Code API getter (works in browser and VS Code webview)
 */
export function getVsCodeApi(): VsCodeApi | null {
  if (cachedApi) return cachedApi;
  try {
    // The extension may inject a pre-created API object to avoid race conditions.
    const injected = (globalThis as any).__BUSY_BEE_VSCODE_API__ as VsCodeApi | undefined;
    if (injected && typeof injected.postMessage === "function") {
      cachedApi = injected;
      return cachedApi;
    }

    // Prefer the canonical global symbol first.
    // In VS Code, this is available even if it isn't attached to window/globalThis.
    const anyWindow = window as any;
    const fn =
      (typeof acquireVsCodeApi === "function" && acquireVsCodeApi) ||
      (typeof anyWindow.acquireVsCodeApi === "function" && anyWindow.acquireVsCodeApi) ||
      (typeof (globalThis as any).acquireVsCodeApi === "function" && (globalThis as any).acquireVsCodeApi);

    if (typeof fn === "function") {
      cachedApi = fn();
      return cachedApi;
    }
  } catch {
    // ignore
  }
  // Don't cache failure: in some webview/dev-server setups the API becomes available slightly later.
  return null;
}

export function postToVsCode(message: any) {
  const api = getVsCodeApi();
  if (api) {
    api.postMessage(message);
    return;
  }

  // Not in VS Code webview (or API acquisition failed). Surface this to the TODO UI.
  // This is intentionally a no-op for other dashboard tabs.
  try {
    window.postMessage(
      {
        type: "TODO/ERROR",
        payload: {
          message:
            "VS Code webview API not available. TODO actions cannot reach the extension/backend.",
        },
      },
      "*"
    );
  } catch {
    // ignore
  }
}
