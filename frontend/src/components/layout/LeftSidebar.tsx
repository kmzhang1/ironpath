import { useState } from 'react';
import {
  X,
  Menu,
  User,
  Calendar,
  Activity,
  Download,
  Calculator,
  LogOut,
  Sun,
  Moon,
  LayoutDashboard
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

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
  onUpdateMaxes: _onUpdateMaxes,
  onUtilities,
  onLogout,
  currentTab = 'dashboard',
}: LeftSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const { theme, toggleTheme } = useTheme();

  const toggleSidebar = () => setIsOpen(!isOpen);

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
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
    },
    {
      id: 'checkin-weekly',
      label: 'Weekly Check-In',
      icon: Activity,
      onClick: () => onNavigate('checkin-weekly'),
    },
    {
      id: 'utilities',
      label: 'Utilities',
      icon: Calculator,
      onClick: onUtilities,
    },
  ];

  return (
    <>
      {/* Toggle Button (when closed) */}
      {!isOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-6 left-6 z-50 p-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl hover:bg-[var(--secondary)] transition-colors shadow-sm"
          aria-label="Open sidebar"
        >
          <Menu size={20} className="text-[var(--muted-foreground)]" />
        </button>
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full bg-[var(--card)] border-r border-[var(--border)] z-40 transition-all duration-300 ease-in-out overflow-hidden flex flex-col",
          isOpen ? "w-64" : "w-0"
        )}
      >
        {/* Header - maintains height even when closed */}
        <div className="p-6 mb-2" style={{ height: '88px' }}>
          <div className="flex items-center justify-between h-full">
            {isOpen && (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--primary)] shadow-sm">
                    <span className="text-white font-bold text-lg">IP</span>
                  </div>
                  <div>
                    <p className="font-bold text-[var(--foreground)] text-base tracking-tight">IronPath</p>
                    <p className="text-xs font-normal text-[var(--muted-foreground)]">AI Coach</p>
                  </div>
                </div>
                <button
                  onClick={toggleSidebar}
                  className="p-2 hover:bg-[var(--secondary)] rounded-lg transition-colors"
                  aria-label="Close sidebar"
                >
                  <X size={18} className="text-[var(--muted-foreground)]" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-4 space-y-8">
          {/* Main Navigation */}
          <div>
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3 px-3">
              Menu
            </p>
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={item.onClick}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left text-sm",
                      isActive
                        ? "bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold shadow-sm"
                        : "text-[var(--muted-foreground)] font-normal hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
                    )}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div>
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3 px-3">
              Tools
            </p>
            <div className="space-y-1">
              {actionItems.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={item.onClick}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left text-sm font-normal text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
                  >
                    <Icon size={20} strokeWidth={1.5} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              
              <button
                onClick={onExport}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left text-sm font-normal text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
              >
                <Download size={20} strokeWidth={1.5} />
                <span>Export Data</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] space-y-2 bg-[var(--card)]">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-normal text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)] transition-all"
          >
            {theme === 'light' ? (
              <>
                <Moon size={20} strokeWidth={1.5} />
                <span>Dark Mode</span>
              </>
            ) : (
              <>
                <Sun size={20} strokeWidth={1.5} />
                <span>Light Mode</span>
              </>
            )}
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-normal text-[var(--destructive)] hover:bg-[var(--destructive)]/10 transition-all"
          >
            <LogOut size={20} strokeWidth={1.5} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Overlay (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
    </>
  );
}