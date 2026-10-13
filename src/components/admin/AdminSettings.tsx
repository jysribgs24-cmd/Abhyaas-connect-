import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  KeyRound,
  Trash2,
  Eye,
  Sun,
  Moon,
  Users,
  Building,
  GraduationCap,
  X,
  AlertCircle,
} from 'lucide-react';
import { ClassGroup, UserProfile } from '../../types';
import {
  createAdminAccount,
  resetUserPassword,
} from '../../lib/authService';
import { deleteUserAccount } from '../../lib/dataService';
import { useTheme } from '../../context/ThemeContext';

interface AdminSettingsProps {
  adminUser: UserProfile;
  classes: ClassGroup[];
  allStudents: UserProfile[];
  allAdmins: UserProfile[];
  onViewAsStudent: (cls: ClassGroup) => void;
  onShowCredentialsModal: (
    accounts: Array<{ name: string; username: string; password: string }>
  ) => void;
  openAddAdminImmediately?: boolean;
  onCloseAddAdminImmediately?: () => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  adminUser,
  classes,
  allStudents,
  allAdmins,
  onViewAsStudent,
  onShowCredentialsModal,
  openAddAdminImmediately,
  onCloseAddAdminImmediately,
}) => {
  const { theme, toggleTheme } = useTheme();

  // Add Admin modal
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);

  useEffect(() => {
    if (openAddAdminImmediately) {
      setIsAddAdminOpen(true);
    }
  }, [openAddAdminImmediately]);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);

  // Reset password modal
  const [resetAdmin, setResetAdmin] = useState<UserProfile | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);

  // View as student modal
  const [isViewAsStudentOpen, setIsViewAsStudentOpen] = useState(false);
  const [selectedPreviewClassId, setSelectedPreviewClassId] = useState(classes[0]?.id || '');

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName || !newAdminUsername || !newAdminPassword) return;

    setAdminError(null);
    try {
      await createAdminAccount({
        name: newAdminName,
        username: newAdminUsername,
        password: newAdminPassword,
      });

      onShowCredentialsModal([
        {
          name: newAdminName,
          username: newAdminUsername,
          password: newAdminPassword,
        },
      ]);

      setIsAddAdminOpen(false);
      setNewAdminName('');
      setNewAdminUsername('');
      setNewAdminPassword('');
    } catch (err: any) {
      setAdminError(err.message || 'Failed to create admin');
    }
  };

  const handleResetAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetAdmin || !resetPasswordVal.trim()) return;

    setResetError(null);
    try {
      await resetUserPassword(resetAdmin.uid, resetPasswordVal.trim());
      onShowCredentialsModal([
        {
          name: resetAdmin.name,
          username: resetAdmin.username,
          password: resetPasswordVal.trim(),
        },
      ]);
      setResetAdmin(null);
      setResetPasswordVal('');
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* 3 Live Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border bg-[var(--card-main)] border-[var(--border-main)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-500/15 text-indigo-400">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-extrabold block">{classes.length}</span>
            <span className="text-xs text-[var(--text-muted)] font-semibold uppercase">
              Total Classes
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border bg-[var(--card-main)] border-[var(--border-main)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-500/15 text-emerald-400">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-extrabold block">{allStudents.length}</span>
            <span className="text-xs text-[var(--text-muted)] font-semibold uppercase">
              Total Students
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl border bg-[var(--card-main)] border-[var(--border-main)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-purple-500/15 text-purple-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-extrabold block">{allAdmins.length}</span>
            <span className="text-xs text-[var(--text-muted)] font-semibold uppercase">
              Total Admins
            </span>
          </div>
        </div>
      </div>

      {/* View as Student Banner Card */}
      <div className="p-6 rounded-[26px] border bg-[var(--card-main)] border-[var(--border-main)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-base flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-400" />
            <span>View As Student (Preview Mode)</span>
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Experience the student panel interface in read-only mode for any chosen class.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsViewAsStudentOpen(true)}
          className="px-5 py-2.5 rounded-full text-xs font-bold border border-[var(--border-main)] hover:bg-[var(--raised-main)] text-[var(--text-main)] transition-colors whitespace-nowrap active:scale-95"
        >
          Select Class to Preview
        </button>
      </div>

      {/* Admin Accounts Management Table */}
      <div className="rounded-[26px] border overflow-hidden bg-[var(--card-main)] border-[var(--border-main)] shadow-sm">
        <div className="p-5 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--raised-main)]">
          <div>
            <h3 className="font-bold text-sm sm:text-base">Admin Accounts Management</h3>
            <p className="text-[11px] text-[var(--text-muted)]">
              Passwords are never stored in plain text and cannot be viewed
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddAdminOpen(true)}
            className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] hover:opacity-90 flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add New Admin</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--raised-main)]/60 text-[var(--text-muted)] border-b border-[var(--border-main)] uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Admin Name</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Auth Email</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-main)]">
              {allAdmins.map((adm) => (
                <tr key={adm.uid} className="hover:bg-[var(--raised-main)]/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-[var(--text-main)]">
                    {adm.name}
                    {adm.uid === adminUser.uid && (
                      <span className="ml-2 px-2 py-0.5 rounded-md text-[9px] font-bold bg-indigo-500/20 text-indigo-300">
                        You
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[var(--text-muted)]">
                    @{adm.username}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-[var(--text-muted)]">
                    {adm.internalEmail}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                    <button
                      type="button"
                      title="Reset Password"
                      onClick={() => {
                        setResetAdmin(adm);
                        setResetPasswordVal('');
                        setResetError(null);
                      }}
                      className="p-1.5 rounded-lg border border-[var(--border-main)] hover:bg-[var(--raised-main)] text-[var(--text-muted)] hover:text-white"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>
                    {adm.username !== 'alok' && adm.uid !== adminUser.uid && (
                      <button
                        type="button"
                        title="Delete Admin"
                        onClick={() => {
                          deleteUserAccount(adm.uid);
                        }}
                        className="p-1.5 rounded-lg border border-[var(--border-main)] hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Appearance Row */}
      <div className="p-5 rounded-[24px] border bg-[var(--card-main)] border-[var(--border-main)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          {theme === 'dark' ? (
            <Moon className="w-5 h-5 text-indigo-400" />
          ) : (
            <Sun className="w-5 h-5 text-amber-400" />
          )}
          <div>
            <h4 className="font-semibold text-sm">Theme & Appearance</h4>
            <span className="text-xs text-[var(--text-muted)]">
              {theme === 'dark' ? 'Dark monochrome surface active' : 'Light inverted surface active'}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className="px-4 py-2 rounded-full text-xs font-bold border border-[var(--border-main)] hover:bg-[var(--raised-main)] transition-colors"
        >
          {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
        </button>
      </div>

      {/* Modal: Add New Admin */}
      {isAddAdminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl p-6 border shadow-2xl bg-[var(--card-main)] border-[var(--border-main)] text-[var(--text-main)] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
              <h3 className="font-bold text-sm">Add New Administrator</h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddAdminOpen(false);
                  onCloseAddAdminImmediately?.();
                }}
                className="p-1 rounded-full text-[var(--text-muted)] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {adminError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs">
                {adminError}
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Full Name (e.g. Priya Sharma)"
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs border bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-main)] outline-hidden"
              />
              <input
                type="text"
                required
                placeholder="Username (e.g. priya)"
                value={newAdminUsername}
                onChange={(e) => setNewAdminUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs border bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-main)] outline-hidden"
              />
              <input
                type="text"
                required
                placeholder="Unique Password"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs border bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-main)] font-mono outline-hidden"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddAdminOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold border border-[var(--border-main)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full text-xs font-bold bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)]"
                >
                  Create Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Admin Password */}
      {resetAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl p-6 border shadow-2xl bg-[var(--card-main)] border-[var(--border-main)] text-[var(--text-main)] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
              <h3 className="font-bold text-sm">Reset Password</h3>
              <button
                type="button"
                onClick={() => setResetAdmin(null)}
                className="p-1 rounded-full text-[var(--text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              Reset password for admin <strong>{resetAdmin.name}</strong> (@{resetAdmin.username}).
            </p>

            {resetError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs">
                {resetError}
              </div>
            )}

            <form onSubmit={handleResetAdminPassword} className="space-y-3">
              <input
                type="text"
                required
                placeholder="New unique password..."
                value={resetPasswordVal}
                onChange={(e) => setResetPasswordVal(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs border bg-[var(--raised-main)] border-[var(--border-main)] font-mono outline-hidden"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetAdmin(null)}
                  className="px-4 py-2 rounded-full text-xs font-semibold border border-[var(--border-main)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full text-xs font-bold bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)]"
                >
                  Save & View (10s)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View as Student Class Picker */}
      {isViewAsStudentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl p-6 border shadow-2xl bg-[var(--card-main)] border-[var(--border-main)] text-[var(--text-main)] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
              <h3 className="font-bold text-sm">Choose Class to Preview</h3>
              <button
                type="button"
                onClick={() => setIsViewAsStudentOpen(false)}
                className="p-1 rounded-full text-[var(--text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              Select which class group view you would like to inspect as a student.
            </p>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {classes.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    onViewAsStudent(c);
                    setIsViewAsStudentOpen(false);
                  }}
                  className="p-3 rounded-2xl border border-[var(--border-main)] hover:bg-[var(--raised-main)] cursor-pointer text-xs flex items-center justify-between transition-colors"
                >
                  <span className="font-bold">{c.groupName || `${c.className} ${c.section}`}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    Class {c.className} {c.section}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
