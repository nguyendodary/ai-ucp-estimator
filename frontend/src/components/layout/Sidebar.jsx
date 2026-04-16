import React from 'react';
import { History as HistoryIcon, LayoutGrid, PlusSquare } from 'lucide-react';

import { cn } from '../../lib/utils';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', Icon: LayoutGrid },
  { key: 'new', label: 'New Analysis', Icon: PlusSquare },
  { key: 'history', label: 'History', Icon: HistoryIcon },
];

function Sidebar({ activeKey, collapsed, onNavigate }) {
  return (
    <aside
      className={cn(
        'hidden lg:flex lg:flex-col',
        'sticky top-0 h-screen',
        'border-r border-zinc-200/70 bg-white/60 backdrop-blur dark:bg-zinc-950/40 dark:border-zinc-800/70',
        collapsed ? 'w-[72px]' : 'w-[240px]',
        'transition-[width] duration-200'
      )}
    >
      {/* Logo */}
      <div className={cn('px-4 pt-5 pb-4', collapsed && 'px-3')}>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 flex-shrink-0 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 shadow-soft flex items-center justify-center">
            <span className="text-white text-xs font-black tracking-tight">U</span>
          </div>
          {!collapsed && (
            <div className="leading-tight min-w-0">
              <div className="text-[10px] font-semibold text-zinc-400">AI-powered</div>
              <div className="text-sm font-black text-zinc-900 dark:text-zinc-50 truncate">UCP Estimator</div>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className={cn('px-2 flex-1')}>
        <div className="space-y-0.5">
          {NAV_ITEMS.map(({ key, label, Icon }) => {
            const isActive = key === activeKey;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onNavigate(key)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold',
                  'transition-colors duration-150',
                  collapsed ? 'justify-center' : 'justify-start',
                  isActive
                    ? 'bg-blue-600/10 text-blue-700 dark:text-blue-300 border border-blue-600/15'
                    : 'text-zinc-600 hover:bg-zinc-100/70 dark:text-zinc-300 dark:hover:bg-zinc-900/50'
                )}
              >
                <Icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-blue-700 dark:text-blue-300' : '')} />
                {!collapsed && <span>{label}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Status */}
      <div className={cn('px-2 pb-5')}>
        {!collapsed && (
          <div className="rounded-xl px-3 py-3 border border-zinc-200/70 dark:border-zinc-800/70">
            <div className="text-[10px] font-semibold text-zinc-400">Status</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">Ready</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
