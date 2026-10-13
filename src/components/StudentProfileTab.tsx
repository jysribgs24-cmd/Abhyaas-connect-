import React, { useState, useMemo } from 'react';
import {
  User,
  GraduationCap,
  Award,
  TrendingUp,
  Clock,
  LogOut,
  Sun,
  Moon,
  Users,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { UserProfile, TestResult } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface StudentProfileTabProps {
  user: UserProfile;
  testResults: TestResult[];
  onOpenAccountSwitcher: () => void;
}

export const StudentProfileTab: React.FC<StudentProfileTabProps> = ({
  user,
  testResults,
  onOpenAccountSwitcher,
}) => {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [difficultyFilter, setDifficultyFilter] = useState<'ALL' | 'EASY' | 'MEDIUM' | 'HARD'>('ALL');

  // Compute stats
  const totalTests = testResults.length;
  const avgScore = useMemo(() => {
    if (totalTests === 0) return 0;
    const totalPercentage = testResults.reduce((acc, curr) => {
      const pct = (curr.score / (curr.numberOfQs || 1)) * 100;
      return acc + pct;
    }, 0);
    return Math.round(totalPercentage / totalTests);
  }, [testResults, totalTests]);

  const lastTest = testResults[0] || null;

  // Chart data formatting
  const filteredResults = useMemo(() => {
    let list = [...testResults].reverse(); // chronological
    if (difficultyFilter !== 'ALL') {
      list = list.filter((r) => r.difficulty === difficultyFilter);
    }
    return list;
  }, [testResults, difficultyFilter]);

  const chartData = useMemo(() => {
    return filteredResults.map((r) => {
      const dateLabel = new Date(r.date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      const scorePct = Math.round((r.score / (r.numberOfQs || 1)) * 100);

      return {
        date: dateLabel,
        lesson: r.lesson,
        subject: r.subject,
        score: scorePct,
      };
    });
  }, [filteredResults]);

  // Unique subjects for chart lines
  const subjectList = useMemo(() => {
    const s = new Set<string>();
    testResults.forEach((r) => s.add(r.subject));
    return Array.from(s);
  }, [testResults]);

  const subjectColors: Record<string, string> = {
    Mathematics: '#818CF8',
    Science: '#34D399',
    'Social Science': '#FBBF24',
    English: '#F472B6',
    Computer: '#60A5FA',
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      {/* Profile Card */}
      <div className="p-6 rounded-[28px] border shadow-xl bg-[var(--card-main)] border-[var(--border-main)] flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
        <div className="w-16 h-16 rounded-3xl flex items-center justify-center font-extrabold text-2xl shadow-md bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] shrink-0">
          {(user?.name || 'Student').slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold tracking-tight">{user?.name || 'Student'}</h2>
          <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
            @{user.username} • {user.internalEmail}
          </p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--raised-main)] border border-[var(--border-main)] flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Class {user.className || '10th'} {user.section || 'A'}</span>
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--raised-main)] border border-[var(--border-main)]">
              Roll #{user.rollNo || '01'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Chips */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl border bg-[var(--card-main)] border-[var(--border-main)] text-center">
          <Award className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
          <span className="text-xl font-extrabold block">{totalTests}</span>
          <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase">
            Total Tests
          </span>
        </div>
        <div className="p-4 rounded-2xl border bg-[var(--card-main)] border-[var(--border-main)] text-center">
          <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
          <span className="text-xl font-extrabold block">{avgScore}%</span>
          <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase">
            Average Score
          </span>
        </div>
        <div className="p-4 rounded-2xl border bg-[var(--card-main)] border-[var(--border-main)] text-center">
          <Clock className="w-5 h-5 text-purple-400 mx-auto mb-1" />
          <span className="text-xl font-extrabold block">
            {lastTest ? `${lastTest.score}/${lastTest.numberOfQs}` : '—'}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase">
            Last MCQ Score
          </span>
        </div>
      </div>

      {/* Last Test Detail Card */}
      {lastTest && (
        <div className="p-4 rounded-2xl border bg-[var(--raised-main)] border-[var(--border-main)] flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase block">
              Last Test Attempt
            </span>
            <span className="font-semibold text-[var(--text-main)]">
              {lastTest.lesson} — {lastTest.difficulty} ({lastTest.numberOfQs} Qs)
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-full font-bold bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)]">
            Score: {lastTest.score}/{lastTest.numberOfQs}
          </div>
        </div>
      )}

      {/* Performance Recharts LineChart */}
      <div className="p-5 rounded-[26px] border shadow-lg bg-[var(--card-main)] border-[var(--border-main)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm">MCQ Score Progress</h3>
            <p className="text-[11px] text-[var(--text-muted)]">
              Track your scores over time across subjects
            </p>
          </div>

          {/* Difficulty Filter Chips */}
          <div className="flex items-center gap-1.5">
            {(['ALL', 'EASY', 'MEDIUM', 'HARD'] as const).map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => setDifficultyFilter(diff)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                  difficultyFilter === diff
                    ? 'bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] border-transparent'
                    : 'bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-muted)]'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-[var(--text-muted)]">
            No test data recorded yet. Complete an AI MCQ test to see your progress graph.
          </div>
        ) : (
          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" opacity={0.4} />
                <XAxis
                  dataKey="date"
                  stroke="var(--text-muted)"
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={10}
                  tickLine={false}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card-main)',
                    borderColor: 'var(--border-main)',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: 'var(--text-main)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#FFFFFF"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#FFFFFF' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Account & Settings Options */}
      <div className="rounded-[24px] border overflow-hidden bg-[var(--card-main)] border-[var(--border-main)] divide-y divide-[var(--border-main)]">
        {/* Appearance Row (Dark / Light toggle) */}
        <div className="p-4 flex items-center justify-between hover:bg-[var(--raised-main)] transition-colors">
          <div className="flex items-center gap-3">
            {theme === 'dark' ? (
              <Moon className="w-5 h-5 text-indigo-400" />
            ) : (
              <Sun className="w-5 h-5 text-amber-400" />
            )}
            <div>
              <span className="font-semibold text-xs sm:text-sm block">Appearance</span>
              <span className="text-[11px] text-[var(--text-muted)]">
                {theme === 'dark' ? 'Dark theme active' : 'Light theme active'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="px-3.5 py-1.5 rounded-full text-xs font-bold border border-[var(--border-main)] bg-[var(--raised-main)] hover:bg-[var(--card-main)] transition-colors"
          >
            {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          </button>
        </div>

        {/* Logout Row */}
        <div
          onClick={logout}
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-red-500/10 transition-colors text-red-400"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-5 h-5" />
            <div>
              <span className="font-semibold text-xs sm:text-sm block">Sign Out</span>
              <span className="text-[11px] opacity-75">
                End session on this phone (password required to sign in again)
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 opacity-75" />
        </div>
      </div>
    </div>
  );
};
