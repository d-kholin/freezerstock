import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, X, Snowflake } from 'lucide-react';
import { api } from '../api';
import type { Item } from '../types';
import CategoryGroup from '../components/CategoryGroup';
import AddItemModal from '../components/AddItemModal';
import ProcessModal from '../components/ProcessModal';
import EditItemModal from '../components/EditItemModal';
import UseToast, { type ToastData } from '../components/UseToast';
import AgingBanner from '../components/AgingBanner';

export default function InventoryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [processItem, setProcessItem] = useState<Item | null>(null);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories,
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['items', search],
    queryFn: () => api.getItems(search || undefined),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['items'] });
  };

  const addMutation = useMutation({
    mutationFn: api.createItem,
    onSuccess: () => { invalidate(); setShowAdd(false); },
  });

  const useMut = useMutation({
    mutationFn: ({ item, amount }: { item: Item; amount: number }) =>
      api.useItem(item.id, amount),
    onSuccess: (result, { item, amount }) => {
      invalidate();
      setToast({
        itemName: item.displayName || item.customName || item.itemTypeName || 'item',
        historyId: result.historyId,
        itemId: result.removed ? undefined : item.id,
        amount,
        wasRemoved: !!result.removed,
        snapshot: result.snapshot,
      });
    },
  });

  const undoMut = useMutation({
    mutationFn: api.undoUse,
    onSuccess: invalidate,
  });

  const processMut = useMutation({
    mutationFn: ({ id, outputs }: { id: number; outputs: Parameters<typeof api.processItem>[1] }) =>
      api.processItem(id, outputs),
    onSuccess: () => { invalidate(); setProcessItem(null); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof api.updateItem>[1] }) =>
      api.updateItem(id, data),
    onSuccess: () => { invalidate(); setEditItem(null); },
  });

  const deleteMut = useMutation({
    mutationFn: api.deleteItem,
    onSuccess: () => { invalidate(); setEditItem(null); },
  });

  const handleUndo = (t: ToastData) => {
    undoMut.mutate({
      historyId: t.historyId,
      itemId: t.itemId,
      amount: t.amount,
      wasRemoved: t.wasRemoved,
      snapshot: t.snapshot,
    });
  };

  // Group items by category
  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of items) {
      const cat = item.categoryName ?? 'Other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return map;
  }, [items]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-gray-100 safe-top">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <Snowflake className="w-6 h-6 text-blue-500" />
            <h1 className="text-xl font-bold text-gray-900">FreezerStock</h1>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            aria-label="Add item"
            className="w-11 h-11 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search freezer..."
              className="w-full bg-gray-100 rounded-xl pl-10 pr-10 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-400">Loading...</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400 px-8 text-center">
            <Snowflake className="w-12 h-12 text-gray-200" />
            {search ? (
              <p>No items matching "<strong className="text-gray-600">{search}</strong>"</p>
            ) : (
              <>
                <p className="font-medium text-gray-500">Your freezer is empty</p>
                <p className="text-sm">Tap + to add your first item</p>
              </>
            )}
          </div>
        ) : (
          <>
            {!search && (
              <AgingBanner
                items={items}
                onEdit={setEditItem}
                onUse={(item) => useMut.mutate({ item, amount: 1 })}
              />
            )}
            {search && (
              <div className="px-4 py-2 text-sm text-gray-500">
                {items.length} item type{items.length !== 1 ? 's' : ''} · {totalItems} total
              </div>
            )}
            {Array.from(grouped.entries()).map(([catName, catItems]) => (
              <CategoryGroup
                key={catName}
                categoryName={catName}
                items={catItems}
                onUse={(id) => {
                  const item = items.find((i) => i.id === id);
                  if (item) useMut.mutate({ item, amount: 1 });
                }}
                onProcess={setProcessItem}
                onEdit={setEditItem}
                defaultOpen={!search || grouped.size === 1}
              />
            ))}
            <div className="h-4" />
          </>
        )}
      </div>

      {/* Modals */}
      {showAdd && (
        <AddItemModal
          categories={categories}
          onSave={(data) => addMutation.mutate(data)}
          onClose={() => setShowAdd(false)}
        />
      )}
      {processItem && (
        <ProcessModal
          item={processItem}
          categories={categories}
          onSave={(outputs) => processMut.mutate({ id: processItem.id, outputs })}
          onClose={() => setProcessItem(null)}
        />
      )}
      {editItem && (
        <EditItemModal
          item={editItem}
          onSave={(id, data) => updateMut.mutate({ id, data })}
          onDelete={(id) => deleteMut.mutate(id)}
          onClose={() => setEditItem(null)}
        />
      )}

      {/* Use toast */}
      {toast && (
        <UseToast
          key={toast.historyId}
          toast={toast}
          onUndo={handleUndo}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
