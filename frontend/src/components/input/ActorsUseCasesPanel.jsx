import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const INPUT_CLS =
  'h-9 rounded-xl border border-zinc-200/70 bg-white/70 px-3 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/35 dark:bg-zinc-950/40 dark:border-zinc-800 dark:text-zinc-50';

const SELECT_CLS =
  'h-9 rounded-xl border border-zinc-200/70 bg-white/70 px-3 text-sm shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/35 dark:bg-zinc-950/40 dark:border-zinc-800 dark:text-zinc-50 cursor-pointer';

const REMOVE_BTN =
  'inline-flex items-center justify-center h-8 w-8 rounded-xl border border-zinc-200/70 hover:bg-red-50/60 hover:border-red-300/60 dark:border-zinc-800/70 dark:hover:bg-red-900/20 transition-colors flex-shrink-0';

function AddButton({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200/70 bg-white/60 px-2.5 py-1.5 text-xs font-semibold shadow-soft hover:bg-white/90 dark:bg-zinc-900/30 dark:border-zinc-800/70 dark:hover:bg-zinc-900/40 transition-colors"
    >
      <Plus className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function ActorRow({ actor, index, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <input
          value={actor.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={`Actor ${index + 1} name`}
          className={INPUT_CLS + ' w-full'}
        />
      </div>
      <select
        value={actor.type}
        onChange={(e) => onChange({ type: e.target.value })}
        className={SELECT_CLS + ' w-28'}
      >
        <option value="simple">Simple</option>
        <option value="average">Average</option>
        <option value="complex">Complex</option>
      </select>
      <button type="button" onClick={onRemove} className={REMOVE_BTN} aria-label="Remove actor">
        <Trash2 className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
      </button>
    </div>
  );
}

function UseCaseRow({ useCase, index, onChange, onRemove }) {
  return (
    <div className="space-y-2 rounded-xl border border-zinc-100/80 dark:border-zinc-800/60 p-3 bg-zinc-50/30 dark:bg-zinc-900/20">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <input
            value={useCase.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={`Use Case ${index + 1} name`}
            className={INPUT_CLS + ' w-full'}
          />
        </div>
        <select
          value={useCase.complexity}
          onChange={(e) => onChange({ complexity: e.target.value })}
          className={SELECT_CLS + ' w-28'}
        >
          <option value="simple">Simple</option>
          <option value="average">Average</option>
          <option value="complex">Complex</option>
        </select>
        <button type="button" onClick={onRemove} className={REMOVE_BTN} aria-label="Remove use case">
          <Trash2 className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
        </button>
      </div>
      <textarea
        value={useCase.description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Description (optional)"
        className="w-full rounded-xl border border-zinc-200/70 bg-white/70 px-3 py-2 text-xs shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/35 dark:bg-zinc-950/40 dark:border-zinc-800 dark:text-zinc-50 min-h-[60px] resize-none"
      />
    </div>
  );
}

function EmptyState({ message, sub }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-200/80 dark:border-zinc-800/60 px-4 py-5 text-center">
      <div className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">{message}</div>
      {sub && <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{sub}</div>}
    </div>
  );
}

function ActorsUseCasesPanel({
  actors,
  useCases,
  onAddActor,
  onRemoveActor,
  onUpdateActor,
  onAddUseCase,
  onRemoveUseCase,
  onUpdateUseCase,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Actors */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm">Actors</CardTitle>
            <AddButton onClick={onAddActor} label="Add Actor" />
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {actors.length === 0 ? (
            <EmptyState message="No actors yet" sub="Add at least one actor to enable Manual Estimation." />
          ) : (
            actors.map((actor, idx) => (
              <ActorRow
                key={actor.id}
                actor={actor}
                index={idx}
                onChange={(patch) => onUpdateActor(actor.id, patch)}
                onRemove={() => onRemoveActor(actor.id)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Use Cases */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm">Use Cases</CardTitle>
            <AddButton onClick={onAddUseCase} label="Add Use Case" />
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {useCases.length === 0 ? (
            <EmptyState message="No use cases yet" sub="Complexity selection affects the UCP score." />
          ) : (
            useCases.map((uc, idx) => (
              <UseCaseRow
                key={uc.id}
                useCase={uc}
                index={idx}
                onChange={(patch) => onUpdateUseCase(uc.id, patch)}
                onRemove={() => onRemoveUseCase(uc.id)}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ActorsUseCasesPanel;
