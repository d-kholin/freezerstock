import { useState } from 'react';
import { CheckSquare, Square, ClipboardCheck, Plus, Minus, Pencil } from 'lucide-react';
import type { Item } from '../types';
import FrozenAgo from './FrozenAgo';

interface Props {
  items: Item[];
  checkedIds: Set<number>;
  quantities: Record<number, number>;
  onToggle: (id: number) => void;
  onQuantityChange: (id: number, quantity: number) => void;
  onCheckAll: () => void;
  onUncheckAll: () => void;
  onFinish: () => void;
  onSavePartial: () => void;
  onAddItem: () => void;
  onEditItem: (item: Item) => void;
  error: string | null;
  saving: boolean;
  onCancel: () => void;
}

interface SubcategoryGroup {
  name: string;
  id: number;
  items: Item[];
}

export default function InventoryCheckMode({ items, checkedIds, quantities, onToggle, onQuantityChange, onCheckAll, onUncheckAll, onFinish, onSavePartial, onAddItem, onEditItem, error, saving, onCancel }: Props) {
  const [confirmCancel, setConfirmCancel] = useState(false);

  // Group by category then subcategory
  const categoryGroups = new Map<string, { categoryId: number; subcategoryGroups: SubcategoryGroup[]; topLevel: Item[] }>();

  for (const item of items) {
    const catName = item.categoryName ?? 'Other';
    if (!categoryGroups.has(catName)) {
      categoryGroups.set(catName, { categoryId: item.categoryId, subcategoryGroups: [], topLevel: [] });
    }
    const group = categoryGroups.get(catName)!;

    if (item.subcategoryName && item.subcategoryId != null) {
      const existing = group.subcategoryGroups.find((g) => g.id === item.subcategoryId);
      if (existing) existing.items.push(item);
      else group.subcategoryGroups.push({ name: item.subcategoryName, id: item.subcategoryId!, items: [item] });
    } else {
      group.topLevel.push(item);
    }
  }

  const checkedCount = checkedIds.size;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;
  const hasInvalidCount = items.some((item) => checkedIds.has(item.id) && (quantities[item.id] ?? item.quantity) < 1);

  return (
    <div className="flex flex-col h-full">
      {/* Check mode header */}
      <div className="shrink-0 bg-blue-600 text-white safe-top">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5" />
            <h1 className="text-lg font-bold">Inventory Check</h1>
          </div>
          <button
            onClick={() => setConfirmCancel(true)}
            className="text-blue-200 hover:text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-blue-500 active:bg-blue-700 transition-colors min-h-[44px]"
          >
            Cancel
          </button>
        </div>
        <div className="px-4 pb-3 flex items-center gap-3">
          <div className="flex-1 bg-blue-500 rounded-full h-2 overflow-hidden">
            <div
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm font-medium text-blue-100 shrink-0">
            {checkedCount} / {totalCount}
          </span>
        </div>
        <div className="flex gap-2 px-4 pb-3">
          <button
            onClick={onCheckAll}
            className="text-xs text-blue-100 hover:text-white font-medium min-h-11 px-1"
          >
            Check all
          </button>
          <span className="text-blue-400">·</span>
          <button
            onClick={onUncheckAll}
            className="text-xs text-blue-100 hover:text-white font-medium min-h-11 px-1"
          >
            Uncheck all
          </button>
          <button onClick={onAddItem} className="ml-auto flex items-center gap-1 text-xs text-white font-semibold min-h-11 px-2">
            <Plus className="w-4 h-4" /> Add item
          </button>
        </div>
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto bg-gray-50 md:px-5 md:py-4">
        <div className="md:grid md:grid-cols-2 md:items-start md:gap-4">
        {Array.from(categoryGroups.entries()).map(([catName, { subcategoryGroups, topLevel }]) => (
          <div key={catName} className="mb-2 md:mb-0 md:overflow-hidden md:rounded-2xl md:border md:border-gray-200 md:shadow-sm">
            {/* Category header */}
            <div className="px-4 py-2 bg-gray-100">
              <span className="font-semibold text-gray-700 text-sm uppercase tracking-wide">{catName}</span>
            </div>

            <div className="bg-white">
              {/* Subcategory groups */}
              {subcategoryGroups.map((group) => (
                <div key={group.id}>
                  <div className="pl-8 pr-4 py-1.5 bg-gray-50 border-t border-gray-50">
                    <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">{group.name}</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {group.items.map((item) => (
                      <CheckRow key={item.id} item={item} checked={checkedIds.has(item.id)} quantity={quantities[item.id] ?? item.quantity} onToggle={onToggle} onQuantityChange={onQuantityChange} onEdit={onEditItem} />
                    ))}
                  </div>
                </div>
              ))}

              {/* Top-level items */}
              {topLevel.length > 0 && (
                <div className={`divide-y divide-gray-100 ${subcategoryGroups.length > 0 ? 'border-t border-gray-100' : ''}`}>
                  {topLevel.map((item) => (
                    <CheckRow key={item.id} item={item} checked={checkedIds.has(item.id)} quantity={quantities[item.id] ?? item.quantity} onToggle={onToggle} onQuantityChange={onQuantityChange} onEdit={onEditItem} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        </div>
        <div className="h-24" />
      </div>

      {/* Sticky finish button */}
      <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3 safe-bottom md:flex md:items-center md:justify-end md:gap-3">
        {error && <p role="alert" className="mb-2 text-sm text-red-600">{error}</p>}
        <button
          onClick={onSavePartial}
          disabled={checkedCount === 0 || hasInvalidCount || saving}
          className="w-full md:w-auto md:min-w-52 border border-blue-600 text-blue-700 font-semibold rounded-xl py-3 mb-2 md:mb-0 disabled:opacity-40 min-h-[44px]"
        >
          {saving ? 'Saving...' : `Save ${checkedCount} checked ${checkedCount === 1 ? 'item' : 'items'}`}
        </button>
        <button
          onClick={onFinish}
          disabled={hasInvalidCount || saving}
          className="w-full md:w-auto md:min-w-52 bg-blue-600 text-white font-semibold rounded-xl py-3.5 hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-40 min-h-[44px]"
        >
          Finish Check
        </button>
      </div>
      {confirmCancel && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 md:items-center" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="cancel-check-title" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 id="cancel-check-title" className="text-lg font-bold text-gray-900">Cancel inventory check?</h2>
            <p className="mt-2 text-sm text-gray-600">Checked items and counted quantities will be discarded. Items you added or edited have already been saved.</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setConfirmCancel(false)} className="flex-1 min-h-11 rounded-xl border border-gray-300 font-semibold text-gray-700">Keep checking</button>
              <button onClick={onCancel} className="flex-1 min-h-11 rounded-xl bg-red-600 font-semibold text-white">Discard check</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckRow({ item, checked, quantity, onToggle, onQuantityChange, onEdit }: {
  item: Item;
  checked: boolean;
  quantity: number;
  onToggle: (id: number) => void;
  onQuantityChange: (id: number, quantity: number) => void;
  onEdit: (item: Item) => void;
}) {
  const displayName = item.displayName || item.customName || item.itemTypeName || 'Unknown';

  return (
    <div className="px-4 py-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-2">
        <button onClick={() => onToggle(item.id)} aria-label={`${checked ? 'Uncheck' : 'Confirm'} ${displayName}`} className="flex flex-1 min-w-0 items-center gap-3 text-left min-h-11">
          {checked ? <CheckSquare className="h-6 w-6 shrink-0 text-blue-600" /> : <Square className="h-6 w-6 shrink-0 text-gray-400" />}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium text-gray-900">{displayName}</span>
              {item.sizeLabel && <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-sm font-medium text-blue-700">{item.sizeLabel}</span>}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-sm text-gray-500">
              <span><span className="font-semibold text-gray-700">{item.quantity}</span> {item.quantity === 1 ? 'item' : 'items'}</span>
              <span className="text-gray-300">·</span>
              <FrozenAgo frozenDate={item.frozenDate} />
            </div>
          </div>
        </button>
        <button onClick={() => onEdit(item)} aria-label={`Edit ${displayName}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 active:bg-gray-100">
          <Pencil className="h-4 w-4" />
        </button>
      </div>
      {checked && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2">
          <label htmlFor={`count-${item.id}`} className="mr-auto text-sm font-semibold text-blue-900">Counted</label>
          <button type="button" onClick={() => onQuantityChange(item.id, Math.max(1, quantity - 1))} disabled={quantity <= 1} aria-label={`Decrease counted ${displayName}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-700 disabled:opacity-40 active:bg-blue-100"><Minus className="h-5 w-5" /></button>
          <input id={`count-${item.id}`} type="text" inputMode="numeric" pattern="[0-9]*" value={quantity || ''} onChange={(e) => { if (/^\d*$/.test(e.target.value)) onQuantityChange(item.id, Number(e.target.value)); }} className="h-11 w-14 rounded-lg border border-blue-200 bg-white px-1 text-center text-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="button" onClick={() => onQuantityChange(item.id, quantity + 1)} aria-label={`Increase counted ${displayName}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-700 active:bg-blue-100"><Plus className="h-5 w-5" /></button>
        </div>
      )}
    </div>
  );
}
