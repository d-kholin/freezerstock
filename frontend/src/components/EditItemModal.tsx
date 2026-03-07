import { useState } from 'react';
import { X } from 'lucide-react';
import type { Item } from '../types';

interface Props {
  item: Item;
  onSave: (id: number, data: { quantity: number; sizeLabel?: string; notes?: string; frozenDate: string }) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
}

export default function EditItemModal({ item, onSave, onDelete, onClose }: Props) {
  const displayName = item.displayName || item.customName || item.itemTypeName || 'Unknown';
  const [quantity, setQuantity] = useState(item.quantity);
  const [sizeLabel, setSizeLabel] = useState(item.sizeLabel ?? '');
  const [notes, setNotes] = useState(item.notes ?? '');
  const [frozenDate, setFrozenDate] = useState(item.frozenDate);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(item.id, {
      quantity,
      sizeLabel: sizeLabel.trim() || undefined,
      notes: notes.trim() || undefined,
      frozenDate,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Edit: {displayName}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 active:bg-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-4 pb-6 flex flex-col gap-4">
          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity</label>
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden w-40">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-11 h-11 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-lg font-medium"
                aria-label="Decrease"
              >−</button>
              <span className="flex-1 text-center font-semibold text-gray-900">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-11 h-11 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-lg font-medium"
                aria-label="Increase"
              >+</button>
            </div>
          </div>

          {/* Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Size / Weight</label>
            <input
              type="text"
              value={sizeLabel}
              onChange={(e) => setSizeLabel(e.target.value)}
              placeholder="e.g. 2 lb"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Frozen date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Frozen Date</label>
            <input
              type="month"
              value={frozenDate}
              onChange={(e) => setFrozenDate(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-semibold rounded-xl py-3.5 hover:bg-blue-700 active:bg-blue-800 transition-colors min-h-[44px]"
          >
            Save Changes
          </button>

          {/* Delete */}
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full border border-red-200 text-red-500 font-medium rounded-xl py-3.5 hover:bg-red-50 active:bg-red-100 transition-colors min-h-[44px]"
            >
              Remove Item
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 border border-gray-200 text-gray-600 font-medium rounded-xl py-3 hover:bg-gray-50 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="flex-1 bg-red-500 text-white font-medium rounded-xl py-3 hover:bg-red-600 active:bg-red-700 min-h-[44px]"
              >
                Confirm Remove
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
