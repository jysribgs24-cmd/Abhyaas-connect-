import React from 'react';
import {
  Sparkles,
  MessageSquare,
  Bot,
  Gamepad2,
  Camera,
  Flame,
  Award,
  TrendingUp,
  Clock,
  ArrowRight,
  Bell,
  GraduationCap,
} from 'lucide-react';
import { UserProfile, BroadcastMessage, StudentTab } from '../types';

interface StudentHomeTabProps {
  user: UserProfile;
  messages: BroadcastMessage[];
  unreadCount: number;
  onNavigateTab: (tab: StudentTab) => void;
  onOpenScan: () => void;
}

export const StudentHomeTab: React.FC<StudentHomeTabProps> = ({
  user,
  messages,
  unreadCount,
  onNavigateTab,
  onOpenScan,
}) => {
  // Time of day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const recentAnnouncements = messages.slice(-3).reverse();

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      {/* Greeting Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {getGreeting()}, {(user?.name || 'Student').split(' ')[0]} 👋
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 font-semibold text-[var(--text-main)]">
              <GraduationCap className="w-3.5 h-3.5" />
              Class {user.className || '10th'} {user.section || 'A'}
            </span>
            <span>•</span>
            <span>Roll #{user.rollNo || '01'}</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border-main)] bg-[var(--raised-main)] text-xs font-semibold">
          <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span>3 Day Streak</span>
        </div>
      </div>

      {/* Hero Notice Card (Gradient indigo to violet) */}
      <div
        onClick={() => onNavigateTab('messages')}
        className="relative overflow-hidden rounded-[26px] p-6 text-white cursor-pointer transition-all duration-300 shadow-xl hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-br from-[#4F46E5] to-[#7C3AED]"
      >
        <div className="relative z-10 flex flex-col justify-between min-h-[120px]">
          <div className="flex items-start justify-between">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-white/20 backdrop-blur-md">
              <Bell className="w-3.5 h-3.5" />
              <span>Class Noticeboard</span>
            </div>
            {unreadCount > 0 ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-[#4F46E5] shadow-sm animate-pulse">
                {unreadCount} New
              </span>
            ) : (
              <span className="text-xs text-white/80">Up to date</span>
            )}
          </div>

          <div className="mt-4">
            <h2 className="text-lg sm:text-xl font-bold leading-tight">
              {messages.length > 0
                ? messages[messages.length - 1].text.slice(0, 75) +
                  (messages[messages.length - 1].text.length > 75 ? '...' : '')
                : 'No announcements posted yet this week.'}
            </h2>
            <p className="text-xs text-white/80 mt-1 flex items-center gap-1.5">
              <span>View full broadcast history</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </p>
          </div>
        </div>
      </div>

      {/* Mini Stat Chips */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3.5 rounded-2xl border bg-[var(--card-main)] border-[var(--border-main)] flex flex-col items-center text-center">
          <Award className="w-4 h-4 text-emerald-400 mb-1" />
          <span className="text-xs font-bold">14 Tests</span>
          <span className="text-[10px] text-[var(--text-muted)]">Completed</span>
        </div>
        <div className="p-3.5 rounded-2xl border bg-[var(--card-main)] border-[var(--border-main)] flex flex-col items-center text-center">
          <TrendingUp className="w-4 h-4 text-blue-400 mb-1" />
          <span className="text-xs font-bold">82%</span>
          <span className="text-[10px] text-[var(--text-muted)]">Accuracy</span>
        </div>
        <div className="p-3.5 rounded-2xl border bg-[var(--card-main)] border-[var(--border-main)] flex flex-col items-center text-center">
          <Clock className="w-4 h-4 text-purple-400 mb-1" />
          <span className="text-xs font-bold">5 Left</span>
          <span className="text-[10px] text-[var(--text-muted)]">Daily AI Limit</span>
        </div>
      </div>

      {/* 2x2 Colorful / Raised Action Tiles */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Tile 1: AI MCQ Test */}
          <div
            onClick={() => onNavigateTab('aitest')}
            className="p-4 sm:p-5 rounded-[22px] border cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] bg-[var(--card-main)] border-[var(--border-main)] group"
          >
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3 bg-indigo-500/15 text-indigo-400 group-hover:bg-indigo-500/25 transition-colors">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm sm:text-base leading-snug">AI MCQ Test</h4>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Fuzzy syllabus search & adaptive quizzes
            </p>
          </div>

          {/* Tile 2: AI Doubt Clear */}
          <div
            onClick={() => onNavigateTab('aichat')}
            className="p-4 sm:p-5 rounded-[22px] border cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] bg-[var(--card-main)] border-[var(--border-main)] group"
          >
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3 bg-violet-500/15 text-violet-400 group-hover:bg-violet-500/25 transition-colors">
              <Bot className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm sm:text-base leading-snug">Ask AI Tutor</h4>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Doubt solver & message-aware helper
            </p>
          </div>

          {/* Tile 3: Google Lens Scan Question */}
          <div
            onClick={() => {
              onNavigateTab('aichat');
              onOpenScan();
            }}
            className="p-4 sm:p-5 rounded-[22px] border cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] bg-[var(--card-main)] border-[var(--border-main)] group"
          >
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3 bg-emerald-500/15 text-emerald-400 group-hover:bg-emerald-500/25 transition-colors">
              <Camera className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm sm:text-base leading-snug">Scan Question</h4>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Photo lens to instant step-by-step answer
            </p>
          </div>

          {/* Tile 4: Educational Games */}
          <div
            onClick={() => onNavigateTab('games')}
            className="p-4 sm:p-5 rounded-[22px] border cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] bg-[var(--card-main)] border-[var(--border-main)] group"
          >
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3 bg-amber-500/15 text-amber-400 group-hover:bg-amber-500/25 transition-colors">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm sm:text-base leading-snug">Brain Games</h4>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Math Sprint, Word Scramble & Snake
            </p>
          </div>
        </div>
      </div>

      {/* Recent School Announcements Feed Preview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Recent Announcements
          </h3>
          <button
            type="button"
            onClick={() => onNavigateTab('messages')}
            className="text-xs font-semibold flex items-center gap-1 hover:underline text-[var(--text-main)]"
          >
            <span>See all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentAnnouncements.length === 0 ? (
          <div className="p-6 rounded-2xl border text-center text-xs text-[var(--text-muted)] bg-[var(--card-main)] border-[var(--border-main)]">
            No announcements yet this week.
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentAnnouncements.map((msg) => (
              <div
                key={msg.id}
                onClick={() => onNavigateTab('messages')}
                className="p-4 rounded-2xl border cursor-pointer transition-all hover:bg-[var(--raised-main)] bg-[var(--card-main)] border-[var(--border-main)]"
              >
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1">
                  <span className="font-semibold text-[var(--text-main)]">
                    {msg.senderName || 'School Admin'}
                  </span>
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs sm:text-sm line-clamp-2">{msg.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
