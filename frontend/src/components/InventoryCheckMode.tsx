import { useState } from 'react';
import { CheckSquare, Square, ClipboardCheck } from 'lucide-react';
import type { Item } from '../types';
import FrozenAgo from './FrozenAgo';

interface Props {
  items: Item[];
  onFinish: (checkedIds: Set<number>) => void;
  onCancel: () => void;
}

interface SubcategoryGroup {
  name: string;
  id: number;
  items: Item[];
}

export default function InventoryCheckMode({ items, onFinish, onCancel }: Props) {
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());

  const toggle = (id: number) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const checkAll = () => setCheckedIds(new Set(items.map((i) => i.id)));
  const uncheckAll = () => setCheckedIds(new Set());

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
            onClick={onCancel}
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
            onClick={checkAll}
            className="text-xs text-blue-200 hover:text-white font-medium"
          >
            Check all
          </button>
          <span className="text-blue-400">·</span>
          <button
            onClick={uncheckAll}
            className="text-xs text-blue-200 hover:text-white font-medium"
          >
            Uncheck all
          </button>
        </div>
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {Array.from(categoryGroups.entries()).map(([catName, { subcategoryGroups, topLevel }]) => (
          <div key={catName} className="mb-2">
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
                      <CheckRow key={item.id} item={item} checked={checkedIds.has(item.id)} onToggle={toggle} />
                    ))}
                  </div>
                </div>
              ))}

              {/* Top-level items */}
              {topLevel.length > 0 && (
                <div className={`divide-y divide-gray-100 ${subcategoryGroups.length > 0 ? 'border-t border-gray-100' : ''}`}>
                  {topLevel.map((item) => (
                    <CheckRow key={item.id} item={item} checked={checkedIds.has(item.id)} onToggle={toggle} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div className="h-24" />
      </div>

      {/* Sticky finish button */}
      <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3 safe-bottom">
        <button
          onClick={() => onFinish(checkedIds)}
          className="w-full bg-blue-600 text-white font-semibold rounded-xl py-3.5 hover:bg-blue-700 active:bg-blue-800 transition-colors min-h-[44px]"
        >
          Finish Check
        </button>
      </div>
    </div>
  );
}

function CheckRow({ item, checked, onToggle }: { item: Item; checked: boolean; onToggle: (id: number) => void }) {
  const displayName = item.displayName || item.customName || item.itemTypeName || 'Unknown';

  return (
    <button
      onClick={() => onToggle(item.id)}
      className="w-full flex items-center px-4 py-3 gap-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
    >
      {checked ? (
        <CheckSquare className="w-6 h-6 text-blue-600 shrink-0" />
      ) : (
        <Square className="w-6 h-6 text-gray-300 shrink-0" />
      )}
      <div className={`flex-1 min-w-0 ${checked ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between gap-2">
          <span className={`font-medium truncate ${checked ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {displayName}
          </span>
          {item.sizeLabel && (
            <span className="text-sm font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">
              {item.sizeLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-sm text-gray-500">
            <span className="font-semibold text-gray-700">{item.quantity}</span>
            {item.quantity === 1 ? ' item' : ' items'}
          </span>
          <span className="text-gray-300">·</span>
          <FrozenAgo frozenDate={item.frozenDate} />
        </div>
      </div>
    </button>
  );
}
