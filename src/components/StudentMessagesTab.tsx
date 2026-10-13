import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Users,
  Shield,
  Clock,
  ExternalLink,
  ChevronDown,
  Lock,
  Search,
  CheckCheck,
  ThumbsUp,
  Heart,
  Volume2,
  Copy,
  Check,
  Sparkles,
  Radio,
  Filter,
} from 'lucide-react';
import { BroadcastMessage, UserProfile } from '../types';

interface StudentMessagesTabProps {
  user: UserProfile;
  messages: BroadcastMessage[];
  groupName: string;
  limitCount: number;
  onLoadOlder: () => void;
}

export const StudentMessagesTab: React.FC<StudentMessagesTabProps> = ({
  user,
  messages,
  groupName,
  limitCount,
  onLoadOlder,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'school' | 'class'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Local storage backed reactions / acknowledgements
  const [acknowledgedIds, setAcknowledgedIds] = useState<Record<string, 'thumb' | 'heart'>>(() => {
    try {
      const saved = localStorage.getItem(`abhyaas_acks_${user.uid}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleToggleReaction = (msgId: string, reaction: 'thumb' | 'heart') => {
    setAcknowledgedIds((prev) => {
      const updated = { ...prev };
      if (updated[msgId] === reaction) {
        delete updated[msgId];
      } else {
        updated[msgId] = reaction;
      }
      try {
        localStorage.setItem(`abhyaas_acks_${user.uid}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  useEffect(() => {
    // Auto scroll to bottom when new messages arrive
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Format date separators
  const getDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Convert plain text URLs and *bold* to rich JSX
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');

    return lines.map((line, lineIdx) => {
      // Bold syntax *text*
      const boldParts = line.split(/(\*[^*]+\*)/g);
      const urlRegex = /(https?:\/\/[^\s]+)/g;

      return (
        <React.Fragment key={lineIdx}>
          {lineIdx > 0 && <br />}
          {boldParts.map((bPart, bIdx) => {
            if (bPart.startsWith('*') && bPart.endsWith('*') && bPart.length > 2) {
              const innerText = bPart.slice(1, -1);
              return <strong key={bIdx} className="font-bold text-[var(--text-main)]">{innerText}</strong>;
            }

            // URL Detection
            const urlParts = bPart.split(urlRegex);
            return urlParts.map((uPart, uIdx) => {
              if (uPart.match(urlRegex)) {
                return (
                  <a
                    key={`${bIdx}-${uIdx}`}
                    href={uPart}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline inline-flex items-center gap-0.5 hover:text-blue-300 break-all"
                  >
                    <span>{uPart}</span>
                    <ExternalLink className="w-3 h-3 inline shrink-0" />
                  </a>
                );
              }
              return <span key={`${bIdx}-${uIdx}`}>{uPart}</span>;
            });
          })}
        </React.Fragment>
      );
    });
  };

  // Copy notice text to clipboard
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Text-To-Speech for audio notice read
  const handleSpeak = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  // Filter messages by search query and type
  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      // Type filter
      if (filterType === 'school' && msg.classId !== 'all') return false;
      if (filterType === 'class' && msg.classId === 'all') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesText = msg.text.toLowerCase().includes(q);
        const matchesSender = (msg.senderName || '').toLowerCase().includes(q);
        return matchesText || matchesSender;
      }
      return true;
    });
  }, [messages, filterType, searchQuery]);

  return (
    <div className="flex flex-col flex-1 h-full w-full overflow-hidden bg-[var(--card-main)] sm:rounded-2xl sm:border sm:border-[var(--border-main)] sm:shadow-xl">
      {/* Top Header matching Admin Broadcast Style */}
      <div className="p-3 sm:p-4 border-b bg-[var(--raised-main)] border-[var(--border-main)] shrink-0 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base leading-tight truncate">
                  {groupName || `Class ${user.className} ${user.section} Noticeboard`}
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                  <Shield className="w-3 h-3" />
                  Official
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="truncate">Live Admin Broadcasts • {messages.length} Notices</span>
                <span className="text-[10px] text-indigo-400 font-medium hidden sm:inline">• ⏱️ Auto-purges after 7 days</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Search Toggle */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notices..."
                className="w-32 sm:w-44 px-3 py-1.5 pl-8 rounded-full text-xs border bg-[var(--card-main)] border-[var(--border-main)] text-[var(--text-main)] placeholder:text-[var(--text-muted)] outline-hidden focus:border-indigo-400 transition-all"
              />
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--text-muted)] pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Category Filter Chips matching Admin Broadcast */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] font-bold shadow-xs'
                : 'bg-[var(--card-main)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            📢 All Notices ({messages.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterType('school')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filterType === 'school'
                ? 'bg-purple-600 text-white font-bold shadow-xs'
                : 'bg-[var(--card-main)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            🏫 School-Wide Only
          </button>

          <button
            type="button"
            onClick={() => setFilterType('class')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filterType === 'class'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'bg-[var(--card-main)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            👥 Class {user.className || '10th'} {user.section || 'A'}
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
        {/* Load older messages button if history is large */}
        {messages.length >= limitCount && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onLoadOlder}
              className="px-4 py-1.5 rounded-full text-xs font-semibold border border-[var(--border-main)] hover:bg-[var(--raised-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Load older messages</span>
            </button>
          </div>
        )}

        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-[var(--text-muted)]">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 bg-[var(--raised-main)] text-indigo-400">
              <Radio className="w-7 h-7" />
            </div>
            <p className="font-bold text-sm text-[var(--text-main)]">
              {searchQuery ? 'No matching announcements' : 'No announcements right now'}
            </p>
            <p className="text-xs max-w-xs mt-1">
              {searchQuery
                ? 'Try a different search word or switch filter tabs above.'
                : 'New announcements and circulars from your school administration will appear here immediately.'}
            </p>
          </div>
        ) : (
          filteredMessages.map((msg, index) => {
            const showDate =
              index === 0 ||
              getDateLabel(msg.timestamp) !== getDateLabel(filteredMessages[index - 1].timestamp);

            const isSchoolWide = msg.classId === 'all';
            const isAcknowledged = acknowledgedIds[msg.id];
            const isSpeaking = speakingId === msg.id;
            const isCopied = copiedId === msg.id;

            return (
              <React.Fragment key={msg.id}>
                {/* Date Separator Pill */}
                {showDate && (
                  <div className="flex justify-center my-3">
                    <span className="px-3.5 py-1 rounded-full text-[10px] font-semibold border shadow-xs bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-muted)] uppercase tracking-wider">
                      {getDateLabel(msg.timestamp)}
                    </span>
                  </div>
                )}

                {/* Message Bubble (Admin Broadcast Layout) */}
                <div className="flex flex-col items-start w-full max-w-2xl mx-auto">
                  <div className="w-full p-4 rounded-2xl rounded-tl-xs shadow-md border space-y-2.5 bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-main)] transition-all hover:border-indigo-500/30">
                    {/* Header info inside bubble: Sender & Recipient badge */}
                    <div className="flex items-center justify-between gap-3 text-[11px] pb-1.5 border-b border-[var(--border-main)]/60">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                          <Shield className="w-3 h-3" />
                        </div>
                        <span className="font-bold text-indigo-400">
                          {msg.senderName || 'School Administration'}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] font-medium">
                          • Admin
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isSchoolWide ? (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold text-[9px]">
                            📢 School-Wide
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-[9px]">
                            Class {msg.classId}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Forwarded indicator */}
                    {msg.forwarded && (
                      <p className="text-[10px] italic text-[var(--text-muted)] flex items-center gap-1">
                        <span>↳ Forwarded Announcement</span>
                      </p>
                    )}

                    {/* Rich Formatted Text Body */}
                    <div className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                      {renderFormattedText(msg.text)}
                    </div>

                    {/* Bubble Footer: Action Bar (Acknowledge, Listen, Copy) + Timestamp & Double Checks */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-main)]/40 text-[10px] text-[var(--text-muted)]">
                      {/* Left: Interactive Student Actions */}
                      <div className="flex items-center gap-1.5">
                        {/* Acknowledge Thumb */}
                        <button
                          type="button"
                          onClick={() => handleToggleReaction(msg.id, 'thumb')}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                            isAcknowledged === 'thumb'
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'border border-[var(--border-main)] hover:bg-[var(--card-main)] text-[var(--text-muted)] hover:text-emerald-400'
                          }`}
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>{isAcknowledged === 'thumb' ? 'Understood' : 'Got it'}</span>
                        </button>

                        {/* Heart reaction */}
                        <button
                          type="button"
                          onClick={() => handleToggleReaction(msg.id, 'heart')}
                          className={`p-1 rounded-full transition-all cursor-pointer ${
                            isAcknowledged === 'heart'
                              ? 'text-rose-500 bg-rose-500/10'
                              : 'text-[var(--text-muted)] hover:text-rose-400 hover:bg-[var(--card-main)]'
                          }`}
                          title="Heart notice"
                        >
                          <Heart className={`w-3.5 h-3.5 ${isAcknowledged === 'heart' ? 'fill-rose-500' : ''}`} />
                        </button>

                        {/* Listen (TTS) */}
                        <button
                          type="button"
                          onClick={() => handleSpeak(msg.id, msg.text)}
                          className={`px-2 py-1 rounded-full text-[10px] font-semibold border flex items-center gap-1 transition-all cursor-pointer ${
                            isSpeaking
                              ? 'bg-amber-500 text-black font-bold animate-pulse'
                              : 'border-[var(--border-main)] hover:bg-[var(--card-main)] text-[var(--text-muted)] hover:text-amber-400'
                          }`}
                          title="Listen to announcement"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>{isSpeaking ? 'Listening...' : 'Listen'}</span>
                        </button>

                        {/* Copy notice */}
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className="p-1 rounded-full border border-[var(--border-main)] hover:bg-[var(--card-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all cursor-pointer"
                          title="Copy notice text"
                        >
                          {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>

                      {/* Right: Timestamp & Double Blue Ticks */}
                      <div className="flex items-center gap-1.5">
                        {msg.edited && <span className="italic">(edited)</span>}
                        <span>
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span title="Delivered and verified">
                          <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Docked Official Channel Footer */}
      <div className="p-2 sm:p-2.5 border-t bg-[var(--raised-main)] border-[var(--border-main)] shrink-0">
        <div className="w-full py-1.5 px-3 rounded-full border border-dashed border-[var(--border-main)] flex items-center justify-center gap-2 text-[11px] text-[var(--text-muted)] bg-[var(--card-main)]/60 select-none">
          <Lock className="w-3 h-3 text-indigo-400" />
          <span>Official Broadcast Group • Only school administrators can broadcast announcements</span>
        </div>
      </div>
    </div>
  );
};
