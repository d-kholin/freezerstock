import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    // networkMode 'always': iOS standalone PWAs can report navigator.onLine === false
    // after resume and never fire the corrective 'online' event, which leaves queries
    // paused forever (isLoading false, data undefined → UI renders as empty inventory).
    // Always attempt the fetch; a real network failure surfaces as an error with Retry.
    queries: { staleTime: 30_000, retry: 1, networkMode: 'always' },
    mutations: { networkMode: 'always' },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
