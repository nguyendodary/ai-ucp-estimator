import React from 'react';

import { cn } from '../../lib/utils';

function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        'w-full rounded-2xl border border-zinc-200/70 bg-white/70 px-4 py-3 text-sm text-zinc-900 shadow-soft placeholder:text-zinc-500',
        'min-h-[220px] resize-y',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/35',
        'dark:bg-zinc-950/40 dark:border-zinc-800 dark:text-zinc-50',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };

