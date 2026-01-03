import { useState } from 'react';
import { DashboardPage } from './pages/Dashboard';
import { AddProductPage } from './pages/AddProduct';
import { ProductListPage } from './pages/ProductList';
import ForecastingPage from './pages/Forecasting';

type Tab = 'dashboard' | 'forecasting' | 'add' | 'list';

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div className="min-h-screen bg-vscode-editor-bg">
      <header className="border-b border-vscode-panel-border bg-vscode-widget-bg/80 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-vscode-editor-fg">
            Busy Bee
          </h1>

          <nav className="inline-flex rounded-lg shadow-vscode ring-1 ring-vscode-widget-border overflow-hidden">
            <button
              onClick={() => setTab('dashboard')}
              className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vscode-focus ${
                tab === 'dashboard'
                  ? 'bg-brand-primary text-white'
                  : 'bg-vscode-input-bg text-vscode-foreground hover:bg-vscode-list-hover-bg'
              }`}
            >
              Dashboard
            </button>

            <button
              onClick={() => setTab('forecasting')}
              className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vscode-focus border-l border-vscode-widget-border ${
                tab === 'forecasting'
                  ? 'bg-brand-primary text-white'
                  : 'bg-vscode-input-bg text-vscode-foreground hover:bg-vscode-list-hover-bg'
              }`}
            >
              Forecasting
            </button>

            <button
              onClick={() => setTab('add')}
              className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vscode-focus border-l border-vscode-widget-border ${
                tab === 'add'
                  ? 'bg-brand-primary text-white'
                  : 'bg-vscode-input-bg text-vscode-foreground hover:bg-vscode-list-hover-bg'
              }`}
            >
              Add
            </button>

            <button
              onClick={() => setTab('list')}
              className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vscode-focus border-l border-vscode-widget-border ${
                tab === 'list'
                  ? 'bg-brand-primary text-white'
                  : 'bg-vscode-input-bg text-vscode-foreground hover:bg-vscode-list-hover-bg'
              }`}
            >
              List
            </button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {tab === 'dashboard' && <DashboardPage />}
        {tab === 'forecasting' && <ForecastingPage />}
        {tab === 'add' && <AddProductPage />}
        {tab === 'list' && <ProductListPage />}
      </main>
    </div>
  );
}
