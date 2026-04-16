import React, { useCallback, useMemo } from 'react';
import { Upload } from 'lucide-react';

import { cn } from '../../lib/utils';

const ACCEPT = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
};

function getAcceptAttr() {
  const exts = new Set();
  Object.values(ACCEPT).forEach((arr) => arr.forEach((e) => exts.add(e)));
  return Array.from(exts).join(',');
}

function FileDropzone({ file, onFileChange, error }) {
  const acceptAttr = useMemo(() => getAcceptAttr(), []);

  const handlePick = useCallback(
    (picked) => {
      if (!picked) return;
      const nameOk = /(\.pdf|\.docx|\.txt)$/i.test(picked.name || '');
      const typeOk = !picked.type ? nameOk : !!ACCEPT[picked.type];
      if (!nameOk && !typeOk) return;
      onFileChange(picked);
    },
    [onFileChange]
  );

  const [dragOver, setDragOver] = React.useState(false);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const picked = e.dataTransfer.files?.[0];
      handlePick(picked);
    },
    [handlePick]
  );

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'rounded-2xl border-2 border-dashed transition-all px-6 py-8',
          'border-zinc-200/80 bg-white/40 dark:bg-zinc-950/20 dark:border-zinc-800/80',
          dragOver ? 'border-blue-500/70 bg-blue-50/30 dark:bg-blue-500/15' : 'hover:border-zinc-300/90',
          error ? 'border-red-500/60 bg-red-50/20 dark:bg-red-500/10' : ''
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center">
              <Upload className="h-5 w-5 text-blue-700 dark:text-blue-200" />
            </div>
            <div>
              <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                Drag & drop requirements
              </div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                PDF, DOCX, or TXT. {acceptAttr}
              </div>
            </div>
          </div>

          <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-zinc-900 text-white px-4 py-2.5 text-sm font-semibold shadow-soft hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
            <span>Choose file</span>
            <input
              type="file"
              accept={acceptAttr}
              className="hidden"
              onChange={(e) => handlePick(e.target.files?.[0])}
            />
          </label>
        </div>
      </div>

      {file ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/60 dark:bg-zinc-950/30 px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
              Selected: {file.name}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Ready for analysis
            </div>
          </div>
          <button
            type="button"
            onClick={() => onFileChange(null)}
            className="rounded-2xl px-3 py-2 text-sm font-semibold border border-zinc-200/70 hover:bg-zinc-100/70 dark:border-zinc-800/70 dark:hover:bg-zinc-800/60"
          >
            Remove
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="text-sm font-semibold text-red-600 dark:text-red-400">
          {error}
        </div>
      ) : null}
    </div>
  );
}

export default FileDropzone;

