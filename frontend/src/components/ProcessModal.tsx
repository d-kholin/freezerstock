import { useState } from 'react';
import { X, Plus, Trash2, ChevronDown } from 'lucide-react';
import type { Category, Item, ProcessOutput } from '../types';

interface Props {
  item: Item;
  categories: Category[];
  onSave: (outputs: ProcessOutput[]) => void;
  onClose: () => void;
}

interface OutputRow extends ProcessOutput {
  key: number;
  itemTypeId?: number;
  useCustom?: boolean;
}

let keyCounter = 0;

function newRow(categories: Category[]): OutputRow {
  const defaultCat = categories[0];
  return {
    key: ++keyCounter,
    categoryId: defaultCat?.id ?? 0,
    itemTypeId: undefined,
    useCustom: false,
    customName: '',
    quantity: 1,
    sizeLabel: '',
    notes: '',
  };
}

export default function ProcessModal({ item, categories, onSave, onClose }: Props) {
  const displayName = item.displayName || item.customName || item.itemTypeName || 'item';
  const [outputs, setOutputs] = useState<OutputRow[]>([newRow(categories)]);

  const update = (key: number, patch: Partial<OutputRow>) => {
    setOutputs((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = outputs.filter(
      (o) => o.categoryId && (o.useCustom ? o.customName?.trim() : o.itemTypeId)
    );
    if (!valid.length) return;
    onSave(
      valid.map(({ key, useCustom, ...rest }) => ({
        ...rest,
        itemTypeId: useCustom ? undefined : rest.itemTypeId,
        customName: useCustom ? rest.customName : undefined,
      }))
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Process Item</h2>
            <p className="text-sm text-gray-500">Breaking down: <strong>{displayName}</strong></p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 active:bg-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-4 pb-6 flex flex-col gap-4">
          <p className="text-sm text-gray-500">
            The original item will be removed. Add the resulting portions below.
          </p>

          {outputs.map((row, i) => {
            const cat = categories.find((c) => c.id === row.categoryId);
            return (
              <div key={row.key} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Portion {i + 1}</span>
                  {outputs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setOutputs((rows) => rows.filter((r) => r.key !== row.key))}
                      aria-label="Remove portion"
                      className="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Category */}
                <div className="relative">
                  <select
                    value={row.categoryId}
                    onChange={(e) => update(row.key, { categoryId: Number(e.target.value), itemTypeId: undefined })}
                    className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                {/* Item type */}
                <div className="relative">
                  <select
                    value={row.useCustom ? 'custom' : (row.itemTypeId ?? '')}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        update(row.key, { useCustom: true, itemTypeId: undefined });
                      } else {
                        update(row.key, { useCustom: false, itemTypeId: Number(e.target.value) });
                      }
                    }}
                    className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Select type...</option>
                    {cat?.itemTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                    <option value="custom">Custom...</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                {row.useCustom && (
                  <input
                    type="text"
                    value={row.customName ?? ''}
                    onChange={(e) => update(row.key, { customName: e.target.value })}
                    placeholder="Custom item name"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}

                {/* Qty + Size */}
                <div className="flex gap-2">
                  <div className="w-24 shrink-0">
                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => update(row.key, { quantity: Math.max(1, row.quantity - 1) })}
                        className="w-9 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-lg"
                        aria-label="Decrease"
                      >−</button>
                      <span className="flex-1 text-center font-semibold text-sm text-gray-900">{row.quantity}</span>
                      <button
                        type="button"
                        onClick={() => update(row.key, { quantity: row.quantity + 1 })}
                        className="w-9 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-lg"
                        aria-label="Increase"
                      >+</button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={row.sizeLabel ?? ''}
                    onChange={(e) => update(row.key, { sizeLabel: e.target.value })}
                    placeholder="Size (e.g. 1 lb)"
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => setOutputs((rows) => [...rows, newRow(categories)])}
            className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-300 hover:text-blue-500 active:bg-blue-50 transition-colors min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            Add another portion
          </button>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-semibold rounded-xl py-3.5 hover:bg-blue-700 active:bg-blue-800 transition-colors min-h-[44px]"
          >
            Process Item
          </button>
        </form>
      </div>
    </div>
  );
}
