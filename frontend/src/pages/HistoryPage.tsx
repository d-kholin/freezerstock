import { useQuery } from '@tanstack/react-query';
import { History, PackagePlus, PackageMinus, Scissors } from 'lucide-react';
import { api } from '../api';
import type { HistoryEntry } from '../types';

function ActionIcon({ action }: { action: HistoryEntry['action'] }) {
  if (action === 'added') return <PackagePlus className="w-5 h-5 text-green-500" />;
  if (action === 'processed') return <Scissors className="w-5 h-5 text-purple-500" />;
  return <PackageMinus className="w-5 h-5 text-red-400" />;
}

function actionLabel(action: HistoryEntry['action']) {
  if (action === 'added') return 'Added';
  if (action === 'processed') return 'Processed';
  return 'Used';
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function HistoryPage() {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: () => api.getHistory(200),
  });

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 bg-white border-b border-gray-100 safe-top">
        <div className="flex items-center gap-2 px-4 py-4">
          <History className="w-6 h-6 text-gray-500" />
          <h1 className="text-xl font-bold text-gray-900">History</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-400">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400 text-center px-8">
            <History className="w-12 h-12 text-gray-200" />
            <p>No history yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 px-4 py-3">
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 shrink-0 mt-0.5">
                  <ActionIcon action={entry.action} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-gray-900 truncate">{entry.itemName}</span>
                    <span className="text-xs text-gray-400 shrink-0">{formatDate(entry.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        entry.action === 'added'
                          ? 'bg-green-50 text-green-600'
                          : entry.action === 'processed'
                          ? 'bg-purple-50 text-purple-600'
                          : 'bg-red-50 text-red-500'
                      }`}
                    >
                      {actionLabel(entry.action)}
                    </span>
                    {entry.categoryName && (
                      <span className="text-xs text-gray-400">{entry.categoryName}</span>
                    )}
                    <span className="text-sm text-gray-500">
                      · {entry.quantity} {entry.quantity === 1 ? 'item' : 'items'}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">{formatTime(entry.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
            <div className="h-4" />
          </div>
        )}
      </div>
    </div>
  );
}
