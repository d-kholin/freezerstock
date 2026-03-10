import { useState, useEffect, useRef } from 'react';
import { Minus, MoreVertical } from 'lucide-react';
import type { Item } from '../types';
import FrozenAgo from './FrozenAgo';

interface Props {
  item: Item;
  onUse: (id: number) => void;
  onEdit: (item: Item) => void;
}

interface MenuPos {
  top: number;
  right: number;
}

export default function ItemRow({ item, onUse, onEdit }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPos>({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const displayName = item.displayName || item.customName || item.itemTypeName || 'Unknown';

  // Position the fixed dropdown relative to the button
  const openMenu = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setMenuOpen(true);
  };

  // Close on scroll so menu doesn't drift
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, [menuOpen]);

  return (
    <div className="flex items-center px-4 py-3 gap-3">
      {/* Use button */}
      <button
        onClick={() => onUse(item.id)}
        aria-label={`Use one ${displayName}`}
        className="w-11 h-11 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 active:bg-blue-200 shrink-0 transition-colors"
      >
        <Minus className="w-5 h-5" />
      </button>

      {/* Item info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-gray-900 truncate">{displayName}</span>
          {item.sizeLabel && (
            <span className="text-sm font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">
              {item.sizeLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-sm text-gray-500">
            <span className="font-semibold text-gray-800">{item.quantity}</span>
            {item.quantity === 1 ? ' item' : ' items'}
          </span>
          <span className="text-gray-300">·</span>
          <FrozenAgo frozenDate={item.frozenDate} />
        </div>
        {item.notes && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{item.notes}</p>
        )}
      </div>

      {/* Actions menu button */}
      <button
        ref={btnRef}
        onClick={openMenu}
        aria-label="More options"
        className="w-11 h-11 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 active:bg-gray-200 transition-colors shrink-0"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {/* Fixed-position dropdown — escapes scroll container */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div
            className="fixed z-50 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[160px]"
            style={{ top: menuPos.top, right: menuPos.right }}
          >
            <button
              onClick={() => { onEdit(item); setMenuOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100"
            >
              Edit
            </button>
          </div>
        </>
      )}
    </div>
  );
}
