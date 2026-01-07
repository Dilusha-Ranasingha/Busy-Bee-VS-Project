import { useEffect, useState } from "react";
import { DashboardPage } from "./pages/Dashboard";
import { AddProductPage } from "./pages/AddProduct";
import { ProductListPage } from "./pages/ProductList";
import { TodoTrackerPage } from "./pages/TodoTracker";

type Tab = "dashboard" | "add" | "list" | "todo";

function getDefaultTab(): Tab {
  const forced = (window as any).__BUSY_BEE_DEFAULT_TAB__ as string | undefined;
  if (forced === "todo") return "todo";
  return "dashboard";
}

export default function App() {
  const [tab, setTab] = useState<Tab>(getDefaultTab());

  // allow provider to navigate after webview loads
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg?.type === "busyBee:navigate" && typeof msg?.tab === "string") {
        if (["dashboard", "add", "list", "todo"].includes(msg.tab)) {
          setTab(msg.tab as Tab);
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <div className="min-h-screen bg-vscode-editor-bg">
      <header className="border-b border-vscode-panel-border bg-vscode-widget-bg/80 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-vscode-editor-fg">
            Products
          </h1>

          <nav className="inline-flex rounded-lg shadow-vscode ring-1 ring-vscode-widget-border overflow-hidden">
            <button
              onClick={() => setTab("dashboard")}
              className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vscode-focus ${
                tab === "dashboard"
                  ? "bg-brand-primary text-white"
                  : "bg-vscode-input-bg text-vscode-foreground hover:bg-vscode-list-hover-bg"
              }`}
            >
              Dashboard
            </button>

            <button
              onClick={() => setTab("add")}
              className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vscode-focus border-l border-vscode-widget-border ${
                tab === "add"
                  ? "bg-brand-primary text-white"
                  : "bg-vscode-input-bg text-vscode-foreground hover:bg-vscode-list-hover-bg"
              }`}
            >
              Add
            </button>

            <button
              onClick={() => setTab("list")}
              className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vscode-focus border-l border-vscode-widget-border ${
                tab === "list"
                  ? "bg-brand-primary text-white"
                  : "bg-vscode-input-bg text-vscode-foreground hover:bg-vscode-list-hover-bg"
              }`}
            >
              List
            </button>

            <button
              onClick={() => setTab("todo")}
              className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vscode-focus border-l border-vscode-widget-border ${
                tab === "todo"
                  ? "bg-brand-accent text-white"
                  : "bg-vscode-input-bg text-vscode-foreground hover:bg-vscode-list-hover-bg"
              }`}
            >
              TODO Tracker
            </button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {tab === "dashboard" && <DashboardPage />}
        {tab === "add" && <AddProductPage />}
        {tab === "list" && <ProductListPage />}
        {tab === "todo" && <TodoTrackerPage />}
      </main>
    </div>
  );
}
