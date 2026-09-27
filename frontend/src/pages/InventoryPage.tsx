import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, X, Snowflake, ClipboardCheck } from 'lucide-react';
import { api } from '../api';
import type { Item } from '../types';
import CategoryGroup from '../components/CategoryGroup';
import AddItemModal from '../components/AddItemModal';
import EditItemModal from '../components/EditItemModal';
import UseToast, { type ToastData } from '../components/UseToast';
import AgingBanner from '../components/AgingBanner';
import InventoryCheckMode from '../components/InventoryCheckMode';
import CheckSummaryModal from '../components/CheckSummaryModal';

interface Props {
  showAdd: boolean;
  setShowAdd: (v: boolean) => void;
}

type CheckPhase = 'idle' | 'checking' | 'summary';

export default function InventoryPage({ showAdd, setShowAdd }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  // Quick-add pre-fill state
  const [quickAddCategoryId, setQuickAddCategoryId] = useState<number | undefined>(undefined);
  const [quickAddSubcategoryId, setQuickAddSubcategoryId] = useState<number | undefined>(undefined);

  // Inventory check state
  const [checkPhase, setCheckPhase] = useState<CheckPhase>('idle');
  const [checkItems, setCheckItems] = useState<Item[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [checkedQuantities, setCheckedQuantities] = useState<Record<number, number>>({});
  const [checkError, setCheckError] = useState<string | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: api.getCategories,
  });

  const { data: items = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['items', search],
    queryFn: () => api.getItems(search || undefined),
  });

  const { data: latestCheck } = useQuery({
    queryKey: ['inventory-check-latest'],
    queryFn: api.getLatestInventoryCheck,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['items'] });
    qc.invalidateQueries({ queryKey: ['history'] });
  };

  const addMutation = useMutation({
    mutationFn: api.createItem,
    onSuccess: () => {
      invalidate();
      setShowAdd(false);
      setQuickAddCategoryId(undefined);
      setQuickAddSubcategoryId(undefined);
    },
  });

  const createCategoryMut = useMutation({
    mutationFn: api.createCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const createSubcategoryMut = useMutation({
    mutationFn: ({ categoryId, name }: { categoryId: number; name: string }) =>
      api.createSubcategory(categoryId, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const useMut = useMutation({
    mutationFn: ({ item, amount }: { item: Item; amount: number }) =>
      api.useItem(item.id, amount),
    onSuccess: (result, { item }) => {
      invalidate();
      setToast({
        itemName: item.displayName || item.customName || item.itemTypeName || 'item',
        historyId: result.historyId,
        wasRemoved: !!result.removed,
      });
    },
  });

  const undoMut = useMutation({
    mutationFn: (historyId: number) => api.restoreHistory(historyId),
    onSuccess: invalidate,
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

  const completeCheckMut = useMutation({
    mutationFn: ({ checkedItemIds, removals, quantityAdjustments }: {
      checkedItemIds: number[];
      removals: number[];
      quantityAdjustments: { itemId: number; quantity: number; expectedQuantity: number }[];
    }) => api.completeInventoryCheck(checkedItemIds, removals, quantityAdjustments),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['inventory-check-latest'] });
      setCheckPhase('idle');
      setCheckItems([]);
      setCheckedIds(new Set());
      setCheckedQuantities({});
      setCheckError(null);
    },
    onError: (err: Error) => setCheckError(err.message),
  });

  const handleUndo = (t: ToastData) => {
    undoMut.mutate(t.historyId);
  };

  const handleQuickAdd = (categoryId: number, subcategoryId?: number) => {
    setQuickAddCategoryId(categoryId);
    setQuickAddSubcategoryId(subcategoryId);
    setShowAdd(true);
  };

  const handleStartCheck = async () => {
    try {
      const result = await api.startInventoryCheck();
      setCheckItems(result.items);
      setCheckedIds(new Set());
      setCheckedQuantities({});
      setCheckError(null);
      setCheckPhase('checking');
    } catch {
      // silently fail — user stays on normal view
    }
  };

  const handleCancelCheck = () => {
    setCheckPhase('idle');
    setCheckItems([]);
    setCheckedIds(new Set());
    setCheckedQuantities({});
    setCheckError(null);
  };

  const handleToggleChecked = (id: number) => {
    setCheckedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCountChange = (id: number, quantity: number) => {
    if (Number.isSafeInteger(quantity) && quantity >= 0) {
      setCheckedQuantities((previous) => ({ ...previous, [id]: quantity }));
    }
  };

  const quantityAdjustments = () => checkItems
    .filter((item) => checkedIds.has(item.id) && checkedQuantities[item.id] !== undefined && checkedQuantities[item.id] !== item.quantity)
    .map((item) => ({ itemId: item.id, quantity: checkedQuantities[item.id], expectedQuantity: item.quantity }));

  const handleSavePartial = () => {
    completeCheckMut.mutate({
      checkedItemIds: Array.from(checkedIds),
      removals: [],
      quantityAdjustments: quantityAdjustments(),
    });
  };

  const handleCompleteCheck = (removals: number[]) => {
    completeCheckMut.mutate({
      checkedItemIds: Array.from(checkedIds),
      removals,
      quantityAdjustments: quantityAdjustments(),
    });
  };

  const handleAddSave = async (data: Parameters<typeof api.createItem>[0]) => {
    const created = await addMutation.mutateAsync(data);
    if (checkPhase === 'checking') {
      try {
        const refreshed = await api.startInventoryCheck();
        setCheckItems(refreshed.items);
        setCheckedIds((previous) => new Set(previous).add(created.id));
        setCheckedQuantities((previous) => ({ ...previous, [created.id]: created.quantity }));
      } catch {
        setCheckError('Item added, but the check list could not refresh. Restart the check to see it.');
      }
    }
  };

  const handleEditSave = async (id: number, data: Parameters<typeof api.updateItem>[1]) => {
    const previousQuantity = checkItems.find((item) => item.id === id)?.quantity;
    const updated = await updateMut.mutateAsync({ id, data });
    if (checkPhase === 'checking') {
      if (previousQuantity !== undefined && updated.quantity !== previousQuantity) {
        setCheckedQuantities((previous) => ({ ...previous, [id]: updated.quantity }));
      }
      try {
        const refreshed = await api.startInventoryCheck();
        setCheckItems(refreshed.items);
      } catch {
        setCheckError('Item saved, but the check list could not refresh. Restart the check to see it.');
      }
    }
  };

  const handleEditDelete = async (id: number) => {
    try {
      await deleteMut.mutateAsync(id);
      if (checkPhase === 'checking') {
        const refreshed = await api.startInventoryCheck();
        setCheckItems(refreshed.items);
        setCheckedIds((previous) => { const next = new Set(previous); next.delete(id); return next; });
        setCheckedQuantities((previous) => { const next = { ...previous }; delete next[id]; return next; });
      }
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : 'Could not remove item');
    }
  };

  // Last-checked display
  const lastCheckedLabel = useMemo(() => {
    if (!latestCheck) return null;
    const completedAt = latestCheck.completedAt.includes('T')
      ? latestCheck.completedAt
      : `${latestCheck.completedAt.replace(' ', 'T')}Z`;
    const ms = Date.now() - new Date(completedAt).getTime();
    const days = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
    if (days === 0) return { label: 'Latest check today', aged: false };
    if (days === 1) return { label: 'Latest check yesterday', aged: false };
    if (days < 30) return { label: `Latest check ${days}d ago`, aged: false };
    const weeks = Math.floor(days / 7);
    if (weeks < 8) return { label: `Latest check ${weeks}w ago`, aged: days > 30 };
    return { label: `Latest check ${Math.floor(days / 30)}mo ago`, aged: true };
  }, [latestCheck]);

  // Group items by category for normal view
  const grouped = useMemo(() => {
    const map = new Map<string, { categoryId: number; items: Item[] }>();
    for (const item of items) {
      const cat = item.categoryName ?? 'Other';
      if (!map.has(cat)) map.set(cat, { categoryId: item.categoryId, items: [] });
      map.get(cat)!.items.push(item);
    }
    return map;
  }, [items]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  const addModal = showAdd && (
    <AddItemModal
      categories={categories}
      onSave={handleAddSave}
      onCreateCategory={(name) => createCategoryMut.mutateAsync(name)}
      onCreateSubcategory={(categoryId, name) => createSubcategoryMut.mutateAsync({ categoryId, name })}
      onClose={() => {
        setShowAdd(false);
        setQuickAddCategoryId(undefined);
        setQuickAddSubcategoryId(undefined);
      }}
      initialCategoryId={quickAddCategoryId}
      initialSubcategoryId={quickAddSubcategoryId}
    />
  );

  // Inventory check phase — render check mode UI
  if (checkPhase === 'checking') {
    return (
      <>
      <InventoryCheckMode
        items={checkItems}
        checkedIds={checkedIds}
        quantities={checkedQuantities}
        onToggle={handleToggleChecked}
        onQuantityChange={handleCountChange}
        onCheckAll={() => setCheckedIds(new Set(checkItems.map((item) => item.id)))}
        onUncheckAll={() => setCheckedIds(new Set())}
        onFinish={() => setCheckPhase('summary')}
        onSavePartial={handleSavePartial}
        onAddItem={() => setShowAdd(true)}
        onEditItem={setEditItem}
        error={checkError}
        saving={completeCheckMut.isPending}
        onCancel={handleCancelCheck}
      />
      {addModal}
      {editItem && (
        <EditItemModal
          item={editItem}
          categories={categories}
          onSave={handleEditSave}
          onDelete={handleEditDelete}
          onClose={() => setEditItem(null)}
        />
      )}
      </>
    );
  }

  // Summary phase — still show normal view underneath, modal on top
  const uncheckedItems = checkPhase === 'summary'
    ? checkItems.filter((i) => !checkedIds.has(i.id))
    : [];

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
            onClick={handleStartCheck}
            aria-label="Check inventory"
            className="w-11 h-11 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <ClipboardCheck className="w-5 h-5" />
          </button>
        </div>

        {/* Last checked indicator */}
        {lastCheckedLabel && !search && (
          <div className="px-4 pb-1">
            <span className={`text-xs font-medium ${lastCheckedLabel.aged ? 'text-amber-500' : 'text-gray-400'}`}>
              {lastCheckedLabel.label}
            </span>
          </div>
        )}
        {!latestCheck && !search && (
          <div className="px-4 pb-1">
            <span className="text-xs text-gray-400">Inventory never checked</span>
          </div>
        )}

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
      <div className="flex-1 overflow-y-auto md:bg-gray-50 md:px-5 md:py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-400">Loading...</div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 px-8 text-center">
            <p className="font-medium text-gray-500">Couldn't load your inventory</p>
            <button
              onClick={() => refetch()}
              className="text-sm text-blue-600 underline"
            >
              Retry
            </button>
            <a href="/api/app-recovery" className="text-sm text-gray-500 underline">
              Refresh saved app files
            </a>
          </div>
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
            <div className="md:grid md:grid-cols-2 md:items-start md:gap-4">
            {Array.from(grouped.entries()).map(([catName, { categoryId, items: catItems }]) => (
              <CategoryGroup
                key={catName}
                categoryName={catName}
                categoryId={categoryId}
                items={catItems}
                onUse={(id) => {
                  const item = items.find((i) => i.id === id);
                  if (item) useMut.mutate({ item, amount: 1 });
                }}
                onEdit={setEditItem}
                onQuickAdd={handleQuickAdd}
                defaultOpen={!search || grouped.size === 1}
              />
            ))}
            </div>
            <div className="h-4" />
          </>
        )}
      </div>

      {/* Modals */}
      {addModal}
      {editItem && (
        <EditItemModal
          item={editItem}
          categories={categories}
          onSave={handleEditSave}
          onDelete={handleEditDelete}
          onClose={() => setEditItem(null)}
        />
      )}

      {/* Check summary modal */}
      {checkPhase === 'summary' && (
        <>
        {checkError && <div role="alert" className="fixed z-[60] top-4 left-4 right-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{checkError}</div>}
        <CheckSummaryModal
          uncheckedItems={uncheckedItems}
          onComplete={handleCompleteCheck}
          onCancel={() => setCheckPhase('checking')}
        />
        </>
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
