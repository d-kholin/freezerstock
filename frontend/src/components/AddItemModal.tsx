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
  onCreateCategory: (name: string) => Promise<Category>;
  onCreateSubcategory: (categoryId: number, name: string) => Promise<{ id: number }>;
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
  onCreateCategory,
  onCreateSubcategory,
  onClose,
  initialCategoryId,
  initialSubcategoryId,
}: Props) {
  const [categoryId, setCategoryId] = useState<number | 'new' | ''>(initialCategoryId ?? '');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [subcategoryId, setSubcategoryId] = useState<number | 'new' | ''>(initialSubcategoryId ?? '');
  const [newSubcatName, setNewSubcatName] = useState('');
  const [itemTypeId, setItemTypeId] = useState<number | 'custom' | ''>('');
  const [customName, setCustomName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [sizeLabel, setSizeLabel] = useState('');
  const [frozenDate, setFrozenDate] = useState(currentYearMonth());
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedCategory = useMemo(
    () => (typeof categoryId === 'number' ? categories.find((c) => c.id === categoryId) : undefined),
    [categories, categoryId]
  );

  const selectedSubcategory: Subcategory | undefined = useMemo(() => {
    if (!selectedCategory || !subcategoryId || subcategoryId === 'new') return undefined;
    return selectedCategory.subcategories?.find((s) => s.id === subcategoryId);
  }, [selectedCategory, subcategoryId]);

  const availableItemTypes = useMemo(() => {
    if (selectedSubcategory) return selectedSubcategory.itemTypes;
    if (!selectedCategory) return [];
    return selectedCategory.itemTypes;
  }, [selectedCategory, selectedSubcategory]);

  const handleCategoryChange = (val: number | 'new' | '') => {
    setCategoryId(val);
    setNewCategoryName('');
    setSubcategoryId('');
    setNewSubcatName('');
    setItemTypeId('');
    setCustomName('');
  };

  const handleSubcategoryChange = (val: number | 'new' | '') => {
    setSubcategoryId(val);
    setNewSubcatName('');
    setItemTypeId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Validate new-category name if that option is selected
    if (categoryId === 'new' && !newCategoryName.trim()) return;
    if (categoryId === '' ) return;
    if (subcategoryId === 'new' && !newSubcatName.trim()) return;
    if (!itemTypeId && !customName.trim()) return;

    setSubmitting(true);
    try {
      // 1. Create the category if needed
      let resolvedCategoryId: number;
      if (categoryId === 'new') {
        const created = await onCreateCategory(newCategoryName.trim());
        resolvedCategoryId = created.id;
      } else {
        resolvedCategoryId = categoryId as number;
      }

      // 2. Create the subcategory if needed
      let resolvedSubcategoryId: number | undefined;
      const shouldCreateSubcategory =
        (categoryId === 'new' && !!newSubcatName.trim()) ||
        (subcategoryId === 'new' && !!newSubcatName.trim());

      if (shouldCreateSubcategory) {
        const created = await onCreateSubcategory(resolvedCategoryId, newSubcatName.trim());
        resolvedSubcategoryId = created.id;
      } else if (subcategoryId && subcategoryId !== 'new') {
        resolvedSubcategoryId = subcategoryId as number;
      }

      // 3. Save the item
      const shouldUseCustomName = categoryId === 'new' || itemTypeId === 'custom';

      onSave({
        categoryId: resolvedCategoryId,
        subcategoryId: resolvedSubcategoryId,
        itemTypeId: itemTypeId && itemTypeId !== 'custom' ? Number(itemTypeId) : undefined,
        customName: shouldUseCustomName ? customName.trim() : undefined,
        quantity,
        sizeLabel: sizeLabel.trim() || undefined,
        frozenDate,
        notes: notes.trim() || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectClass = 'w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  const inputClass = 'w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

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
                onChange={(e) => {
                  const v = e.target.value;
                  handleCategoryChange(v === 'new' ? 'new' : (Number(v) || ''));
                }}
                required
                className={selectClass}
              >
                <option value="">Select category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                <option value="new">+ New Category...</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
            {categoryId === 'new' && (
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name..."
                required
                autoFocus
                className={`mt-2 ${inputClass}`}
              />
            )}
          </div>

          {/* Subcategory — available for any selected category */}
          {selectedCategory && (
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
                  className={selectClass}
                >
                  <option value="">None (top-level)</option>
                  {selectedCategory.subcategories.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                  <option value="new">+ New Subcategory...</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              {subcategoryId === 'new' && (
                <input
                  type="text"
                  value={newSubcatName}
                  onChange={(e) => setNewSubcatName(e.target.value)}
                  placeholder="Subcategory name..."
                  required
                  className={`mt-2 ${inputClass}`}
                />
              )}
            </div>
          )}

          {/* Item type — shown once a real category is selected and not mid-new-subcategory */}
          {selectedCategory && subcategoryId !== 'new' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Type</label>
              <div className="relative">
                <select
                  value={itemTypeId}
                  onChange={(e) => setItemTypeId(e.target.value === 'custom' ? 'custom' : Number(e.target.value))}
                  required
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
          )}

          {/* For a brand-new category, the only option is a custom item name */}
          {categoryId === 'new' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Subcategory <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={newSubcatName}
                onChange={(e) => setNewSubcatName(e.target.value)}
                placeholder="Subcategory name..."
                className={inputClass}
              />
            </div>
          )}

          {categoryId === 'new' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Venison roast"
                required
                className={inputClass}
              />
            </div>
          )}

          {/* Custom name when existing category + Custom... selected */}
          {itemTypeId === 'custom' && categoryId !== 'new' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Venison roast"
                required
                className={inputClass}
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
                >−</button>
                <span className="flex-1 text-center font-semibold text-gray-900">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-11 h-11 flex items-center justify-center text-gray-500 hover:bg-gray-100 active:bg-gray-200 text-lg font-medium"
                  aria-label="Increase quantity"
                >+</button>
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Size / Weight</label>
              <input
                type="text"
                value={sizeLabel}
                onChange={(e) => setSizeLabel(e.target.value)}
                placeholder="e.g. 2 lb, family pack"
                className={inputClass}
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
              className={inputClass}
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
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white font-semibold rounded-xl py-3.5 mt-2 hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {submitting ? 'Adding...' : 'Add to Freezer'}
          </button>
        </form>
      </div>
    </div>
  );
}
