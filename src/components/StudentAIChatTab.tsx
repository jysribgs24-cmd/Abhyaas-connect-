import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Camera,
  RotateCcw,
  Sparkles,
  AlertCircle,
  X,
  Upload,
  BookOpen,
  CheckCircle2,
  Calendar,
  Clock,
  HelpCircle,
  Lock,
} from 'lucide-react';
import { AIChatMessage, UserProfile, BroadcastMessage } from '../types';
import { saveAIChatMessage, clearAIChatHistory } from '../lib/dataService';

interface StudentAIChatTabProps {
  user: UserProfile;
  messages: AIChatMessage[];
  classAnnouncements?: BroadcastMessage[];
  isOpenScanDirectly?: boolean;
  onClearScanDirectly?: () => void;
}

function getEffectiveStudentId(uid: string): string {
  try {
    let sid = sessionStorage.getItem('abhyaas_device_session_id');
    if (!sid) {
      sid = Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('abhyaas_device_session_id', sid);
    }
    return `${uid}_${sid}`;
  } catch {
    return uid;
  }
}

export const StudentAIChatTab: React.FC<StudentAIChatTabProps> = ({
  user,
  messages,
  classAnnouncements = [],
  isOpenScanDirectly = false,
  onClearScanDirectly,
}) => {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Question Scanning Modal & State
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanImageBase64, setScanImageBase64] = useState<string | null>(null);
  const [focusNote, setFocusNote] = useState('');
  const [isProcessingScan, setIsProcessingScan] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpenScanDirectly) {
      fileInputRef.current?.click();
      onClearScanDirectly?.();
    }
  }, [isOpenScanDirectly, onClearScanDirectly]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, loading]);

  // Auto-dismiss temporary error after 5s
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const handleSendText = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || loading) return;

    setErrorMessage(null);
    setInputText('');
    setLoading(true);

    try {
      // Parallelize student message save with AI request for minimum latency
      const saveUserPromise = saveAIChatMessage(user.uid, {
        role: 'user',
        text: textToSend.trim(),
        timestamp: new Date().toISOString(),
      });

      const fetchAIPromise = fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: getEffectiveStudentId(user.uid),
          message: textToSend.trim(),
          history: messages.slice(-4).map((m) => ({ role: m.role, text: m.text })),
          classAnnouncements: classAnnouncements.slice(-6).map((a) => ({
            text: a.text,
            senderName: a.senderName,
            timestamp: a.timestamp,
          })),
        }),
      });

      const [_, response] = await Promise.all([saveUserPromise, fetchAIPromise]);

      const rawText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error('AI server is warming up. Please tap retry.');
      }

      if (!response.ok) {
        let errText = data.message || 'The AI tutor is currently busy. Please try asking again.';
        if (typeof errText === 'string' && (errText.includes('503') || errText.includes('demand'))) {
          errText = 'Gemini 3.8 Flash is experiencing a brief high demand spike. Please tap retry.';
        }
        throw new Error(errText);
      }

      // Save AI model response
      await saveAIChatMessage(user.uid, {
        role: 'model',
        text: data.answer || 'I am ready to help you! Please ask your study doubt.',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      let msg = err.message || 'AI tutor temporarily unavailable. Please try again.';
      try {
        if (typeof msg === 'string' && msg.startsWith('{') && msg.includes('"message"')) {
          const parsed = JSON.parse(msg);
          msg = parsed.error?.message || parsed.message || msg;
        }
      } catch {}

      if (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
        msg = 'Gemini 3.8 Flash is momentarily busy. Please tap Retry.';
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // Image Selection Handler (Camera or file)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setScanImageBase64(reader.result as string);
      setIsScanModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // reset input
  };

  // Submit Photo for AI scanning
  const handleSubmitScan = async () => {
    if (!scanImageBase64 || isProcessingScan) return;
    setIsProcessingScan(true);
    setErrorMessage(null);

    try {
      // 1. Post to AI Scan endpoint
      const response = await fetch('/api/ai/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: getEffectiveStudentId(user.uid),
          imageBase64: scanImageBase64,
          mimeType: 'image/jpeg',
          focusNote: focusNote.trim(),
        }),
      });

      const rawText = await response.text();
      let result: any = {};
      try {
        result = JSON.parse(rawText);
      } catch {
        throw new Error('Could not parse image scan response. Please try again.');
      }

      if (!response.ok) {
        throw new Error(result.message || 'Failed to scan question photo.');
      }

      // 2. Add question & solution to chat
      await saveAIChatMessage(user.uid, {
        role: 'user',
        text: `📸 [Scanned Textbook Question]: ${result.extractedQuestion}`,
        timestamp: new Date().toISOString(),
      });

      await saveAIChatMessage(user.uid, {
        role: 'model',
        text: `**Step-by-Step Solution:**\n\n${result.solution}`,
        timestamp: new Date().toISOString(),
      });

      setIsScanModalOpen(false);
      setScanImageBase64(null);
      setFocusNote('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process photo doubt. Please try again.');
    } finally {
      setIsProcessingScan(false);
    }
  };

  const handleClearChat = async () => {
    try {
      await clearAIChatHistory(user.uid);
    } catch (err: any) {
      console.warn('Clear chat error:', err);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full w-full overflow-hidden bg-[var(--card-main)] sm:rounded-2xl sm:border sm:border-[var(--border-main)] sm:shadow-xl">
      {/* Hidden file input for camera / gallery */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Top Header */}
      <div className="p-2.5 sm:p-3.5 border-b flex items-center justify-between bg-[var(--raised-main)] border-[var(--border-main)] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-violet-500/20 to-indigo-500/20 text-violet-400 border border-violet-500/30 shrink-0">
            <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-xs sm:text-sm leading-tight truncate">
                Abhyaas AI Tutor
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                <Lock className="w-2.5 h-2.5 text-emerald-400" />
                Private to @{user.username}
              </span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="truncate">Your personal doubt solver • Separate & private to your account</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Scan Photo Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs font-bold border border-[var(--border-main)] hover:bg-[var(--card-main)] flex items-center gap-1.5 transition-colors text-[var(--text-main)] cursor-pointer"
            title="Scan question photo"
          >
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Scan Photo</span>
          </button>

          {/* Clear Chat Button */}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearChat}
              className="px-2.5 py-1 rounded-full border border-[var(--border-main)] hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 flex items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer"
              title="Clear your private chat history"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Dismissible Error / Notice Banner */}
      {errorMessage && (
        <div className="p-2.5 px-3 bg-amber-500/15 border-b border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2 shrink-0 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span className="font-medium text-[11px] truncate">{errorMessage}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                if (inputText.trim()) handleSendText();
              }}
              className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-200 font-bold hover:bg-amber-500/30 text-[10px] cursor-pointer"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="p-0.5 rounded-full text-amber-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4 sm:p-6 text-[var(--text-muted)]">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 bg-gradient-to-br from-violet-500/20 to-indigo-500/20 text-violet-400 border border-violet-500/30">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-[var(--text-main)]">
              Welcome, {user.name.split(' ')[0]}! 👋
            </h3>
            <p className="text-xs max-w-sm mt-1 leading-relaxed">
              This is your <strong>private AI study tutor</strong>. Your questions, solutions, and chats are strictly personal to your account (<span className="text-indigo-400 font-mono">@{user.username}</span>) and never visible to other students.
            </p>

            {/* Quick Suggestion Pills */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4 max-w-md">
              <button
                type="button"
                onClick={() => handleSendText('Are there any new notices or homework for my class?')}
                className="px-3 py-1.5 rounded-full text-xs font-medium border bg-[var(--raised-main)] border-[var(--border-main)] hover:border-violet-400 text-[var(--text-main)] transition-colors cursor-pointer"
              >
                📢 Any new notices?
              </button>
              <button
                type="button"
                onClick={() => handleSendText('Explain Photosynthesis with a simple diagram description')}
                className="px-3 py-1.5 rounded-full text-xs font-medium border bg-[var(--raised-main)] border-[var(--border-main)] hover:border-violet-400 text-[var(--text-main)] transition-colors cursor-pointer"
              >
                🔬 Photosynthesis
              </button>
              <button
                type="button"
                onClick={() => handleSendText('Explain Pythagorean theorem with an example problem')}
                className="px-3 py-1.5 rounded-full text-xs font-medium border bg-[var(--raised-main)] border-[var(--border-main)] hover:border-violet-400 text-[var(--text-main)] transition-colors cursor-pointer"
              >
                📐 Pythagoras theorem
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Camera className="w-3 h-3" />
                <span>📸 Scan textbook problem</span>
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === 'user';

            return (
              <div
                key={idx}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-violet-500/20 text-violet-400 shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                    isUser
                      ? 'bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] rounded-tr-xs font-medium'
                      : 'bg-[var(--raised-main)] border border-[var(--border-main)] text-[var(--text-main)] rounded-tl-xs whitespace-pre-wrap'
                  }`}
                >
                  {msg.text}

                  <span
                    className={`block text-[9px] mt-1.5 ${
                      isUser ? 'text-current/70 text-right' : 'text-[var(--text-muted)] text-right'
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-[var(--raised-main)] border border-[var(--border-main)] text-[var(--text-muted)] shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] p-2 animate-pulse">
            <Bot className="w-4 h-4 text-violet-400 animate-spin" />
            <span>Abhyaas AI (Gemini 3.8 Flash) is preparing your answer...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Docked Input Composer (Flush above bottom tabs) */}
      <div className="p-2 sm:p-2.5 border-t bg-[var(--raised-main)] border-[var(--border-main)] shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendText();
          }}
          className="flex items-center gap-2 max-w-4xl mx-auto"
        >
          {/* Camera Button */}
          <button
            type="button"
            title="Scan Question with Camera"
            onClick={() => fileInputRef.current?.click()}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-[var(--border-main)] bg-[var(--card-main)] hover:bg-[var(--raised-main)] flex items-center justify-center text-[var(--text-muted)] hover:text-emerald-400 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Text Input */}
          <input
            type="text"
            placeholder="Ask your doubt or school notice question..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading}
            className="flex-1 px-3.5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm border transition-colors outline-hidden bg-[var(--card-main)] border-[var(--border-main)] focus:border-violet-400 text-[var(--text-main)] placeholder:text-[var(--text-muted)]/60"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] hover:opacity-90 active:scale-95 disabled:opacity-40 shrink-0 cursor-pointer shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Question Scan Modal */}
      {isScanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-lg rounded-2xl border shadow-2xl bg-[var(--card-main)] border-[var(--border-main)] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b flex items-center justify-between bg-[var(--raised-main)] border-[var(--border-main)] shrink-0">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm">Scan Textbook Question</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsScanModalOpen(false)}
                className="p-1 rounded-full text-[var(--text-muted)] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {scanImageBase64 && (
                <div className="relative rounded-xl overflow-hidden border border-[var(--border-main)] max-h-64 bg-black flex items-center justify-center">
                  <img
                    src={scanImageBase64}
                    alt="Question scan"
                    className="max-h-64 object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full text-xs font-bold bg-black/80 text-white hover:bg-black flex items-center gap-1 border border-white/20 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Retake</span>
                  </button>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">
                  Optional: Focus note (e.g. &quot;Solve question 3b only&quot;)
                </label>
                <input
                  type="text"
                  value={focusNote}
                  onChange={(e) => setFocusNote(e.target.value)}
                  placeholder="Which part or question should AI focus on?"
                  className="w-full px-3 py-2 rounded-xl text-xs border bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-main)] outline-hidden focus:border-violet-400"
                />
              </div>

              <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-[11px] text-violet-300 space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  <span>Gemini 3.8 Flash Vision Features:</span>
                </p>
                <p>• Transcribes the question text automatically.</p>
                <p>• Generates step-by-step verified academic solutions.</p>
                <p>• Creates 5 similar practice questions to test your understanding.</p>
              </div>
            </div>

            <div className="p-4 border-t bg-[var(--raised-main)] border-[var(--border-main)] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsScanModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border-main)] hover:bg-[var(--card-main)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitScan}
                disabled={isProcessingScan}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                {isProcessingScan ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Photo with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Solve &amp; Explain Doubt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
