import React, { useEffect, useMemo, useState } from 'react';

import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import DashboardPage from './pages/DashboardPage';
import NewAnalysisPage from './pages/NewAnalysisPage';
import HistoryPage from './pages/HistoryPage';

const PAGE_KEYS = {
  dashboard: 'dashboard',
  new: 'new',
  history: 'history',
};

function useDarkMode() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('ucp_estimator_dark');
    if (stored === 'true') {
      setIsDark(true);
      return;
    }
    if (stored === 'false') {
      setIsDark(false);
      return;
    }
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
    setIsDark(!!prefersDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('ucp_estimator_dark', String(isDark));
  }, [isDark]);

  return { isDark, setIsDark };
}

function App() {
  const [activeKey, setActiveKey] = useState(PAGE_KEYS.dashboard);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { isDark, setIsDark } = useDarkMode();

  const title = useMemo(() => {
    if (activeKey === PAGE_KEYS.dashboard) return 'Dashboard';
    if (activeKey === PAGE_KEYS.new) return 'New Analysis';
    return 'History';
  }, [activeKey]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="flex">
        <Sidebar
          activeKey={activeKey}
          collapsed={sidebarCollapsed}
          onNavigate={(key) => {
            setActiveKey(key);
            setMobileSidebarOpen(false);
          }}
        />

        {/* Mobile sidebar */}
        {mobileSidebarOpen ? (
          <div className="lg:hidden fixed inset-0 z-40">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Close sidebar"
            />
            <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-white/90 dark:bg-zinc-950/90 backdrop-blur border-r border-zinc-200/70 dark:border-zinc-800/70 overflow-auto">
              <Sidebar
                activeKey={activeKey}
                collapsed={sidebarCollapsed}
                onNavigate={(key) => {
                  setActiveKey(key);
                  setMobileSidebarOpen(false);
                }}
              />
            </div>
          </div>
        ) : null}

        <div className="flex-1 flex flex-col">
          <Topbar
            title={title}
            isDark={isDark}
            onToggleDark={() => setIsDark(!isDark)}
            onOpenSidebar={() => setMobileSidebarOpen(true)}
            onNewAnalysis={() => setActiveKey(PAGE_KEYS.new)}
            showSearch={false}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebarCollapsed={() => setSidebarCollapsed((v) => !v)}
          />

          <main className="flex-1 px-4 sm:px-6 pb-10 pt-6">
            {activeKey === PAGE_KEYS.dashboard ? <DashboardPage onNewAnalysis={() => setActiveKey(PAGE_KEYS.new)} /> : null}
            {activeKey === PAGE_KEYS.new ? <NewAnalysisPage onNavigateHistory={() => setActiveKey(PAGE_KEYS.history)} /> : null}
            {activeKey === PAGE_KEYS.history ? <HistoryPage /> : null}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;

