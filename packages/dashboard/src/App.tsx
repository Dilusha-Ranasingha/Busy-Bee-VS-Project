import { useState } from 'react';
import { LayoutDashboard, PlusCircle, Package, ArrowLeftRight, Flame, PenTool, Save } from 'lucide-react';
import { DashboardPage } from './pages/Dashboard';
import { AddProductPage } from './pages/AddProduct';
import { ProductListPage } from './pages/ProductList';
import { FileSwitchRatePage } from './pages/Metrics-Tracking/FileSwitchRate';
import { FocusStreakPage } from './pages/Metrics-Tracking/FocusStreak';
import { EditSessionsPage } from './pages/Metrics-Tracking/EditSessions';
import { SaveEditRatioPage } from './pages/Metrics-Tracking/SaveEditRatio';
import { SideNav } from './components/Layout';
import { GitHubAuthButton } from './components/Auth/GitHubAuth';

type Tab = 'dashboard' | 'add' | 'list' | 'fileswitch' | 'focusstreak' | 'editsessions' | 'saveedit';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'add', label: 'Add Product', icon: PlusCircle },
  { id: 'list', label: 'Product List', icon: Package },
  { id: 'fileswitch', label: 'File Switch', icon: ArrowLeftRight },
  { id: 'focusstreak', label: 'Focus Streaks', icon: Flame },
  { id: 'editsessions', label: 'Edits/Min', icon: PenTool },
  { id: 'saveedit', label: 'Save/Edit Ratio', icon: Save },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div className="flex h-screen w-full overflow-hidden bg-vscode-editor-bg">
      {/* Side Navigation */}
      <SideNav
        items={NAV_ITEMS}
        activeId={tab}
        onSelect={(id) => setTab(id as Tab)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 border-b border-vscode-panel-border bg-vscode-widget-bg/80 backdrop-blur">
          <div className="px-4 py-3 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-vscode-editor-fg">
              {NAV_ITEMS.find((item) => item.id === tab)?.label || 'Dashboard'}
            </h1>
            <GitHubAuthButton />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4">
            {tab === 'dashboard' && <DashboardPage />}
            {tab === 'add' && <AddProductPage />}
            {tab === 'list' && <ProductListPage />}
            {tab === 'fileswitch' && <FileSwitchRatePage />}
            {tab === 'focusstreak' && <FocusStreakPage />}
            {tab === 'editsessions' && <EditSessionsPage />}
            {tab === 'saveedit' && <SaveEditRatioPage />}
          </div>
        </main>
      </div>
    </div>
  );
}
