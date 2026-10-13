import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Edit2,
  Trash2,
  Share2,
  Smile,
  ExternalLink,
  ChevronDown,
  Check,
  X,
  Radio,
  Clock,
  Trash,
} from 'lucide-react';
import { BroadcastMessage, ClassGroup, UserProfile } from '../../types';
import {
  sendBroadcastMessage,
  editBroadcastMessage,
  forwardBroadcastMessage,
  deleteBroadcastMessage,
  subscribeClassMessages,
  cleanupExpiredMessages,
} from '../../lib/dataService';

interface AdminBroadcastProps {
  adminUser: UserProfile;
  classes: ClassGroup[];
}

export const AdminBroadcast: React.FC<AdminBroadcastProps> = ({ adminUser, classes }) => {
  const [selectedTargetClassId, setSelectedTargetClassId] = useState<string>('all');
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [messageLimit, setMessageLimit] = useState(20);
  const [composerText, setComposerText] = useState('');
  const [sending, setSending] = useState(false);

  // Edit message state
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editTextValue, setEditTextValue] = useState('');

  // Forward message state
  const [forwardingMsg, setForwardingMsg] = useState<BroadcastMessage | null>(null);
  const [forwardTargetId, setForwardTargetId] = useState<string>('all');

  // Emoji picker quick selector
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojis = ['📢', '🔔', '📝', '⚠️', '🎉', '📚', '🗓️', '⏰', '✨', '👋', '🏆', '💡'];

  // 1-Week Auto-retention status
  const [retentionStatus, setRetentionStatus] = useState<string | null>(null);
  const [cleaningRetention, setCleaningRetention] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to messages based on selected class or all
  useEffect(() => {
    const unsub = subscribeClassMessages(
      selectedTargetClassId === 'all' ? null : selectedTargetClassId,
      messageLimit,
      (msgs) => setMessages(msgs)
    );
    return () => unsub();
  }, [selectedTargetClassId, messageLimit]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, sending]);

  // Send broadcast message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composerText.trim() || sending) return;

    setSending(true);
    try {
      await sendBroadcastMessage({
        classId: selectedTargetClassId,
        senderId: adminUser.uid,
        senderName: adminUser.name,
        text: composerText.trim(),
      });
      setComposerText('');
      setShowEmojiPicker(false);
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Edit broadcast message
  const handleSaveEdit = async () => {
    if (!editingMsgId || !editTextValue.trim()) return;
    try {
      await editBroadcastMessage(editingMsgId, editTextValue.trim());
      setEditingMsgId(null);
      setEditTextValue('');
    } catch (err: any) {
      alert(err.message || 'Failed to update message');
    }
  };

  // Forward broadcast message
  const handleConfirmForward = async () => {
    if (!forwardingMsg) return;
    try {
      await forwardBroadcastMessage(
        forwardingMsg,
        forwardTargetId,
        adminUser.uid,
        adminUser.name
      );
      setForwardingMsg(null);
    } catch (err: any) {
      alert(err.message || 'Failed to forward message');
    }
  };

  // Format clickable links in message bubble
  const renderFormattedText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline inline-flex items-center gap-0.5 hover:text-blue-300 break-all"
          >
            <span>{part}</span>
            <ExternalLink className="w-3 h-3 inline shrink-0" />
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-[520px] rounded-2xl border overflow-hidden bg-[var(--card-main)] border-[var(--border-main)] shadow-xl">
      {/* Top Header & Class Selector Chips */}
      <div className="p-4 border-b border-[var(--border-main)] bg-[var(--raised-main)] space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-indigo-400" />
              <span className="font-bold text-sm sm:text-base">📢 Send Broadcast Messages to Students</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Messages are delivered instantly to students&apos; Class Messages tab in real-time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Dropdown: Select Class to Send */}
            <div className="flex items-center gap-2">
              <label htmlFor="selectClassDropdown" className="text-xs font-semibold text-[var(--text-muted)] whitespace-nowrap">
                Recipient:
              </label>
              <select
                id="selectClassDropdown"
                value={selectedTargetClassId}
                onChange={(e) => setSelectedTargetClassId(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border bg-[var(--card-main)] border-[var(--border-main)] text-[var(--text-main)] outline-hidden cursor-pointer"
              >
                <option value="all">📢 All Classes (School-Wide)</option>
                {classes.map((c) => (
                  <option key={c.id} value={`${c.className}-${c.section}`}>
                    Class {c.className} {c.section} ({c.groupName || 'Group'})
                  </option>
                ))}
              </select>
            </div>

            {/* 1-Week Auto-Retention Status & Manual Check */}
            <div className="flex items-center gap-2">
              <div
                title="Automatic 1-week retention: All messages older than 7 days are automatically purged from the database."
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Auto-deletes after 1 week</span>
              </div>

              <button
                type="button"
                title="All messages older than 7 days are automatically deleted. Click to perform an immediate check."
                onClick={async () => {
                  setCleaningRetention(true);
                  try {
                    const count = await cleanupExpiredMessages();
                    setRetentionStatus(
                      count > 0 ? `Deleted ${count} expired message(s)` : 'All messages are within 1 week'
                    );
                    setTimeout(() => setRetentionStatus(null), 4000);
                  } catch {
                    setRetentionStatus('Retention check completed');
                    setTimeout(() => setRetentionStatus(null), 3000);
                  } finally {
                    setCleaningRetention(false);
                  }
                }}
                disabled={cleaningRetention}
                className="px-3 py-1.5 rounded-full text-xs border border-[var(--border-main)] hover:bg-[var(--card-main)] text-[var(--text-muted)] hover:text-white transition-colors flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-60"
              >
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>{cleaningRetention ? 'Purging...' : 'Clean Expired Now'}</span>
              </button>
            </div>
          </div>
        </div>

        {retentionStatus && (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-medium text-[11px]">{retentionStatus}</span>
          </div>
        )}

        {/* Horizontally scrollable class selector chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedTargetClassId('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all select-none ${
              selectedTargetClassId === 'all'
                ? 'bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] shadow-sm'
                : 'bg-[var(--card-main)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-white'
            }`}
          >
            📢 All Classes (School-Wide)
          </button>

          {classes.map((cls) => {
            const classVal = `${cls.className}-${cls.section}`;
            const isSelected = selectedTargetClassId === classVal;

            return (
              <button
                key={cls.id}
                type="button"
                onClick={() => setSelectedTargetClassId(classVal)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all select-none ${
                  isSelected
                    ? 'bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] font-bold shadow-sm'
                    : 'bg-[var(--card-main)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-white'
                }`}
              >
                {cls.groupName || `${cls.className} ${cls.section}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.length >= messageLimit && (
          <div className="text-center pb-2">
            <button
              type="button"
              onClick={() => setMessageLimit((p) => p + 20)}
              className="px-3.5 py-1 rounded-full text-xs border border-[var(--border-main)] text-[var(--text-muted)] hover:text-white transition-colors inline-flex items-center gap-1"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Load older messages</span>
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-[var(--text-muted)]">
            <p className="font-bold text-sm">No broadcast messages</p>
            <p className="text-xs max-w-xs mt-1">
              Send an announcement below to notify students in{' '}
              {selectedTargetClassId === 'all'
                ? 'all classes'
                : `Class ${selectedTargetClassId}`}
              .
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isEditing = editingMsgId === msg.id;

            return (
              <div key={msg.id} className="flex flex-col items-end">
                <div className="p-4 rounded-2xl rounded-tr-xs border max-w-[85%] sm:max-w-[70%] space-y-2 bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-main)] shadow-sm">
                  {/* Bubble header */}
                  <div className="flex items-center justify-between gap-3 text-[11px] text-[var(--text-muted)] border-b border-[var(--border-main)]/50 pb-1">
                    <span className="font-bold text-indigo-400">
                      {msg.senderName}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[var(--border-main)] text-[var(--text-main)]">
                      {msg.classId === 'all' ? 'School-Wide' : `Class ${msg.classId}`}
                    </span>
                  </div>

                  {msg.forwarded && (
                    <p className="text-[10px] italic text-[var(--text-muted)]">
                      ↳ Forwarded
                    </p>
                  )}

                  {/* Body: Edit mode vs display */}
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={editTextValue}
                        onChange={(e) => setEditTextValue(e.target.value)}
                        className="w-full p-2.5 rounded-xl text-xs border bg-[var(--card-main)] border-[var(--border-main)] text-[var(--text-main)] outline-hidden"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingMsgId(null)}
                          className="px-2.5 py-1 rounded-lg text-xs border border-[var(--border-main)]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="px-3 py-1 rounded-lg text-xs font-bold bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)]"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                      {renderFormattedText(msg.text)}
                    </p>
                  )}

                  {/* Bubble footer with Admin action controls */}
                  <div className="flex items-center justify-between pt-1 text-[10px] text-[var(--text-muted)]">
                    <div className="flex items-center gap-1">
                      {/* Edit */}
                      <button
                        type="button"
                        title="Edit message"
                        onClick={() => {
                          setEditingMsgId(msg.id);
                          setEditTextValue(msg.text);
                        }}
                        className="p-1 rounded-md hover:bg-[var(--card-main)] text-[var(--text-muted)] hover:text-white transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Forward */}
                      <button
                        type="button"
                        title="Forward to another class"
                        onClick={() => {
                          setForwardingMsg(msg);
                          setForwardTargetId('all');
                        }}
                        className="p-1 rounded-md hover:bg-[var(--card-main)] text-[var(--text-muted)] hover:text-white transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        title="Delete message"
                        onClick={() => {
                          deleteBroadcastMessage(msg.id);
                        }}
                        className="p-1 rounded-md hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {msg.edited && <span>(edited)</span>}
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* WhatsApp Composer (Bottom Bar) */}
      <div className="p-3 border-t bg-[var(--raised-main)] border-[var(--border-main)] shrink-0 relative">
        {/* Emoji picker tray */}
        {showEmojiPicker && (
          <div className="absolute bottom-16 left-3 p-2 rounded-2xl border shadow-xl bg-[var(--card-main)] border-[var(--border-main)] flex gap-1.5 z-20">
            {emojis.map((em, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setComposerText((prev) => prev + em)}
                className="text-base p-1.5 rounded-lg hover:bg-[var(--raised-main)] transition-colors"
              >
                {em}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-center gap-2">
          {/* Emoji button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker((p) => !p)}
            className="w-10 h-10 rounded-2xl border border-[var(--border-main)] bg-[var(--card-main)] hover:bg-[var(--raised-main)] flex items-center justify-center text-[var(--text-muted)] hover:text-white transition-colors shrink-0"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Text input (Clickable links allowed, text only) */}
          <input
            type="text"
            placeholder={
              selectedTargetClassId === 'all'
                ? 'Type broadcast message to ALL classes (links clickable)...'
                : `Type announcement to Class ${selectedTargetClassId}...`
            }
            value={composerText}
            onChange={(e) => setComposerText(e.target.value)}
            disabled={sending}
            className="flex-1 px-4 py-2.5 rounded-full text-xs sm:text-sm border transition-colors outline-hidden bg-[var(--card-main)] border-[var(--border-main)] focus:border-white/50 text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
          />

          {/* Send pill button */}
          <button
            type="submit"
            disabled={!composerText.trim() || sending}
            className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] hover:opacity-90 active:scale-95 disabled:opacity-40 shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Forward Modal */}
      {forwardingMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl p-6 border shadow-2xl bg-[var(--card-main)] border-[var(--border-main)] text-[var(--text-main)] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
              <h3 className="font-bold text-sm">Forward Message</h3>
              <button
                type="button"
                onClick={() => setForwardingMsg(null)}
                className="p-1 rounded-full text-[var(--text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)] italic line-clamp-2 border-l-2 border-indigo-400 pl-2">
              &quot;{forwardingMsg.text}&quot;
            </p>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                Select Destination Class
              </label>
              <select
                value={forwardTargetId}
                onChange={(e) => setForwardTargetId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs border bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-main)] outline-hidden"
              >
                <option value="all">📢 All Classes (Broadcast to All)</option>
                {classes.map((c) => (
                  <option key={c.id} value={`${c.className}-${c.section}`}>
                    {c.groupName || `${c.className} ${c.section}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setForwardingMsg(null)}
                className="px-4 py-2 rounded-full text-xs font-semibold border border-[var(--border-main)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmForward}
                className="px-5 py-2 rounded-full text-xs font-bold bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)]"
              >
                Forward Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
