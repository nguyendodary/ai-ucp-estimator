import React from 'react';

import { cn } from '../../lib/utils';

function Button({
  className,
  variant = 'default',
  size = 'md',
  asChild = false,
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:pointer-events-none disabled:opacity-50';

  const variants = {
    default:
      'bg-blue-600 text-white shadow-soft hover:bg-blue-700 active:bg-blue-800',
    secondary:
      'bg-white/60 text-zinc-900 border border-zinc-200/70 hover:bg-white dark:bg-zinc-900/40 dark:text-zinc-50 dark:border-zinc-800/80',
    ghost:
      'bg-transparent text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800',
    outline:
      'border border-zinc-200/70 bg-white/60 text-zinc-900 hover:bg-white dark:bg-zinc-900/40 dark:text-zinc-50 dark:border-zinc-800/80',
    destructive:
      'bg-red-600 text-white shadow-soft hover:bg-red-700 active:bg-red-800',
  };

  const sizes = {
    sm: 'h-9 px-3',
    md: 'h-10 px-4',
    lg: 'h-11 px-5',
  };

  const Component = props.href || props.onClick ? 'button' : 'button';
  void asChild; // placeholder for shadcn compatibility

  return (
    <Component
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

export { Button };

