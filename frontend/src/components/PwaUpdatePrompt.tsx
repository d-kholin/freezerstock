import { useRegisterSW } from 'virtual:pwa-register/react';

export default function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;

      // Installed apps can stay open for days. Check again when they return to
      // the foreground, as well as periodically while they remain open.
      const check = () => {
        if (document.visibilityState === 'visible') {
          void registration.update().catch(() => undefined);
        }
      };
      const timer = window.setInterval(check, 60 * 60 * 1000);
      document.addEventListener('visibilitychange', check);
      window.addEventListener('focus', check);
      check();

      // The registration persists for the lifetime of this page. These
      // listeners are released when the page is replaced by the update.
      window.addEventListener('pagehide', () => {
        window.clearInterval(timer);
        document.removeEventListener('visibilitychange', check);
        window.removeEventListener('focus', check);
      }, { once: true });
    },
  });

  if (!needRefresh) return null;

  return (
    <div role="status" className="fixed inset-x-3 top-3 z-[100] mx-auto max-w-md rounded-xl border border-blue-200 bg-white p-4 shadow-xl safe-top">
      <p className="font-semibold text-gray-900">FreezerStock update ready</p>
      <p className="mt-1 text-sm text-gray-600">Reload to use the latest version. Save any inventory check first.</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void updateServiceWorker(true)}
          className="min-h-11 flex-1 rounded-lg bg-blue-600 px-4 font-medium text-white"
        >
          Reload now
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="min-h-11 rounded-lg border border-gray-300 px-4 font-medium text-gray-700"
        >
          Later
        </button>
      </div>
    </div>
  );
}
