import { useState, useMemo } from 'react';
import { X, ChevronDown } from 'lucide-react';
import type { Category, Subcategory } from '../types';

interface Props {
  categories: Category[];
  onSave: (data: {
    categoryId: number;
    subcategoryId?: number;
    itemTypeId?: number;
    customName?: string;
    quantity: number;
    sizeLabel?: string;
    frozenDate: string;
    notes?: string;
  }) => void;
  onClose: () => void;
  // Optional pre-fill from quick-add button
  initialCategoryId?: number;
  initialSubcategoryId?: number;
}

function currentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function AddItemModal({
  categories,
  onSave,
  onClose,
  initialCategoryId,
  initialSubcategoryId,
}: Props) {
  const [categoryId, setCategoryId] = useState<number | ''>(initialCategoryId ?? '');
  const [subcategoryId, setSubcategoryId] = useState<number | 'new' | ''>(initialSubcategoryId ?? '');
  const [newSubcatName, setNewSubcatName] = useState('');
  const [itemTypeId, setItemTypeId] = useState<number | 'custom' | ''>('');
  const [customName, setCustomName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [sizeLabel, setSizeLabel] = useState('');
  const [frozenDate, setFrozenDate] = useState(currentYearMonth());
  const [notes, setNotes] = useState('');

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId]
  );

  const hasSubcategories = (selectedCategory?.subcategories?.length ?? 0) > 0;

  const selectedSubcategory: Subcategory | undefined = useMemo(() => {
    if (!selectedCategory || !subcategoryId || subcategoryId === 'new') return undefined;
    return selectedCategory.subcategories?.find((s) => s.id === subcategoryId);
  }, [selectedCategory, subcategoryId]);

  // Item types available depend on whether a subcategory is selected
  const availableItemTypes = useMemo(() => {
    if (selectedSubcategory) return selectedSubcategory.itemTypes;
    if (!selectedCategory) return [];
    // No subcategory selected — show top-level item types
    return selectedCategory.itemTypes;
  }, [selectedCategory, selectedSubcategory]);

  const handleCategoryChange = (id: number | '') => {
    setCategoryId(id);
    setSubcategoryId('');
    setItemTypeId('');
    setNewSubcatName('');
  };

  const handleSubcategoryChange = (val: number | 'new' | '') => {
    setSubcategoryId(val);
    setItemTypeId('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) return;
    if (!itemTypeId && !customName.trim()) return;

    // If "new subcategory" is selected, we can't submit without a name
    if (subcategoryId === 'new' && !newSubcatName.trim()) return;

    onSave({
      categoryId: Number(categoryId),
      subcategoryId: subcategoryId && subcategoryId !== 'new' ? Number(subcategoryId) : undefined,
      itemTypeId: itemTypeId && itemTypeId !== 'custom' ? Number(itemTypeId) : undefined,
      customName: itemTypeId === 'custom' ? customName.trim() : undefined,
      quantity,
      sizeLabel: sizeLabel.trim() || undefined,
      frozenDate,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Add Item</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 active:bg-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-4 pb-6 flex flex-col gap-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
            <div className="relative">
              <select
                value={categoryId}
                onChange={(e) => handleCategoryChange(Number(e.target.value) || '')}
                required
                className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select category...</option>
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
                  value={subcategoryId}
                  onChange={(e) => {
                    const v = e.target.value;
                    handleSubcategoryChange(v === 'new' ? 'new' : (Number(v) || ''));
                  }}
                  className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">None (top-level)</option>
                  {selectedCategory.subcategories.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                  <option value="new">+ New Subcategory...</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              {/* New subcategory name input */}
              {subcategoryId === 'new' && (
                <input
                  type="text"
                  value={newSubcatName}
                  onChange={(e) => setNewSubcatName(e.target.value)}
                  placeholder="Subcategory name..."
                  required
                  className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}
            </div>
          )}

          {/* Item type */}
          {selectedCategory && subcategoryId !== 'new' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Type</label>
              <div className="relative">
                <select
                  value={itemTypeId}
                  onChange={(e) => setItemTypeId(e.target.value === 'custom' ? 'custom' : Number(e.target.value))}
                  required
                  className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          )}

          {/* Custom name */}
          {itemTypeId === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Venison roast"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Quantity + Size */}
          <div className="flex gap-3">
            <div className="w-28 shrink-0">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity</label>
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-11 h-11 flex items-center justify-center text-gray-500 hover:bg-gray-100 active:bg-gray-200 text-lg font-medium"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="flex-1 text-center font-semibold text-gray-900">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-11 h-11 flex items-center justify-center text-gray-500 hover:bg-gray-100 active:bg-gray-200 text-lg font-medium"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Size / Weight</label>
              <input
                type="text"
                value={sizeLabel}
                onChange={(e) => setSizeLabel(e.target.value)}
                placeholder="e.g. 2 lb, family pack"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Frozen date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Frozen Date (Month)</label>
            <input
              type="month"
              value={frozenDate}
              onChange={(e) => setFrozenDate(e.target.value)}
              required
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-semibold rounded-xl py-3.5 mt-2 hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            Add to Freezer
          </button>
        </form>
      </div>
    </div>
  );
}
