import { useState } from 'react';
import { AlertTriangle, Trash2, Check } from 'lucide-react';
import type { Item } from '../types';

interface Props {
  uncheckedItems: Item[];
  onComplete: (removals: number[]) => void;
  onCancel: () => void;
}

export default function CheckSummaryModal({ uncheckedItems, onComplete, onCancel }: Props) {
  // null = undecided, true = keep, false = remove
  const [decisions, setDecisions] = useState<Record<number, boolean>>({});
  const [confirmAll, setConfirmAll] = useState(false);

  const setDecision = (id: number, keep: boolean) => {
    setDecisions((prev) => ({ ...prev, [id]: keep }));
  };

  const removeAll = () => {
    const all: Record<number, boolean> = {};
    for (const item of uncheckedItems) all[item.id] = false;
    setDecisions(all);
    setConfirmAll(false);
  };

  const handleDone = () => {
    const removals = uncheckedItems
      .filter((item) => decisions[item.id] === false)
      .map((item) => item.id);
    onComplete(removals);
  };

  const allDecided = uncheckedItems.every((item) => decisions[item.id] !== undefined);
  const removalCount = uncheckedItems.filter((item) => decisions[item.id] === false).length;

  if (uncheckedItems.length === 0) {
    // All items were checked — nothing to review
    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40">
        <div className="bg-white rounded-t-2xl p-6 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">All items accounted for!</h2>
          <p className="text-gray-500 text-center text-sm">Every item in inventory was confirmed present.</p>
          <button
            onClick={() => onComplete([])}
            className="w-full bg-blue-600 text-white font-semibold rounded-xl py-3.5 hover:bg-blue-700 active:bg-blue-800 transition-colors min-h-[44px]"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40">
      <div className="bg-white rounded-t-2xl max-h-[88dvh] flex flex-col">
        {/* Header */}
        <div className="shrink-0 px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-gray-900">
              {uncheckedItems.length} item{uncheckedItems.length !== 1 ? 's' : ''} not found
            </h2>
          </div>
          <p className="text-sm text-gray-500">
            Decide what to do with each item that wasn't confirmed.
          </p>
          {/* Remove all */}
          {!confirmAll ? (
            <button
              onClick={() => setConfirmAll(true)}
              className="mt-2 flex items-center gap-1.5 text-sm text-red-500 font-medium hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
              Remove all unchecked
            </button>
          ) : (
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setConfirmAll(false)}
                className="text-sm text-gray-500 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={removeAll}
                className="text-sm text-red-500 font-semibold"
              >
                Confirm remove all
              </button>
            </div>
          )}
        </div>

        {/* Item list */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {uncheckedItems.map((item) => {
            const displayName = item.displayName || item.customName || item.itemTypeName || 'Unknown';
            const decision = decisions[item.id];

            return (
              <div key={item.id} className="flex items-center px-4 py-3 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{displayName}</p>
                  <p className="text-xs text-gray-400">
                    {item.categoryName}
                    {item.subcategoryName ? ` › ${item.subcategoryName}` : ''}
                    {item.sizeLabel ? ` · ${item.sizeLabel}` : ''}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setDecision(item.id, true)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                      decision === true
                        ? 'bg-gray-700 text-white'
                        : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Keep
                  </button>
                  <button
                    onClick={() => setDecision(item.id, false)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                      decision === false
                        ? 'bg-red-500 text-white'
                        : 'border border-red-200 text-red-500 hover:bg-red-50'
                    }`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-4 py-3 border-t border-gray-100 safe-bottom flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-200 text-gray-600 font-medium rounded-xl py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[44px]"
          >
            Back
          </button>
          <button
            onClick={handleDone}
            disabled={!allDecided}
            className="flex-1 bg-blue-600 text-white font-semibold rounded-xl py-3.5 hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-40 min-h-[44px]"
          >
            {removalCount > 0 ? `Remove ${removalCount} & Done` : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
