import React from 'react';
import {
  Home,
  MessageSquare,
  Sparkles,
  Bot,
  Gamepad2,
  User,
} from 'lucide-react';

export type StudentTab = 'home' | 'messages' | 'aitest' | 'aichat' | 'games' | 'profile';

interface BottomNavProps {
  activeTab: StudentTab;
  onChangeTab: (tab: StudentTab) => void;
  unreadCount?: number;
  docked?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  unreadCount = 0,
  docked = false,
}) => {
  // 6 tabs with individually calibrated optical icon sizes
  const tabs: Array<{
    id: StudentTab;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home className="w-[19px] h-[19px] stroke-[2.2]" />,
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: (
        <div className="relative">
          <MessageSquare className="w-[19px] h-[19px] stroke-[2.2]" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'aitest',
      label: 'AI Test',
      icon: <Sparkles className="w-[20px] h-[20px] stroke-[2.1]" />,
    },
    {
      id: 'aichat',
      label: 'AI Chat',
      icon: <Bot className="w-[21px] h-[21px] stroke-[2.1]" />,
    },
    {
      id: 'games',
      label: 'Games',
      icon: <Gamepad2 className="w-[22px] h-[22px] stroke-[2.0]" />,
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: <User className="w-[19px] h-[19px] stroke-[2.2]" />,
    },
  ];

  if (docked) {
    return (
      <div className="shrink-0 z-40 border-t bg-[var(--card-main)] border-[var(--border-main)] px-3 py-1 flex justify-center w-full shadow-lg">
        <nav
          aria-label="Student Navigation"
          className="flex items-center gap-1 sm:gap-1.5 max-w-lg w-full justify-between"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeTab(tab.id)}
                className={`relative flex flex-col items-center justify-center py-1 px-2 sm:px-3 rounded-full transition-all duration-200 select-none cursor-pointer ${
                  isActive
                    ? 'bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] font-bold shadow-xs scale-[1.02]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--raised-main)]/50'
                }`}
              >
                <div className="flex items-center justify-center">{tab.icon}</div>
                <span className="text-[10px] tracking-tight leading-none mt-1 whitespace-nowrap">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  return (
    <div className="fixed bottom-3 inset-x-0 z-40 flex justify-center px-3 pointer-events-none">
      <nav
        aria-label="Student Navigation"
        className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-full border shadow-2xl backdrop-blur-md transition-all bg-[var(--card-main)]/95 border-[var(--border-main)] max-w-lg w-full justify-between"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-2 sm:px-3 rounded-full transition-all duration-200 select-none cursor-pointer ${
                isActive
                  ? 'bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] font-bold shadow-md scale-[1.02]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--raised-main)]/50'
              }`}
            >
              <div className="flex items-center justify-center">{tab.icon}</div>
              <span className="text-[10px] tracking-tight leading-none mt-1 whitespace-nowrap">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
