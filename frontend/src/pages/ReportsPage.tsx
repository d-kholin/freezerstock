import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Minus } from 'lucide-react';
import { api } from '../api';
import type { Item } from '../types';
import EditItemModal from '../components/EditItemModal';

function monthsAgo(frozenDate: string): number {
  const [year, month] = frozenDate.split('-').map(Number);
  const now = new Date();
  return (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
}

function ageLabel(months: number): string {
  if (months <= 0) return 'This month';
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return `${years}y${rem > 0 ? ` ${rem}mo` : ''} ago`;
}

interface StatCardProps {
  label: string;
  count: number;
  total: number;
  color: 'green' | 'blue' | 'amber' | 'red';
}

function StatCard({ label, count, total, color }: StatCardProps) {
  const dot: Record<string, string> = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  };
  const num: Record<string, string> = {
    green: 'text-green-700',
    blue: 'text-blue-700',
    amber: 'text-amber-700',
    red: 'text-red-700',
  };
  const bg: Record<string, string> = {
    green: 'bg-green-50 border-green-100',
    blue: 'bg-blue-50 border-blue-100',
    amber: 'bg-amber-50 border-amber-100',
    red: 'bg-red-50 border-red-100',
  };
  return (
    <div className={`flex-1 rounded-xl border p-3 ${bg[color]}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`w-2 h-2 rounded-full ${dot[color]}`} />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${num[color]}`}>{total}</div>
      <div className="text-xs text-gray-400">{count} type{count !== 1 ? 's' : ''}</div>
    </div>
  );
}

export default function ReportsPage() {
  const qc = useQueryClient();
  const [editItem, setEditItem] = useState<Item | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: () => api.getItems(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['items'] });

  const useMut = useMutation({
    mutationFn: (item: Item) => api.useItem(item.id, 1),
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

  // Age buckets
  const fresh = items.filter((i) => monthsAgo(i.frozenDate) < 3);
  const aging = items.filter((i) => { const m = monthsAgo(i.frozenDate); return m >= 3 && m < 6; });
  const old = items.filter((i) => { const m = monthsAgo(i.frozenDate); return m >= 6 && m < 12; });
  const veryOld = items.filter((i) => monthsAgo(i.frozenDate) >= 12);

  const totalQty = (arr: Item[]) => arr.reduce((s, i) => s + i.quantity, 0);

  // Use Soon list: 6+ months, oldest first
  const useSoon = [...items]
    .filter((i) => monthsAgo(i.frozenDate) >= 6)
    .sort((a, b) => monthsAgo(b.frozenDate) - monthsAgo(a.frozenDate));

  // Category breakdown
  const catMap = new Map<string, Item[]>();
  for (const item of items) {
    const cat = item.categoryName ?? 'Other';
    if (!catMap.has(cat)) catMap.set(cat, []);
    catMap.get(cat)!.push(item);
  }
  const catBreakdown = Array.from(catMap.entries())
    .map(([name, catItems]) => ({
      name,
      types: catItems.length,
      qty: catItems.reduce((s, i) => s + i.quantity, 0),
      oldest: Math.max(...catItems.map((i) => monthsAgo(i.frozenDate))),
    }))
    .sort((a, b) => b.oldest - a.oldest);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">Loading...</div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-gray-100 safe-top px-4 pt-4 pb-3">
        <h1 className="text-xl font-bold text-gray-900">Reports</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Age Summary */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Age Summary</h2>
          <div className="flex gap-2">
            <StatCard label="Fresh" count={fresh.length} total={totalQty(fresh)} color="green" />
            <StatCard label="Aging" count={aging.length} total={totalQty(aging)} color="blue" />
            <StatCard label="Old" count={old.length} total={totalQty(old)} color="amber" />
            <StatCard label="Very Old" count={veryOld.length} total={totalQty(veryOld)} color="red" />
          </div>
        </section>

        {/* Use Soon */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Use Soon{useSoon.length > 0 && ` · ${useSoon.length}`}
          </h2>
          {useSoon.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No items older than 6 months</p>
          ) : (
            <div className="rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
              {useSoon.map((item) => {
                const name = item.displayName || item.customName || item.itemTypeName || 'Unknown';
                const months = monthsAgo(item.frozenDate);
                const isVeryOld = months >= 12;
                return (
                  <button
                    key={item.id}
                    onClick={() => setEditItem(item)}
                    className="w-full flex items-center px-4 py-3 gap-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    {/* Use 1 button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); useMut.mutate(item); }}
                      aria-label={`Use one ${name}`}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 active:bg-blue-200 shrink-0 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium text-gray-900 truncate">{name}</span>
                        {item.sizeLabel && (
                          <span className="text-xs text-gray-400 shrink-0">{item.sizeLabel}</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        <span className="font-semibold text-gray-800">{item.quantity}</span>
                        {item.quantity === 1 ? ' item' : ' items'} · {item.categoryName}
                      </div>
                    </div>

                    {/* Age badge */}
                    <span
                      className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${
                        isVeryOld
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {ageLabel(months)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Category Breakdown */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Category Breakdown</h2>
          {catBreakdown.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No items in inventory</p>
          ) : (
            <div className="rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
              {catBreakdown.map(({ name, types, qty, oldest }) => (
                <div key={name} className="flex items-center px-4 py-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{name}</div>
                    <div className="text-sm text-gray-500">
                      {types} type{types !== 1 ? 's' : ''} · {qty} total
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${
                      oldest >= 12
                        ? 'bg-red-100 text-red-700'
                        : oldest >= 6
                        ? 'bg-amber-100 text-amber-700'
                        : oldest >= 3
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {ageLabel(oldest)} oldest
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="h-4" />
      </div>

      {editItem && (
        <EditItemModal
          item={editItem}
          onSave={(id, data) => updateMut.mutate({ id, data })}
          onDelete={(id) => deleteMut.mutate(id)}
          onClose={() => setEditItem(null)}
        />
      )}
    </div>
  );
}
