import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  subscribeClassMessages,
  subscribeSubjects,
  subscribeStudentTestResults,
  subscribeAIChatMessages,
  subscribeGameScores,
} from '../lib/dataService';
import {
  BroadcastMessage,
  SubjectItem,
  TestResult,
  AIChatMessage,
  GameScores,
  StudentTab,
  ClassGroup,
} from '../types';
import { BottomNav } from './BottomNav';
import { StudentHomeTab } from './StudentHomeTab';
import { StudentMessagesTab } from './StudentMessagesTab';
import { StudentAITestTab } from './StudentAITestTab';
import { StudentAIChatTab } from './StudentAIChatTab';
import { StudentGamesTab } from './StudentGamesTab';
import { StudentProfileTab } from './StudentProfileTab';
import { LogOut, Eye, ArrowLeft } from 'lucide-react';

interface StudentPanelProps {
  previewClass?: ClassGroup | null;
  onExitPreview?: () => void;
}

export const StudentPanel: React.FC<StudentPanelProps> = ({
  previewClass,
  onExitPreview,
}) => {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<StudentTab>('home');
  const [messageLimit, setMessageLimit] = useState(20);

  // Firestore real-time state
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([]);
  const [gameScores, setGameScores] = useState<GameScores>({
    ms: 0,
    ws: 0,
    sn: 0,
    ttt: [0, 0, 0],
  });

  // UI state
  const [openScanDirectly, setOpenScanDirectly] = useState(false);

  // Effective user (either previewed student profile or actual logged-in user)
  const effectiveUser = previewClass
    ? {
        uid: `preview_${currentUser?.uid || 'admin'}_${previewClass.id || 'class'}`,
        role: 'student' as const,
        name: `Preview Student (${previewClass.className} ${previewClass.section})`,
        username: 'preview.student',
        className: previewClass.className,
        section: previewClass.section,
        rollNo: '01',
        internalEmail: 'preview@abhyaas.app',
        createdAt: new Date().toISOString(),
      }
    : currentUser!;

  // Subscribe to real-time broadcast messages for student class + school-wide ('all')
  useEffect(() => {
    if (!effectiveUser) return;
    const unsub = subscribeClassMessages(
      effectiveUser.className ? `${effectiveUser.className}-${effectiveUser.section}` : null,
      messageLimit,
      (msgs) => setMessages(msgs)
    );
    return () => unsub();
  }, [effectiveUser?.className, effectiveUser?.section, messageLimit]);

  // Subscribe to subjects
  useEffect(() => {
    const unsub = subscribeSubjects((list) => setSubjects(list));
    return () => unsub();
  }, []);

  // Subscribe to student test results
  useEffect(() => {
    if (!effectiveUser) return;
    const unsub = subscribeStudentTestResults(effectiveUser.uid, (res) =>
      setTestResults(res)
    );
    return () => unsub();
  }, [effectiveUser?.uid]);

  // Subscribe to AI chat messages
  useEffect(() => {
    if (!effectiveUser) return;
    const unsub = subscribeAIChatMessages(effectiveUser.uid, (chats) =>
      setChatMessages(chats)
    );
    return () => unsub();
  }, [effectiveUser?.uid]);

  // Subscribe to game high scores
  useEffect(() => {
    if (!effectiveUser) return;
    const unsub = subscribeGameScores(effectiveUser.uid, (scores) =>
      setGameScores(scores)
    );
    return () => unsub();
  }, [effectiveUser?.uid]);

  const isFullScreenTab = activeTab === 'messages' || activeTab === 'aichat';

  if (!effectiveUser) return null;

  return (
    <div className={`bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-300 ${isFullScreenTab ? 'h-[100dvh] flex flex-col overflow-hidden' : 'min-h-screen'}`}>
      {/* Top Banner if in Admin Preview mode */}
      {previewClass && (
        <div className="bg-amber-500 text-black px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md shrink-0 z-50">
          <div className="flex items-center gap-2 min-w-0">
            <Eye className="w-4 h-4 shrink-0" />
            <span className="truncate">Viewing as Student: Class {previewClass.className} {previewClass.section} ({previewClass.groupName})</span>
          </div>
          {onExitPreview && (
            <button
              type="button"
              onClick={onExitPreview}
              className="px-3 py-1 rounded-full bg-black text-white hover:bg-neutral-800 text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Exit Preview</span>
            </button>
          )}
        </div>
      )}

      {isFullScreenTab ? (
        /* Full Screen Messaging & Chat View */
        <div className="flex-1 min-h-0 flex flex-col w-full max-w-4xl mx-auto sm:px-4 sm:py-2">
          {/* Top Compact Brand & Switch Account Bar */}
          <div className="flex items-center justify-between px-3 py-2 shrink-0 border-b sm:border-none border-[var(--border-main)] bg-[var(--raised-main)] sm:bg-transparent">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)]">
                A
              </div>
              <span className="font-bold text-xs sm:text-sm tracking-tight">Abhyaas Connect</span>
            </div>

            {!previewClass && (
              <button
                type="button"
                onClick={logout}
                title="Sign out of student account"
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-[var(--border-main)] hover:bg-red-500/10 text-red-400 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
                <span>Sign Out</span>
              </button>
            )}
          </div>

          {/* Full Screen Tab Body */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {activeTab === 'messages' && (
              <StudentMessagesTab
                user={effectiveUser}
                messages={messages}
                groupName={
                  previewClass
                    ? previewClass.groupName
                    : `Class ${effectiveUser.className} ${effectiveUser.section} Broadcast`
                }
                limitCount={messageLimit}
                onLoadOlder={() => setMessageLimit((p) => p + 20)}
              />
            )}

            {activeTab === 'aichat' && (
              <StudentAIChatTab
                user={effectiveUser}
                messages={chatMessages}
                classAnnouncements={messages}
                isOpenScanDirectly={openScanDirectly}
                onClearScanDirectly={() => setOpenScanDirectly(false)}
              />
            )}
          </div>
        </div>
      ) : (
        /* Standard Scrollable Container for Home, AI Test, Games, Profile */
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-4 pb-28">
          {/* Top Header Row with Sign Out button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)]">
                A
              </div>
              <span className="font-bold text-sm tracking-tight">Abhyaas Connect</span>
            </div>

            {!previewClass && (
              <button
                type="button"
                onClick={logout}
                title="Sign out of student account"
                className="px-3 py-1.5 rounded-full text-xs font-semibold border border-[var(--border-main)] hover:bg-red-500/10 text-red-400 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>

          {/* Dynamic Tab Render */}
          {activeTab === 'home' && (
            <StudentHomeTab
              user={effectiveUser}
              messages={messages}
              unreadCount={0}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenScan={() => {
                setActiveTab('aichat');
                setOpenScanDirectly(true);
              }}
            />
          )}

          {activeTab === 'aitest' && (
            <StudentAITestTab user={effectiveUser} subjects={subjects} />
          )}

          {activeTab === 'games' && (
            <StudentGamesTab
              studentId={effectiveUser.uid}
              gameScores={gameScores}
              subjects={subjects}
            />
          )}

          {activeTab === 'profile' && (
            <StudentProfileTab
              user={effectiveUser}
              testResults={testResults}
              onOpenAccountSwitcher={() => {}}
            />
          )}
        </div>
      )}

      {/* Bottom Navigation: docked in full-screen tabs (Messages, AI Chat), floating pill on others */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => setActiveTab(tab)}
        unreadCount={0}
        docked={isFullScreenTab}
      />
    </div>
  );
};
