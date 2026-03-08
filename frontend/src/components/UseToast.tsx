import { useEffect, useRef, useState } from 'react';
import { CheckCircle, RotateCcw } from 'lucide-react';

export interface ToastData {
  itemName: string;
  historyId: number;
  wasRemoved: boolean;
}

interface Props {
  toast: ToastData;
  onUndo: (toast: ToastData) => void;
  onDismiss: () => void;
}

const DURATION = 4000;

export default function UseToast({ toast, onUndo, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const dismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300); // wait for slide-out animation
  };

  const startTimer = () => {
    startRef.current = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(remaining);
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        dismiss();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    // Slide in on mount
    const t = setTimeout(() => setVisible(true), 10);
    startTimer();
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleUndo = () => {
    cancelAnimationFrame(rafRef.current);
    onUndo(toast);
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className={`fixed bottom-20 left-3 right-3 z-50 transition-all duration-300 ease-out ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Content row */}
        <div className="flex items-center gap-3 px-4 py-3.5">
          <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              Used <span className="text-blue-300">{toast.itemName}</span>
            </p>
            {toast.wasRemoved && (
              <p className="text-gray-400 text-xs mt-0.5">Last one removed from inventory</p>
            )}
          </div>
          <button
            onClick={handleUndo}
            aria-label="Undo"
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 active:bg-white/35 text-white text-sm font-semibold rounded-xl px-3 py-2 min-h-[44px] min-w-[44px] transition-colors shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            Undo
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-gray-700">
          <div
            className="h-full bg-blue-500 transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
