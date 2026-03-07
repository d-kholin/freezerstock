import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Minus } from 'lucide-react';
import type { Item } from '../types';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const PHRASES = [
  "Things to use next!",
  "Don't forget about these!",
  "Use these soon!",
  "Getting a bit old in there…",
  "These have been waiting!",
  "Freezer burn incoming!",
  "Time to dig these out!",
  "First in, first out!",
];

function monthsAgo(frozenDate: string): number {
  const [year, month] = frozenDate.split('-').map(Number);
  const now = new Date();
  return (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
}

interface Props {
  items: Item[];
  onEdit: (item: Item) => void;
  onUse: (item: Item) => void;
}

export default function AgingBanner({ items, onEdit, onUse }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [phrase] = useState(() => PHRASES[Math.floor(Math.random() * PHRASES.length)]);

  const old = items
    .filter((i) => monthsAgo(i.frozenDate) >= 6)
    .sort((a, b) => monthsAgo(b.frozenDate) - monthsAgo(a.frozenDate))
    .slice(0, 10);

  if (old.length === 0) return null;

  return (
    <div className="mx-3 mt-3 rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-sm font-semibold text-amber-700">{phrase}</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-amber-500 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-amber-500 shrink-0" />
        )}
      </button>

      {/* Expanded item scroll */}
      {expanded && (
        <div className="px-3 pb-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {old.map((item) => {
              const name = item.displayName || item.customName || item.itemTypeName || 'Unknown';
              const months = monthsAgo(item.frozenDate);
              const [year, month] = item.frozenDate.split('-').map(Number);
              const dateLabel = `${MONTHS[month - 1]} ${year}`;
              return (
                <div
                  key={item.id}
                  className="shrink-0 flex flex-col bg-white border border-amber-200 rounded-lg min-w-[120px] max-w-[150px] overflow-hidden"
                >
                  {/* Info area — tap to edit */}
                  <button
                    onClick={() => onEdit(item)}
                    className="flex flex-col items-start px-3 pt-2 pb-1 text-left hover:bg-amber-50 active:bg-amber-100 transition-colors w-full"
                  >
                    <span className="text-xs text-gray-400 truncate w-full">{item.categoryName}</span>
                    <span className="text-sm font-medium text-gray-800 truncate w-full">{name}</span>
                    {item.sizeLabel && (
                      <span className="text-xs text-gray-400 truncate w-full">{item.sizeLabel}</span>
                    )}
                    <span className="text-xs font-semibold text-amber-700 mt-1">{dateLabel}</span>
                  <span className="text-xs text-amber-500">
                    {months >= 12
                      ? `${Math.floor(months / 12)}y ${months % 12 > 0 ? `${months % 12}mo` : ''}`
                      : `${months}mo`} ago
                  </span>
                  </button>

                  {/* Consume button */}
                  <button
                    onClick={() => onUse(item)}
                    aria-label={`Use one ${name}`}
                    className="flex items-center justify-center gap-1 w-full py-1.5 border-t border-amber-100 text-xs font-medium text-amber-700 hover:bg-amber-50 active:bg-amber-100 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                    Use 1
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
