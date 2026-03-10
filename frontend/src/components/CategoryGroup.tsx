import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import type { Item } from '../types';
import ItemRow from './ItemRow';

interface Props {
  categoryName: string;
  categoryId: number;
  items: Item[];
  onUse: (id: number) => void;
  onEdit: (item: Item) => void;
  onQuickAdd: (categoryId: number, subcategoryId?: number) => void;
  defaultOpen?: boolean;
}

interface SubcategoryGroup {
  name: string;
  id: number;
  items: Item[];
}

export default function CategoryGroup({
  categoryName,
  categoryId,
  items,
  onUse,
  onEdit,
  onQuickAdd,
  defaultOpen = true,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [openSubcats, setOpenSubcats] = useState<Record<string, boolean>>({});

  // Group items by subcategory
  const subcategoryGroups: SubcategoryGroup[] = [];
  const topLevelItems: Item[] = [];

  for (const item of items) {
    if (item.subcategoryName && item.subcategoryId != null) {
      const existing = subcategoryGroups.find((g) => g.id === item.subcategoryId);
      if (existing) {
        existing.items.push(item);
      } else {
        subcategoryGroups.push({ name: item.subcategoryName, id: item.subcategoryId, items: [item] });
      }
    } else {
      topLevelItems.push(item);
    }
  }

  const toggleSubcat = (id: number) => {
    setOpenSubcats((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  };

  return (
    <div className="mb-2">
      {/* Category header */}
      <div className="flex items-center bg-gray-100">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex-1 flex items-center justify-between px-4 py-3 text-left"
          aria-expanded={open}
        >
          <span className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
            {categoryName}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-400 bg-white rounded-full px-2 py-0.5">
              {items.length}
            </span>
            {open ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </button>
        {/* Quick-add button */}
        <button
          onClick={(e) => { e.stopPropagation(); onQuickAdd(categoryId); }}
          aria-label={`Add item to ${categoryName}`}
          className="w-11 h-11 flex items-center justify-center text-blue-600 hover:bg-blue-50 active:bg-blue-100 shrink-0 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {open && (
        <div className="bg-white">
          {/* Subcategory groups */}
          {subcategoryGroups.map((group) => {
            const subcatOpen = openSubcats[group.id] ?? true;
            return (
              <div key={group.id} className="border-t border-gray-50">
                {/* Subcategory header */}
                <div className="flex items-center bg-gray-50">
                  <button
                    onClick={() => toggleSubcat(group.id)}
                    className="flex-1 flex items-center justify-between pl-8 pr-3 py-2 text-left"
                    aria-expanded={subcatOpen}
                  >
                    <span className="font-medium text-gray-500 text-xs uppercase tracking-wide">
                      {group.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-gray-400 bg-white rounded-full px-1.5 py-0.5">
                        {group.items.length}
                      </span>
                      {subcatOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </div>
                  </button>
                  {/* Quick-add for subcategory */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onQuickAdd(categoryId, group.id); }}
                    aria-label={`Add item to ${group.name}`}
                    className="w-11 h-11 flex items-center justify-center text-blue-500 hover:bg-blue-50 active:bg-blue-100 shrink-0 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {subcatOpen && (
                  <div className="divide-y divide-gray-100">
                    {group.items.map((item) => (
                      <ItemRow key={item.id} item={item} onUse={onUse} onEdit={onEdit} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Top-level items (no subcategory) */}
          {topLevelItems.length > 0 && (
            <div className={`divide-y divide-gray-100 ${subcategoryGroups.length > 0 ? 'border-t border-gray-100' : ''}`}>
              {topLevelItems.map((item) => (
                <ItemRow key={item.id} item={item} onUse={onUse} onEdit={onEdit} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
