import React, { useState, useEffect } from 'react';
import {
  Users,
  Radio,
  BookOpen,
  Settings,
  LogOut,
  Shield,
  Sun,
  Moon,
  ExternalLink,
  UserPlus,
  Send,
  Eye,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { UserProfile, ClassGroup, SubjectItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  subscribeClasses,
  subscribeAllStudents,
  subscribeAllAdmins,
  subscribeSubjects,
} from '../../lib/dataService';
import { AdminClassManager } from './AdminClassManager';
import { AdminBroadcast } from './AdminBroadcast';
import { AdminSubjects } from './AdminSubjects';
import { AdminSettings } from './AdminSettings';
import { CountdownPasswordModal } from '../CountdownPasswordModal';
import { AccountSwitcherModal } from '../AccountSwitcherModal';

type AdminMenu = 'classes' | 'broadcast' | 'subjects' | 'settings';

interface AdminDashboardProps {
  adminUser: UserProfile;
  onViewAsStudent: (cls: ClassGroup) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminUser,
  onViewAsStudent,
}) => {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [activeMenu, setActiveMenu] = useState<AdminMenu>('classes');
  const [triggerAddAdmin, setTriggerAddAdmin] = useState(false);

  // Firestore real-time state
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
  const [allAdmins, setAllAdmins] = useState<UserProfile[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);

  // 10-second password reveal modal state
  const [revealedAccounts, setRevealedAccounts] = useState<any[]>([]);
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);

  useEffect(() => {
    const unsub1 = subscribeClasses((cls) => setClasses(cls));
    const unsub2 = subscribeAllStudents((students) => setAllStudents(students));
    const unsub3 = subscribeAllAdmins((admins) => setAllAdmins(admins));
    const unsub4 = subscribeSubjects((subj) => setSubjects(subj));

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, []);

  const handleShowCredentials = (accounts: any[]) => {
    setRevealedAccounts(accounts);
    setIsCredentialsModalOpen(true);
  };

  const navItems = [
    {
      id: 'classes' as const,
      label: '1. Classes & Students',
      icon: <Users className="w-5 h-5" />,
      badge: classes.length,
    },
    {
      id: 'broadcast' as const,
      label: '2. Broadcast to Students',
      icon: <Radio className="w-5 h-5" />,
    },
    {
      id: 'subjects' as const,
      label: '3. Subjects & Syllabus',
      icon: <BookOpen className="w-5 h-5" />,
      badge: subjects.length,
    },
    {
      id: 'settings' as const,
      label: '4. Admin Management & Settings',
      icon: <Settings className="w-5 h-5" />,
      badge: allAdmins.length,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-300">
      {/* Top Header Bar */}
      <header className="h-16 border-b border-[var(--border-main)] bg-[var(--card-main)] px-4 sm:px-6 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-sm bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm sm:text-base leading-tight">
              Abhyaas Admin — {adminUser.name}
            </h1>
            <p className="text-[10px] text-[var(--text-muted)] tracking-wider uppercase font-semibold">
              Abhyaas International School Administration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Quick theme toggle */}
          <button
            type="button"
            aria-label="Toggle Theme"
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full flex items-center justify-center border border-[var(--border-main)] hover:bg-[var(--raised-main)] transition-colors cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-300" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {/* Switch Account button */}
          <button
            type="button"
            onClick={() => setShowAccountSwitcher(true)}
            className="px-3.5 py-1.5 rounded-full text-xs font-bold border border-[var(--border-main)] hover:bg-[var(--raised-main)] text-[var(--text-main)] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span className="hidden sm:inline">Switch Account</span>
          </button>

          {/* Logout button */}
          <button
            type="button"
            onClick={logout}
            className="px-3.5 py-1.5 rounded-full text-xs font-bold border border-[var(--border-main)] hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Quick Action Command Strip */}
      <div className="border-b border-[var(--border-main)] bg-[var(--raised-main)]/60 px-4 py-2 sm:px-6 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
            <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--text-main)]">
              Quick Actions:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick 1: Send Message to Student */}
            <button
              type="button"
              onClick={() => setActiveMenu('broadcast')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeMenu === 'broadcast'
                  ? 'bg-indigo-500 text-white shadow-xs'
                  : 'border border-indigo-500/40 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>📢 Send Message to Students</span>
            </button>

            {/* Quick 2: Add Admin */}
            <button
              type="button"
              onClick={() => {
                setActiveMenu('settings');
                setTriggerAddAdmin(true);
              }}
              className="px-3 py-1.5 rounded-full text-xs font-bold border border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>🛡️ + Add Admin</span>
            </button>

            {/* Quick 3: Add/Enroll Student */}
            <button
              type="button"
              onClick={() => setActiveMenu('classes')}
              className="px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>👥 Class & Student Manager</span>
            </button>

            {/* Quick 4: View as Student */}
            {classes.length > 0 && (
              <button
                type="button"
                onClick={() => onViewAsStudent(classes[0])}
                className="px-3 py-1.5 rounded-full text-xs font-bold border border-[var(--border-main)] hover:bg-[var(--card-main)] text-[var(--text-main)] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>👁️ View as Student</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* WhatsApp Web Layout: 30% Dark Sidebar + 70% Right Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-7xl w-full mx-auto p-2 sm:p-4 gap-3">
        {/* Left Sidebar Menu */}
        <aside className="w-full md:w-64 rounded-2xl border bg-[var(--card-main)] border-[var(--border-main)] p-3 flex md:flex-col justify-between shrink-0 shadow-sm">
          <div className="w-full space-y-1 flex md:flex-col overflow-x-auto md:overflow-visible">
            {navItems.map((item) => {
              const isActive = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveMenu(item.id)}
                  className={`w-full p-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all select-none shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] font-bold shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--raised-main)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-black/20 text-current'
                          : 'bg-[var(--raised-main)] text-[var(--text-muted)]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="hidden md:block p-3.5 rounded-xl border bg-[var(--raised-main)] border-[var(--border-main)] text-[11px] text-[var(--text-muted)] space-y-1.5">
            <span className="font-bold text-[var(--text-main)] block flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span>Admin Guide</span>
            </span>
            <p className="text-[10px] leading-relaxed">
              • <strong>Send Messages:</strong> Click Menu 2 (Broadcast) to post announcements to any class or school-wide.
            </p>
            <p className="text-[10px] leading-relaxed">
              • <strong>Add Admins:</strong> Click Menu 4 (Settings) &rarr; &quot;+ Add New Admin&quot;.
            </p>
          </div>
        </aside>

        {/* Right Main Content */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {activeMenu === 'classes' && (
            <AdminClassManager
              classes={classes}
              allStudents={allStudents}
              onShowCredentialsModal={handleShowCredentials}
            />
          )}

          {activeMenu === 'broadcast' && (
            <AdminBroadcast adminUser={adminUser} classes={classes} />
          )}

          {activeMenu === 'subjects' && <AdminSubjects subjects={subjects} />}

          {activeMenu === 'settings' && (
            <div className="flex-1 overflow-y-auto pr-1">
              <AdminSettings
                adminUser={adminUser}
                classes={classes}
                allStudents={allStudents}
                allAdmins={allAdmins}
                onViewAsStudent={onViewAsStudent}
                onShowCredentialsModal={handleShowCredentials}
                openAddAdminImmediately={triggerAddAdmin}
                onCloseAddAdminImmediately={() => setTriggerAddAdmin(false)}
              />
            </div>
          )}
        </main>
      </div>

      {/* 10-Second Countdown Password Modal */}
      <CountdownPasswordModal
        isOpen={isCredentialsModalOpen}
        onClose={() => setIsCredentialsModalOpen(false)}
        accounts={revealedAccounts}
      />

      {/* Account Switcher Modal */}
      <AccountSwitcherModal
        isOpen={showAccountSwitcher}
        onClose={() => setShowAccountSwitcher(false)}
      />
    </div>
  );
};
