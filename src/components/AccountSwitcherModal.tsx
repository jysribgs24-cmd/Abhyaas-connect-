import React, { useState } from 'react';
import {
  Trash2,
  UserPlus,
  X,
  Shield,
  ArrowLeft,
  ArrowRight,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SavedDeviceSession } from '../types';

interface AccountSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAnother?: () => void;
}

export const AccountSwitcherModal: React.FC<AccountSwitcherModalProps> = ({
  isOpen,
  onClose,
  onAddAnother,
}) => {
  const { currentUser, savedSessions, switchAccount, deleteSavedSession, login } = useAuth();

  const [mode, setMode] = useState<'list' | 'add'>('list');
  const [addRole, setAddRole] = useState<'student' | 'admin'>('student');
  const [addUsername, setAddUsername] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Switching indicator for selected session
  const [switchingUid, setSwitchingUid] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setAddError(null);
    setAddUsername('');
    setAddPassword('');
    setShowAddPassword(false);
    setMode('add');
    if (onAddAnother) {
      onAddAnother();
    }
  };

  const handleSelectSession = async (session: SavedDeviceSession) => {
    if (currentUser?.uid === session.uid) return;
    setMode('add');
    setAddUsername(session.username);
    setAddRole(session.role as 'student' | 'admin');
    setAddPassword('');
    setAddError(`Enter password for @${session.username} to switch account.`);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUsername.trim() || !addPassword.trim()) {
      setAddError('Please enter both username and password.');
      return;
    }

    setAddLoading(true);
    setAddError(null);

    try {
      await login(addUsername.trim(), addPassword.trim(), addRole);
      setMode('list');
      setAddUsername('');
      setAddPassword('');
      onClose();
    } catch (err: any) {
      setAddError(
        err.message || 'Invalid username or password. Please verify credentials created by the admin.'
      );
    } finally {
      setAddLoading(false);
    }
  };

  const handleModalClose = () => {
    if (switchingUid) return;
    setMode('list');
    setAddError(null);
    onClose();
  };

  const validSessions = savedSessions.filter(
    (s) => s.username !== 'student' && s.uid !== 'student_demo_1'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 border shadow-2xl bg-[var(--card-main)] border-[var(--border-main)] text-[var(--text-main)] max-h-[90vh] flex flex-col">
        {/* Handle bar on mobile */}
        <div className="w-12 h-1.5 rounded-full bg-[var(--border-main)] mx-auto mb-4 sm:hidden" />

        {mode === 'list' ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-main)]">
              <div>
                <h3 className="font-bold text-lg">Switch Account</h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Instant account switching on this device
                </p>
              </div>
              <button
                type="button"
                onClick={handleModalClose}
                className="p-2 rounded-full hover:bg-[var(--raised-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Account list */}
            <div className="mt-4 overflow-y-auto space-y-2.5 flex-1 pr-1 max-h-[50vh]">
              {validSessions.length === 0 ? (
                <div className="p-6 text-center text-sm text-[var(--text-muted)]">
                  No other saved accounts on this device yet.
                </div>
              ) : (
                validSessions.map((session) => {
                  const isActive = currentUser?.uid === session.uid;
                  const isSwitchingThis = switchingUid === session.uid;

                  return (
                    <div
                      key={session.uid}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isActive
                          ? 'bg-[var(--raised-main)] border-white/40 ring-1 ring-white/20'
                          : 'bg-[var(--card-main)] border-[var(--border-main)] hover:bg-[var(--raised-main)]'
                      }`}
                    >
                      <div
                        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleSelectSession(session)}
                      >
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)]">
                          {session.role === 'admin' ? (
                            <Shield className="w-5 h-5" />
                          ) : (
                            session.name.slice(0, 1).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm truncate">{session.name}</span>
                            {isActive && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[var(--text-muted)] truncate flex items-center gap-1.5">
                            <span>@{session.username}</span>
                            {session.role === 'student' && session.className && (
                              <span>• Class {session.className} {session.section}</span>
                            )}
                            {session.role === 'admin' && (
                              <span className="text-purple-400 font-semibold">• Administrator</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isSwitchingThis ? (
                          <div className="w-7 h-7 flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin text-indigo-400" />
                          </div>
                        ) : !isActive ? (
                          <button
                            type="button"
                            onClick={() => handleSelectSession(session)}
                            className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                          >
                            Switch
                          </button>
                        ) : (
                          <div className="w-7 h-7 flex items-center justify-center text-emerald-400">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                        <button
                          type="button"
                          title="Remove from this device"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSavedSession(session.uid);
                          }}
                          className="p-2 rounded-xl text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add Another Account Button */}
            <div className="mt-4 pt-3 border-t border-[var(--border-main)]">
              <button
                type="button"
                onClick={handleStartAdd}
                className="w-full py-3 rounded-2xl border border-dashed border-[var(--border-main)] flex items-center justify-center gap-2 text-sm font-semibold hover:bg-[var(--raised-main)] active:scale-[0.99] transition-all text-[var(--text-main)] cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Log In with Another Account</span>
              </button>
            </div>
          </>
        ) : (
          /* ADD ACCOUNT FORM */
          <>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-main)]">
              <button
                type="button"
                onClick={() => setMode('list')}
                className="p-1.5 -ml-1.5 rounded-full hover:bg-[var(--raised-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-base">Add Account</h3>
              <button
                type="button"
                onClick={handleModalClose}
                className="p-1.5 -mr-1.5 rounded-full hover:bg-[var(--raised-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Role Switcher */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl border my-4 bg-[var(--raised-main)] border-[var(--border-main)]">
              <button
                type="button"
                onClick={() => {
                  setAddRole('student');
                  setAddError(null);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  addRole === 'student'
                    ? 'bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                <span>🎓 Student</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddRole('admin');
                  setAddError(null);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  addRole === 'admin'
                    ? 'bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
              >
                <span>🛡️ Admin</span>
              </button>
            </div>

            {addError && (
              <div className="mb-4 p-3 rounded-2xl flex items-center gap-2 text-xs bg-red-500/15 border border-red-500/30 text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-[11px]">{addError}</p>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-[var(--text-muted)]">
                  {addRole === 'student' ? 'Student Username' : 'Administrator Username'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoCapitalize="none"
                    placeholder={addRole === 'student' ? 'e.g. rahul' : 'e.g. alok'}
                    value={addUsername}
                    onChange={(e) => setAddUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm border transition-colors outline-hidden bg-[var(--raised-main)] border-[var(--border-main)] focus:border-white/50 text-[var(--text-main)] placeholder:text-[var(--text-muted)]/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-[var(--text-muted)]">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showAddPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter account password"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl text-sm border transition-colors outline-hidden bg-[var(--raised-main)] border-[var(--border-main)] focus:border-white/50 text-[var(--text-main)] placeholder:text-[var(--text-muted)]/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                  >
                    {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={addLoading}
                  className="w-full py-3 px-6 rounded-full font-bold text-sm flex items-center justify-center gap-2 shadow-md bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] hover:opacity-90 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                >
                  {addLoading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In & Save to Device</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
