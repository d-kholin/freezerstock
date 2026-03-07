import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { Archive, History, BarChart2, Plus } from 'lucide-react';
import InventoryPage from './pages/InventoryPage';
import HistoryPage from './pages/HistoryPage';
import ReportsPage from './pages/ReportsPage';

function AppShell() {
  const [showAdd, setShowAdd] = useState(false);
  const navigate = useNavigate();

  const handleAdd = () => {
    navigate('/');
    setShowAdd(true);
  };

  return (
    <div className="flex flex-col h-dvh max-w-lg mx-auto bg-white shadow-xl">
      {/* Main content area */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <Routes>
          <Route path="/" element={<InventoryPage showAdd={showAdd} setShowAdd={setShowAdd} />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </main>

      {/* Bottom tab bar */}
      <nav className="flex border-t border-gray-200 bg-white safe-bottom shrink-0">
        {/* Add button — leftmost */}
        <button
          onClick={handleAdd}
          aria-label="Add item"
          className="flex-1 flex flex-col items-center justify-center py-2 gap-1 text-xs font-medium text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition-colors"
        >
          <div className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-600 text-white">
            <Plus className="w-5 h-5" />
          </div>
          Add
        </button>
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2 gap-1 text-xs font-medium transition-colors ${
              isActive ? 'text-blue-600' : 'text-gray-500'
            }`
          }
        >
          <Archive className="w-6 h-6" />
          Inventory
        </NavLink>
        <NavLink
          to="/reports"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2 gap-1 text-xs font-medium transition-colors ${
              isActive ? 'text-blue-600' : 'text-gray-500'
            }`
          }
        >
          <BarChart2 className="w-6 h-6" />
          Reports
        </NavLink>
        <NavLink
          to="/history"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2 gap-1 text-xs font-medium transition-colors ${
              isActive ? 'text-blue-600' : 'text-gray-500'
            }`
          }
        >
          <History className="w-6 h-6" />
          History
        </NavLink>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
