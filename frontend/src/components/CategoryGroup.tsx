import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Item } from '../types';
import ItemRow from './ItemRow';

interface Props {
  categoryName: string;
  items: Item[];
  onUse: (id: number) => void;
  onEdit: (item: Item) => void;
  defaultOpen?: boolean;
}

export default function CategoryGroup({ categoryName, items, onUse, onEdit, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 text-left"
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

      {open && (
        <div className="bg-white divide-y divide-gray-100">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onUse={onUse}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
