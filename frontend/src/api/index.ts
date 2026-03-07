import type { Category, Item, HistoryEntry, ProcessOutput, UseItemResult, ItemSnapshot } from '../types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Categories
  getCategories: () => request<Category[]>('/categories'),
  createCategory: (name: string) =>
    request<Category>('/categories', { method: 'POST', body: JSON.stringify({ name }) }),
  createItemType: (categoryId: number, name: string) =>
    request('/item-types', { method: 'POST', body: JSON.stringify({ categoryId, name }) }),

  // Items
  getItems: (search?: string) =>
    request<Item[]>(`/items${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  createItem: (data: {
    categoryId: number;
    itemTypeId?: number;
    customName?: string;
    quantity: number;
    sizeLabel?: string;
    frozenDate: string;
    notes?: string;
  }) => request<Item>('/items', { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (id: number, data: Partial<{ quantity: number; sizeLabel: string; notes: string; frozenDate: string }>) =>
    request<Item>(`/items/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteItem: (id: number) =>
    request<{ success: boolean }>(`/items/${id}`, { method: 'DELETE' }),
  useItem: (id: number, amount = 1) =>
    request<UseItemResult>(`/items/${id}/use`, { method: 'POST', body: JSON.stringify({ amount }) }),
  undoUse: (data: {
    historyId: number;
    itemId?: number;
    amount: number;
    wasRemoved: boolean;
    snapshot?: ItemSnapshot;
  }) => request('/items/undo-use', { method: 'POST', body: JSON.stringify(data) }),
  processItem: (id: number, outputs: ProcessOutput[]) =>
    request(`/items/${id}/process`, { method: 'POST', body: JSON.stringify({ outputs }) }),

  // History
  getHistory: (limit?: number) =>
    request<HistoryEntry[]>(`/history${limit ? `?limit=${limit}` : ''}`),
};
