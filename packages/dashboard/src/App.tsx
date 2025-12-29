import { useState } from 'react';
import { DashboardPage } from './pages/Dashboard';
import { AddProductPage } from './pages/AddProduct';
import { ProductListPage } from './pages/ProductList';
import { FileSwitchRatePage } from './pages/FileSwitchRate';

type Tab = 'dashboard' | 'add' | 'list' | 'fileswitch';

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div className="min-h-screen bg-vscode-editor-bg">
      <header className="border-b border-vscode-panel-border bg-vscode-widget-bg/80 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-vscode-editor-fg">Products</h1>
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
            <button
              onClick={() => setTab('fileswitch')}
              className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vscode-focus border-l border-vscode-widget-border ${
                tab === 'fileswitch'
                  ? 'bg-brand-primary text-white'
                  : 'bg-vscode-input-bg text-vscode-foreground hover:bg-vscode-list-hover-bg'
              }`}
            >
              File Switch
            </button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {tab === 'dashboard' && <DashboardPage />}
        {tab === 'add' && <AddProductPage />}
        {tab === 'list' && <ProductListPage />}
        {tab === 'fileswitch' && <FileSwitchRatePage />}
      </main>
    </div>
  );
}
