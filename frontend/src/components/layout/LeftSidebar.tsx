import { useState } from 'react';
import {
  X,
  Menu,
  User,
  Calendar,
  Activity,
  Download,
  Calculator,
  TrendingUp,
  LogOut,
  ChevronRight,
} from 'lucide-react';

interface LeftSidebarProps {
  onNavigate: (tab: 'dashboard' | 'profile' | 'checkin-daily' | 'checkin-weekly') => void;
  onExport: () => void;
  onUpdateMaxes: () => void;
  onUtilities: () => void;
  onLogout: () => void;
  currentTab?: string;
}

export function LeftSidebar({
  onNavigate,
  onExport,
  onUpdateMaxes,
  onUtilities,
  onLogout,
  currentTab = 'dashboard',
}: LeftSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);

  const toggleSidebar = () => setIsOpen(!isOpen);

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Calendar,
      onClick: () => onNavigate('dashboard'),
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      onClick: () => onNavigate('profile'),
    },
  ];

  const actionItems = [
    {
      id: 'checkin-daily',
      label: 'Daily Check-In',
      icon: Calendar,
      onClick: () => onNavigate('checkin-daily'),
      color: 'text-blue-400 hover:bg-blue-500/10 border-blue-500/50',
    },
    {
      id: 'checkin-weekly',
      label: 'Weekly Check-In',
      icon: Activity,
      onClick: () => onNavigate('checkin-weekly'),
      color: 'text-purple-400 hover:bg-purple-500/10 border-purple-500/50',
    },
    {
      id: 'update-maxes',
      label: 'Update 1RMs',
      icon: TrendingUp,
      onClick: onUpdateMaxes,
      color: 'text-lime-400 hover:bg-lime-500/10 border-lime-500/50',
    },
    {
      id: 'utilities',
      label: 'Utilities',
      icon: Calculator,
      onClick: onUtilities,
      color: 'text-zinc-400 hover:bg-zinc-700 border-zinc-600',
    },
    {
      id: 'export',
      label: 'Export to Excel',
      icon: Download,
      onClick: onExport,
      color: 'text-zinc-400 hover:bg-zinc-700 border-zinc-600',
    },
  ];

  return (
    <>
      {/* Toggle Button (when closed) */}
      {!isOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 p-3 bg-zinc-900 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors"
          aria-label="Open sidebar"
        >
          <Menu size={24} className="text-zinc-400" />
        </button>
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 h-full bg-zinc-900 border-r border-zinc-800 z-40
          transition-all duration-300 ease-in-out
          ${isOpen ? 'w-64' : 'w-0'}
          overflow-hidden
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-lime-400 rounded-lg flex items-center justify-center">
                <span className="text-zinc-950 font-bold text-sm">IP</span>
              </div>
              <div className="text-sm">
                <p className="font-bold text-zinc-50">IronPath</p>
                <p className="text-xs text-lime-400">AI Coach</p>
              </div>
            </div>
            <button
              onClick={toggleSidebar}
              className="p-1 hover:bg-zinc-800 rounded transition-colors"
              aria-label="Close sidebar"
            >
              <X size={20} className="text-zinc-400" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Main Navigation */}
            <div>
              <p className="text-xs uppercase text-zinc-500 font-semibold mb-3 px-2">
                Navigation
              </p>
              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={item.onClick}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                        transition-all text-left
                        ${
                          isActive
                            ? 'bg-lime-500/10 text-lime-400 border border-lime-500/50'
                            : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                        }
                      `}
                    >
                      <Icon size={18} />
                      <span className="text-sm font-medium">{item.label}</span>
                      {isActive && (
                        <ChevronRight size={16} className="ml-auto" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div>
              <p className="text-xs uppercase text-zinc-500 font-semibold mb-3 px-2">
                Actions
              </p>
              <div className="space-y-1">
                {actionItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      onClick={item.onClick}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                        border transition-all text-left
                        ${item.color || 'text-zinc-400 hover:bg-zinc-800 border-zinc-700'}
                      `}
                    >
                      <Icon size={18} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer - Logout */}
          <div className="p-4 border-t border-zinc-800">
            <button
              onClick={onLogout}
              className="
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                text-red-400 hover:bg-red-500/10 border border-red-500/50
                transition-all
              "
            >
              <LogOut size={18} />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
    </>
  );
}
