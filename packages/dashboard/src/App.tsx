import { useState } from 'react';
import { DashboardPage } from './pages/Dashboard';
import { AddProductPage } from './pages/AddProduct';
import { ProductListPage } from './pages/ProductList';

type Tab = 'dashboard' | 'add' | 'list';

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <nav className="inline-flex rounded-lg shadow-sm ring-1 ring-gray-200 overflow-hidden">
            <button
              onClick={() => setTab('dashboard')}
              className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${
                tab === 'dashboard'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setTab('add')}
              className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 border-l ${
                tab === 'add'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Add
            </button>
            <button
              onClick={() => setTab('list')}
              className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 border-l ${
                tab === 'list'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              List
            </button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {tab === 'dashboard' && <DashboardPage />}
        {tab === 'add' && <AddProductPage />}
        {tab === 'list' && <ProductListPage />}
      </main>
    </div>
  );
}
