import React, { useState, useEffect } from 'react';
import { Copy, Check, ShieldAlert, Timer } from 'lucide-react';

interface CountdownPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Array<{
    name: string;
    username: string;
    password: string;
    className?: string;
    section?: string;
    rollNo?: string;
  }>;
  title?: string;
}

export const CountdownPasswordModal: React.FC<CountdownPasswordModalProps> = ({
  isOpen,
  onClose,
  accounts,
  title = 'Student Account Created',
}) => {
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSecondsLeft(10);
      setCopiedIndex(null);
      return;
    }

    setSecondsLeft(10);
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, onClose]);

  if (!isOpen || accounts.length === 0) return null;

  const copyToClipboard = (acc: any, index: number) => {
    const text = `Abhyaas Connect Login:\nUsername: ${acc.username}\nPassword: ${acc.password}`;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyAll = () => {
    const text = accounts
      .map(
        (a) =>
          `Student: ${a.name} (${a.className || ''} ${a.section || ''} Roll #${a.rollNo || ''})\nUsername: ${a.username}\nPassword: ${a.password}`
      )
      .join('\n---\n');
    navigator.clipboard.writeText(text);
    setCopiedIndex(9999);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-3xl p-6 border shadow-2xl transition-all bg-[var(--card-main)] border-[var(--border-main)] text-[var(--text-main)]">
        {/* Header with 10s Timer */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-main)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-amber-500/20 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{title}</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Note this down immediately. Passwords can never be viewed again.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 font-mono font-bold text-sm animate-pulse">
            <Timer className="w-4 h-4" />
            <span>{secondsLeft}s</span>
          </div>
        </div>

        {/* Account Details Box */}
        <div className="mt-4 max-h-72 overflow-y-auto space-y-3">
          {accounts.map((acc, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl border bg-[var(--raised-main)] border-[var(--border-main)] flex items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="font-semibold text-sm">
                  {acc.name}{' '}
                  {acc.rollNo && (
                    <span className="text-xs font-normal text-[var(--text-muted)]">
                      (Roll #{acc.rollNo})
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-mono">
                  <span className="px-2 py-0.5 rounded-md bg-black/20 text-[var(--text-muted)]">
                    User: <strong className="text-[var(--text-main)]">{acc.username}</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 font-bold border border-amber-500/20">
                    Pass: {acc.password}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(acc, idx)}
                className="px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] hover:opacity-90 active:scale-95 shrink-0"
              >
                {copiedIndex === idx ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between pt-4 border-t border-[var(--border-main)]">
          {accounts.length > 1 ? (
            <button
              type="button"
              onClick={copyAll}
              className="px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-[var(--border-main)] hover:bg-[var(--raised-main)]"
            >
              {copiedIndex === 9999 ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>Copy All ({accounts.length})</span>
            </button>
          ) : (
            <span className="text-xs text-[var(--text-muted)]">
              Closing in {secondsLeft} seconds...
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-xs font-bold transition-all bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] hover:opacity-90 active:scale-95"
          >
            I Have Noted It ({secondsLeft}s)
          </button>
        </div>
      </div>
    </div>
  );
};
