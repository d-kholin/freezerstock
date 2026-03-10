import { useState, useMemo } from 'react';
import { X, ChevronDown } from 'lucide-react';
import type { Category, Item, Subcategory } from '../types';

interface Props {
  item: Item;
  categories: Category[];
  onSave: (id: number, data: Parameters<typeof import('../api').api.updateItem>[1]) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
}

export default function EditItemModal({ item, categories, onSave, onDelete, onClose }: Props) {
  // Classification state — initialised from the item being edited
  const [categoryId, setCategoryId] = useState<number>(item.categoryId);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(item.subcategoryId ?? null);
  const [itemTypeId, setItemTypeId] = useState<number | 'custom' | null>(item.itemTypeId ?? null);
  const [customName, setCustomName] = useState(item.customName ?? '');

  // Detail state
  const [quantity, setQuantity] = useState(item.quantity);
  const [sizeLabel, setSizeLabel] = useState(item.sizeLabel ?? '');
  const [notes, setNotes] = useState(item.notes ?? '');
  const [frozenDate, setFrozenDate] = useState(item.frozenDate);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId]
  );

  const hasSubcategories = (selectedCategory?.subcategories?.length ?? 0) > 0;

  const selectedSubcategory: Subcategory | undefined = useMemo(() => {
    if (!selectedCategory || !subcategoryId) return undefined;
    return selectedCategory.subcategories?.find((s) => s.id === subcategoryId);
  }, [selectedCategory, subcategoryId]);

  const availableItemTypes = useMemo(() => {
    if (selectedSubcategory) return selectedSubcategory.itemTypes;
    if (!selectedCategory) return [];
    return selectedCategory.itemTypes;
  }, [selectedCategory, selectedSubcategory]);

  const handleCategoryChange = (id: number) => {
    setCategoryId(id);
    setSubcategoryId(null);
    setItemTypeId(null);
    setCustomName('');
  };

  const handleSubcategoryChange = (id: number | null) => {
    setSubcategoryId(id);
    setItemTypeId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const isCustom = itemTypeId === 'custom';
    if (isCustom && !customName.trim()) return;
    if (!isCustom && !itemTypeId) return;

    onSave(item.id, {
      categoryId,
      subcategoryId,
      itemTypeId: isCustom ? null : (itemTypeId as number),
      customName: isCustom ? customName.trim() : null,
      quantity,
      sizeLabel: sizeLabel.trim() || undefined,
      notes: notes.trim() || undefined,
      frozenDate,
    });
  };

  const selectClass = 'w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Edit Item</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 active:bg-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-4 pb-6 flex flex-col gap-4">

          {/* ── Classification ── */}
          <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Classification</p>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
              <div className="relative">
                <select
                  value={categoryId}
                  onChange={(e) => handleCategoryChange(Number(e.target.value))}
                  className={selectClass}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Subcategory — only when category has subcategories */}
            {selectedCategory && hasSubcategories && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Subcategory <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <select
                    value={subcategoryId ?? ''}
                    onChange={(e) => handleSubcategoryChange(Number(e.target.value) || null)}
                    className={selectClass}
                  >
                    <option value="">None (top-level)</option>
                    {selectedCategory.subcategories.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Item type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Type</label>
              <div className="relative">
                <select
                  value={itemTypeId === 'custom' ? 'custom' : (itemTypeId ?? '')}
                  onChange={(e) => setItemTypeId(e.target.value === 'custom' ? 'custom' : Number(e.target.value) || null)}
                  className={selectClass}
                >
                  <option value="">Select type...</option>
                  {availableItemTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                  <option value="custom">Custom...</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Custom name input */}
            {itemTypeId === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Venison roast"
                  required
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* ── Details ── */}

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
