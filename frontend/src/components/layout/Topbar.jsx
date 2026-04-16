import React from 'react';
import { ChevronLeft, ChevronRight, Menu, Plus, Sun, Moon } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

function Avatar({ initials }) {
  return (
    <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-zinc-900 to-indigo-700 dark:from-zinc-50/10 dark:to-indigo-500/20 flex items-center justify-center shadow-soft flex-shrink-0">
      <span className="text-xs font-black text-white dark:text-zinc-50">{initials}</span>
    </div>
  );
}

function Topbar({
  title,
  onNewAnalysis,
  onOpenSidebar,
  isDark,
  onToggleDark,
  sidebarCollapsed,
  onToggleSidebarCollapsed,
}) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30',
        'bg-white/60 backdrop-blur border-b border-zinc-200/70 dark:bg-zinc-950/50 dark:border-zinc-800/70'
      )}
    >
      <div className="px-4 sm:px-6 h-14 flex items-center gap-3">
        {/* Mobile menu */}
        <button
          type="button"
          onClick={onOpenSidebar}
          className="lg:hidden inline-flex items-center justify-center h-9 w-9 rounded-xl hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5 text-zinc-700 dark:text-zinc-200" />
        </button>

        {/* Title */}
        <h1 className="flex-1 text-base font-black tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
          {title}
        </h1>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Sidebar collapse (desktop only) */}
          <button
            type="button"
            onClick={onToggleSidebarCollapsed}
            className="hidden lg:inline-flex items-center justify-center h-9 w-9 rounded-xl border border-zinc-200/70 bg-white/60 hover:bg-white/80 dark:bg-zinc-900/40 dark:border-zinc-800/70 dark:hover:bg-zinc-900/60 transition-colors"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4 text-zinc-800 dark:text-zinc-200" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-zinc-800 dark:text-zinc-200" />
            )}
          </button>

          {/* Dark mode toggle */}
          <button
            type="button"
            onClick={onToggleDark}
            className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-zinc-200/70 bg-white/60 hover:bg-white/80 dark:bg-zinc-900/40 dark:border-zinc-800/70 dark:hover:bg-zinc-900/60 transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-zinc-200" />
            ) : (
              <Moon className="h-4 w-4 text-zinc-800 dark:text-zinc-200" />
            )}
          </button>

          {/* New Analysis CTA */}
          <Button size="md" variant="default" className="hidden sm:inline-flex" onClick={onNewAnalysis}>
            <Plus className="h-4 w-4" />
            New Analysis
          </Button>
          <Button size="md" variant="default" className="sm:hidden" onClick={onNewAnalysis} aria-label="New Analysis">
            <Plus className="h-4 w-4" />
          </Button>

          <Avatar initials="KU" />
        </div>
      </div>
    </header>
  );
}

export default Topbar;
