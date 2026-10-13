import React, { useState, useRef } from 'react';
import {
  Lock,
  User,
  Sun,
  Moon,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const UnifiedLoginPage: React.FC = () => {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [selectedRole, setSelectedRole] = useState<'student' | 'admin'>('student');

  // Credentials fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Standard login submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMessage('Please enter your username.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Please enter your password.');
      passwordInputRef.current?.focus();
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await login(username.trim(), password.trim(), selectedRole);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Wrong password or account not found. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between p-4 sm:p-6 transition-colors duration-300 relative overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)]">
      {/* Decorative ambient background glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none bg-indigo-600" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-15 pointer-events-none bg-purple-600" />

      {/* Top Bar with School Branding & Theme Toggle */}
      <div className="w-full flex items-center justify-between z-10 max-w-5xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-base shadow-sm bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)]">
            A
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight block leading-tight">
              Abhyaas Connect
            </span>
            <span className="text-[10px] text-[var(--text-muted)] tracking-wider uppercase font-semibold">
              International School Portal
            </span>
          </div>
        </div>

        {/* Theme Toggle Button */}
        <button
          type="button"
          aria-label="Toggle Theme"
          onClick={toggleTheme}
          className="w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-200 border-[var(--border-main)] bg-[var(--card-main)] hover:bg-[var(--raised-main)] active:scale-95 cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-300" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>
      </div>

      {/* Center Auth Card */}
      <div className="w-full max-w-md mx-auto my-auto py-4 z-10">
        <div className="rounded-[28px] p-6 sm:p-8 border shadow-2xl transition-all duration-300 bg-[var(--card-main)] border-[var(--border-main)]">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-md border border-[var(--border-main)] bg-[var(--raised-main)]">
              {selectedRole === 'admin' ? (
                <Shield className="w-6 h-6 text-purple-400" />
              ) : (
                <GraduationCap className="w-6 h-6 text-indigo-400" />
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Abhyaas Connect
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Sign in with your authorized school credentials
            </p>
          </div>

          {/* Role Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl border mb-5 bg-[var(--raised-main)] border-[var(--border-main)]">
            <button
              type="button"
              onClick={() => {
                setSelectedRole('student');
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                selectedRole === 'student'
                  ? 'bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
            >
              <span>🎓 Student Portal</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRole('admin');
                setErrorMessage(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                selectedRole === 'admin'
                  ? 'bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
            >
              <span>🛡️ Admin Portal</span>
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-medium bg-red-500/15 border border-red-500/30 text-red-300 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-[11px] leading-relaxed font-semibold">{errorMessage}</p>
            </div>
          )}

          {/* Standard Sign In Form (Completely Blind: Zero leaked hints or pre-fills) */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold mb-1.5 text-[var(--text-muted)]"
              >
                {selectedRole === 'student' ? 'Student Username or Name' : 'Administrator Username'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="username"
                  type="text"
                  autoCapitalize="none"
                  autoComplete="username"
                  required
                  placeholder={
                    selectedRole === 'student'
                      ? 'Enter your username or name'
                      : 'Enter your administrator username'
                  }
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm border transition-colors outline-hidden bg-[var(--raised-main)] border-[var(--border-main)] focus:border-white/50 text-[var(--text-main)] placeholder:text-[var(--text-muted)]/50"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold mb-1.5 text-[var(--text-muted)]"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  ref={passwordInputRef}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full pl-10 pr-10 py-2.5 rounded-2xl text-sm border transition-colors outline-hidden bg-[var(--raised-main)] border-[var(--border-main)] focus:border-white/50 text-[var(--text-main)] placeholder:text-[var(--text-muted)]/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-6 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-md bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] hover:opacity-90 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    Sign In as {selectedRole === 'student' ? 'Student' : 'Administrator'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Secure Access & School Controlled Note */}
          <div className="mt-5 pt-3.5 border-t border-[var(--border-main)] text-center space-y-1">
            <p className="text-[11px] text-[var(--text-muted)]">
              {selectedRole === 'student'
                ? 'Official Student Accounts are strictly issued by the school administrator.'
                : 'Secure Administrative Access Portal • Authorized Staff Only'}
            </p>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="text-center py-2 text-xs text-[var(--text-muted)] z-10">
        <p>© 2026 Abhyaas International School. All rights reserved.</p>
      </div>
    </div>
  );
};
