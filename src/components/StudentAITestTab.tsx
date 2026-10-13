import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles,
  Search,
  BookOpen,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  HelpCircle,
  Award,
  GraduationCap,
  FileText,
  Check,
  Flame,
} from 'lucide-react';
import { SubjectItem, LessonItem, MCQQuestion, TestReviewItem, UserProfile } from '../types';
import { saveTestResult } from '../lib/dataService';

interface StudentAITestTabProps {
  user: UserProfile;
  subjects: SubjectItem[];
}

// Approximate / fuzzy matching helper
function fuzzyMatch(query: string, target: string): boolean {
  const q = query.trim().toLowerCase();
  const t = target.toLowerCase();
  if (!q) return false;
  if (t.includes(q)) return true;

  // Subsequence matching (e.g. "mtn" matches "motion", "frac" matches "fractions")
  let qIdx = 0;
  for (let i = 0; i < t.length && qIdx < q.length; i++) {
    if (t[i] === q[qIdx]) {
      qIdx++;
    }
  }
  if (qIdx === q.length) return true;

  // Simple token matching
  const qWords = q.split(/\s+/);
  return qWords.every((word) => t.includes(word));
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

// School classes strictly from 1st to 10th (with Class 10 as Board Exam class)
const CBSE_CLASSES = [
  { id: 'ALL', label: 'All Classes (1st–10th)', tag: 'All' },
  { id: '10', label: 'Class 10', isBoard: true, tag: 'CBSE Board' },
  { id: '9', label: 'Class 9', tag: 'Secondary' },
  { id: '8', label: 'Class 8', tag: 'Middle' },
  { id: '7', label: 'Class 7', tag: 'Middle' },
  { id: '6', label: 'Class 6', tag: 'Middle' },
  { id: '5', label: 'Class 5', tag: 'Primary' },
  { id: '4', label: 'Class 4', tag: 'Primary' },
  { id: '3', label: 'Class 3', tag: 'Primary' },
  { id: '2', label: 'Class 2', tag: 'Primary' },
  { id: '1', label: 'Class 1', tag: 'Primary' },
];

export const StudentAITestTab: React.FC<StudentAITestTabProps> = ({ user, subjects }) => {
  const userCleanClass = (user.className || '').replace(/[^0-9]/g, '') || '10';
  const initialClass = parseInt(userCleanClass) >= 1 && parseInt(userCleanClass) <= 10 ? userCleanClass : '10';

  // Test configuration state — default to ALL classes so all lessons 1st to 10th are immediately visible
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [typedLessonQuery, setTypedLessonQuery] = useState<string>('');
  const [selectedLesson, setSelectedLesson] = useState<LessonItem | null>(null);
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [numberOfQs, setNumberOfQs] = useState<number>(10);
  const [isSearching, setIsSearching] = useState(false);

  // Test execution state: 'config' | 'loading' | 'taking' | 'result'
  const [testStage, setTestStage] = useState<'config' | 'loading' | 'taking' | 'result'>('config');
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Result state
  const [finalScore, setFinalScore] = useState(0);
  const [reviewItems, setReviewItems] = useState<TestReviewItem[]>([]);

  // Default subject selection: prefer Mathematics or Science instead of random
  useEffect(() => {
    if (subjects.length > 0) {
      const exists = subjects.some((s) => s.id === selectedSubjectId);
      if (!selectedSubjectId || !exists) {
        const math = subjects.find((s) => s.name.toLowerCase() === 'mathematics');
        const sci = subjects.find((s) => s.name.toLowerCase() === 'science');
        setSelectedSubjectId(math?.id || sci?.id || subjects[0].id);
      }
    }
  }, [subjects, selectedSubjectId]);

  const activeSubject = useMemo(() => {
    if (selectedSubjectId) {
      const found = subjects.find((s) => s.id === selectedSubjectId);
      if (found) return found;
    }
    const math = subjects.find((s) => s.name.toLowerCase() === 'mathematics');
    return math || subjects[0];
  }, [subjects, selectedSubjectId]);

  // Lessons strictly matching current class filter (1st to 10th)
  const classLessons = useMemo(() => {
    if (!activeSubject) return [];
    const list = activeSubject.lessons || [];
    if (selectedClassFilter === 'ALL') {
      return list;
    }
    return list.filter((l) => l.class === selectedClassFilter || l.class === 'All');
  }, [activeSubject, selectedClassFilter]);

  // Group all lessons in activeSubject by class (Classes 10 down to 1)
  const groupedLessonsByClass = useMemo(() => {
    if (!activeSubject) return {};
    const list = activeSubject.lessons || [];
    const map: Record<string, LessonItem[]> = {};
    for (const c of ['10', '9', '8', '7', '6', '5', '4', '3', '2', '1']) {
      map[c] = [];
    }
    for (const item of list) {
      const cls = item.class || '10';
      if (!map[cls]) map[cls] = [];
      map[cls].push(item);
    }
    return map;
  }, [activeSubject]);

  // Count lessons per class
  const classCountMap = useMemo(() => {
    if (!activeSubject) return {};
    const map: Record<string, number> = {};
    for (const item of activeSubject.lessons || []) {
      const cls = item.class || '10';
      map[cls] = (map[cls] || 0) + 1;
    }
    return map;
  }, [activeSubject]);

  // Search lessons across ALL lessons of the active subject (Classes 1–10)
  const matchingLessons = useMemo(() => {
    if (!activeSubject) return [];
    const list = activeSubject.lessons || [];
    if (!typedLessonQuery.trim()) {
      return classLessons;
    }
    const query = typedLessonQuery.trim();
    return list.filter((l) => fuzzyMatch(query, l.name));
  }, [activeSubject, classLessons, typedLessonQuery]);

  // Timer countdown during test
  const timerRef = useRef<any>(null);
  useEffect(() => {
    if (testStage === 'taking' && timeLeftSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeftSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmitTest();
            return 0;
          }
          return prev - 1;
        });
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [testStage, timeLeftSeconds]);

  // Start test generation
  const handleGenerateTest = async () => {
    const lessonName = selectedLesson ? selectedLesson.name : typedLessonQuery.trim();
    if (!lessonName) {
      setErrorNotice('Please select or type a chapter/lesson name first.');
      return;
    }

    setErrorNotice(null);
    setTestStage('loading');

    try {
      const targetGrade = selectedLesson?.class || (selectedClassFilter !== 'ALL' ? selectedClassFilter : initialClass) || '10';
      const response = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: getEffectiveStudentId(user.uid),
          subject: activeSubject ? activeSubject.name : 'General',
          lesson: lessonName,
          difficulty,
          numberOfQs,
          gradeClass: targetGrade,
        }),
      });

      const rawText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error('Test generator is preparing questions. Please tap retry.');
      }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate test. Please try again.');
      }

      if (!data.questions || data.questions.length === 0) {
        throw new Error('No questions returned. Please try again.');
      }

      setQuestions(data.questions);
      setCurrentQIndex(0);
      setSelectedAnswers({});
      // 1 minute per question as standard
      const totalSecs = data.questions.length * 60;
      setTimeLeftSeconds(totalSecs);
      setElapsedSeconds(0);
      setTestStage('taking');
    } catch (err: any) {
      setErrorNotice(err.message || 'Could not generate test. Please try again.');
      setTestStage('config');
    }
  };

  // Submit test and compute review breakdown
  const handleSubmitTest = async () => {
    let score = 0;
    const reviews: TestReviewItem[] = [];

    questions.forEach((q, idx) => {
      const chosen = selectedAnswers[idx] !== undefined ? selectedAnswers[idx] : -1;
      const isCorrect = chosen === q.correctIndex;
      if (isCorrect) score += 1;

      reviews.push({
        question: q.question,
        options: q.options,
        chosenIndex: chosen,
        correctIndex: q.correctIndex,
        isCorrect,
        explanation: q.explanation,
        boardReference: q.boardReference,
      });
    });

    setFinalScore(score);
    setReviewItems(reviews);
    setTestStage('result');

    // Save to Firestore test_results
    const lessonTitle = selectedLesson ? selectedLesson.name : typedLessonQuery;
    saveTestResult({
      studentId: user.uid,
      studentName: user.name,
      subject: activeSubject?.name || 'General',
      lesson: lessonTitle,
      difficulty,
      numberOfQs: questions.length,
      score,
      wrongCount: questions.length - score,
      date: new Date().toISOString(),
      timeTakenSeconds: elapsedSeconds,
      reviewItems: reviews,
    }).catch(console.error);
  };

  // Format seconds to MM:SS
  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder.toString().padStart(2, '0')}`;
  };

  // ==========================================
  // STAGE 1: LOADING SPINNER
  // ==========================================
  if (testStage === 'loading') {
    const targetClass = selectedLesson?.class || (selectedClassFilter !== 'ALL' ? selectedClassFilter : '10');
    const isBoard = targetClass === '10';

    return (
      <div className="flex flex-col items-center justify-center min-h-[460px] p-8 text-center rounded-3xl border bg-[var(--card-main)] border-[var(--border-main)] animate-in fade-in">
        <div className="w-16 h-16 rounded-full border-4 border-[var(--border-main)] border-t-[var(--accent-pill-bg)] animate-spin mb-4" />
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 mb-2">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span>{isBoard ? 'CBSE Class 10 Board Papers Referenced (2019–2024)' : `CBSE Class ${targetClass} Curriculum`}</span>
        </div>
        <h3 className="font-bold text-lg">Setting CBSE Questions...</h3>
        <p className="text-xs text-[var(--text-muted)] max-w-sm mt-1">
          Generating {difficulty.toLowerCase()} questions for{' '}
          <strong className="text-[var(--text-main)]">
            {selectedLesson ? selectedLesson.name : typedLessonQuery}
          </strong>{' '}
          (Class {targetClass}).
        </p>
      </div>
    );
  }

  // ==========================================
  // STAGE 2: TEST TAKING INTERFACE
  // ==========================================
  if (testStage === 'taking') {
    const currentQ = questions[currentQIndex];
    const totalQ = questions.length;
    const progressPct = ((currentQIndex + 1) / totalQ) * 100;
    const isAssertionReason = currentQ.question.includes('Assertion (A)') || currentQ.question.includes('Assertion:');

    return (
      <div className="space-y-4 pb-24 animate-in fade-in duration-200">
        {/* Top Header: Progress & Timer */}
        <div className="p-4 rounded-3xl border flex items-center justify-between shadow-sm bg-[var(--card-main)] border-[var(--border-main)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--text-muted)]">
                Question {currentQIndex + 1} of {totalQ}
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--raised-main)] text-[var(--text-main)]">
                {difficulty}
              </span>
            </div>
            <div className="text-xs text-[var(--text-muted)] truncate max-w-[140px] sm:max-w-xs mt-0.5 font-medium">
              {selectedLesson ? selectedLesson.name : typedLessonQuery}
            </div>
          </div>

          {/* 1 min / question countdown timer */}
          <div
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-mono text-xs font-bold border transition-colors ${
              timeLeftSeconds < 60
                ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                : 'bg-[var(--raised-main)] text-[var(--text-main)] border-[var(--border-main)]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTimer(timeLeftSeconds)}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-[var(--border-main)] overflow-hidden">
          <div
            className="h-full bg-[var(--accent-pill-bg)] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Question Card */}
        <div className="p-5 sm:p-7 rounded-[26px] border shadow-lg space-y-5 bg-[var(--card-main)] border-[var(--border-main)]">
          {/* Prominent Board Reference Badge */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>{currentQ.boardReference || 'CBSE Board Question Reference'}</span>
            </span>
            {isAssertionReason && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                Assertion-Reasoning (A-R)
              </span>
            )}
          </div>

          <h2 className="text-base sm:text-lg font-bold leading-relaxed whitespace-pre-line">
            {currentQ.question}
          </h2>

          {/* Options */}
          <div className="space-y-3 pt-1">
            {currentQ.options.map((option, optIdx) => {
              const isSelected = selectedAnswers[currentQIndex] === optIdx;
              const optionLetters = ['A', 'B', 'C', 'D'];

              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() =>
                    setSelectedAnswers((prev) => ({
                      ...prev,
                      [currentQIndex]: optIdx,
                    }))
                  }
                  className={`w-full p-4 rounded-2xl border text-left flex items-start sm:items-center gap-3.5 transition-all select-none cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] border-transparent font-bold shadow-md scale-[1.01]'
                      : 'bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-main)] hover:border-white/40'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-colors mt-0.5 sm:mt-0 ${
                      isSelected
                        ? 'bg-black/20 text-current'
                        : 'bg-[var(--card-main)] text-[var(--text-muted)] border border-[var(--border-main)]'
                    }`}
                  >
                    {optionLetters[optIdx]}
                  </div>
                  <span className="text-xs sm:text-sm leading-snug flex-1">{option}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stepper Navigation */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            disabled={currentQIndex === 0}
            onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
            className="px-4 py-2.5 rounded-full text-xs font-semibold border border-[var(--border-main)] hover:bg-[var(--raised-main)] disabled:opacity-40 transition-colors flex items-center gap-1.5 text-[var(--text-main)] cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {currentQIndex === totalQ - 1 ? (
            <button
              type="button"
              onClick={handleSubmitTest}
              className="px-6 py-2.5 rounded-full text-xs font-bold transition-all shadow-md bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <span>Submit Test</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentQIndex((prev) => Math.min(totalQ - 1, prev + 1))}
              className="px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-md bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] hover:opacity-90 flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // STAGE 3: DETAILED RESULT & REVIEW SCREEN
  // ==========================================
  if (testStage === 'result') {
    const totalQ = questions.length;
    const percentage = Math.round((finalScore / totalQ) * 100);
    const isPassed = percentage >= 60;
    const targetClass = selectedLesson?.class || (selectedClassFilter !== 'ALL' ? selectedClassFilter : '10');

    return (
      <div className="space-y-6 pb-24 animate-in fade-in duration-300">
        {/* Score Summary Card */}
        <div className="rounded-[28px] p-6 sm:p-8 border shadow-xl text-center space-y-4 bg-[var(--card-main)] border-[var(--border-main)]">
          <div className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center bg-indigo-500/15 text-indigo-400">
            <Award className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight">Test Completed!</h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {selectedLesson ? selectedLesson.name : typedLessonQuery} • {difficulty} • Class {targetClass}
            </p>
          </div>

          {/* Big Score Display */}
          <div className="flex items-center justify-center gap-6 py-2">
            <div>
              <span className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                {finalScore}
              </span>
              <span className="text-xl text-[var(--text-muted)] font-normal"> / {totalQ}</span>
              <p className="text-[11px] text-[var(--text-muted)] font-semibold uppercase mt-0.5">
                Score
              </p>
            </div>
            <div className="h-10 w-px bg-[var(--border-main)]" />
            <div>
              <span
                className={`text-4xl sm:text-5xl font-extrabold tracking-tight ${
                  isPassed ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {percentage}%
              </span>
              <p className="text-[11px] text-[var(--text-muted)] font-semibold uppercase mt-0.5">
                Accuracy
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleGenerateTest}
              className="px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] hover:opacity-90 active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry Test with New Questions</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTestStage('config');
                setQuestions([]);
              }}
              className="px-5 py-2.5 rounded-full text-xs font-semibold border border-[var(--border-main)] hover:bg-[var(--raised-main)] text-[var(--text-main)] transition-colors cursor-pointer"
            >
              Back to Chapters
            </button>
          </div>
        </div>

        {/* Detailed Question Review List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">
              CBSE Marking Scheme Solutions ({totalQ} Questions)
            </h3>
            <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1">
              <Award className="w-3.5 h-3.5" /> Board Reference
            </span>
          </div>

          {reviewItems.map((item, idx) => (
            <div
              key={idx}
              className={`p-5 rounded-2xl border space-y-3 transition-colors ${
                item.isCorrect
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-red-500/5 border-red-500/25'
              }`}
            >
              {/* Question title & status badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    <Award className="w-3 h-3 text-amber-400" />
                    <span>{item.boardReference || 'CBSE Board Question Reference'}</span>
                  </div>
                  <h4 className="font-semibold text-xs sm:text-sm whitespace-pre-line pt-0.5">
                    {idx + 1}. {item.question}
                  </h4>
                </div>

                {item.isCorrect ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Correct</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400 shrink-0">
                    <XCircle className="w-4 h-4" />
                    <span>Incorrect</span>
                  </span>
                )}
              </div>

              {/* If wrong: Show chosen vs correct option */}
              {!item.isCorrect && (
                <div className="space-y-1.5 text-xs">
                  <div className="p-2.5 rounded-xl border bg-red-500/10 border-red-500/30 text-red-300">
                    <strong>Your Choice: </strong>
                    {item.chosenIndex !== -1
                      ? item.options[item.chosenIndex]
                      : 'None selected (Time expired)'}
                  </div>
                  <div className="p-2.5 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-300">
                    <strong>Correct Answer: </strong>
                    {item.options[item.correctIndex]}
                  </div>
                </div>
              )}

              {/* Step-by-step Explanation */}
              <div className="p-3.5 rounded-xl border bg-[var(--raised-main)] border-[var(--border-main)] text-xs text-[var(--text-muted)] space-y-1">
                <div className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Official CBSE Marking Scheme Solution</span>
                </div>
                <p className="leading-relaxed text-[var(--text-main)]/90">
                  {item.explanation}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==========================================
  // STAGE 0: TEST CONFIGURATION (DEFAULT)
  // ==========================================
  const isClass10 = selectedClassFilter === '10';

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="p-5 rounded-[26px] border bg-[var(--card-main)] border-[var(--border-main)] relative overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 mb-2">
              <Award className="w-3.5 h-3.5" />
              <span>{isClass10 ? 'CBSE Class 10 Board Exam Papers (2019–2024)' : 'CBSE Curriculum Classes 1st to 10th'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              CBSE All-Class MCQ Practice & Board Bank
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
              Select your class from 1st to 10th and choose any chapter to practice authentic board & NCERT MCQs.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--raised-main)] border border-[var(--border-main)] text-[var(--text-main)]">
              {selectedClassFilter === 'ALL' ? 'All Classes' : `Class ${selectedClassFilter}`}
            </span>
          </div>
        </div>
      </div>

      {errorNotice && (
        <div className="p-3.5 rounded-2xl flex items-center gap-2 text-xs font-medium bg-red-500/15 border border-red-500/30 text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Step 1: Select Class (1st to 10th) */}
      <div className="p-5 rounded-[24px] border space-y-3 bg-[var(--card-main)] border-[var(--border-main)]">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            1. Select CBSE Class (1st to 10th)
          </label>
          <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1">
            <Award className="w-3.5 h-3.5" /> Class 10: Board Exam Class
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {CBSE_CLASSES.map((cls) => {
            const isSelected = selectedClassFilter === cls.id;
            const count = cls.id === 'ALL' ? (activeSubject?.lessons?.length || 0) : (classCountMap[cls.id] || 0);

            return (
              <button
                key={cls.id}
                type="button"
                onClick={() => {
                  setSelectedClassFilter(cls.id);
                  setSelectedLesson(null);
                  setTypedLessonQuery('');
                }}
                className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] border-transparent shadow-md scale-[1.02]'
                    : 'bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <span>{cls.label}</span>
                {cls.isBoard && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-extrabold uppercase">
                    Board
                  </span>
                )}
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold ${isSelected ? 'bg-black/20 text-current' : 'bg-[var(--card-main)] text-[var(--text-muted)]'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Select Core Subject */}
      <div className="p-5 rounded-[24px] border space-y-3 bg-[var(--card-main)] border-[var(--border-main)]">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            2. Select Subject
          </label>
          <span className="text-[11px] text-[var(--text-muted)]">
            {subjects.length} subjects available
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {subjects.map((subj) => {
            const isSelected = subj.id === activeSubject?.id;
            return (
              <button
                key={subj.id}
                type="button"
                onClick={() => {
                  setSelectedSubjectId(subj.id);
                  setSelectedLesson(null);
                  setTypedLessonQuery('');
                }}
                className={`py-3 px-3.5 rounded-2xl text-xs font-bold transition-all truncate border select-none cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] border-transparent shadow-md scale-[1.02]'
                    : 'bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <span className="truncate">{subj.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${isSelected ? 'bg-black/20 text-current' : 'bg-[var(--card-main)] text-[var(--text-muted)]'}`}>
                  {subj.lessons?.length || 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 3: CBSE Chapter / Lesson Browser (Classes 1st to 10th) */}
      <div className="p-5 rounded-[24px] border space-y-4 bg-[var(--card-main)] border-[var(--border-main)] relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              3. Choose Chapter from CBSE Syllabus (1st to 10th)
            </label>
            <span className="text-[11px] text-indigo-400 font-medium">
              {selectedClassFilter === 'ALL'
                ? `Showing all ${activeSubject?.lessons?.length || 0} chapters across Classes 1st to 10th in ${activeSubject?.name}`
                : `Showing all ${classLessons.length} chapters for Class ${selectedClassFilter} in ${activeSubject?.name}`}
            </span>
          </div>

          {selectedClassFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedClassFilter('ALL')}
              className="text-xs text-indigo-400 font-bold hover:underline cursor-pointer self-start sm:self-auto"
            >
              View all chapters (Classes 1st–10th)
            </button>
          )}
        </div>

        {/* Selected Lesson Pill */}
        {selectedLesson && (
          <div className="p-4 rounded-2xl border bg-indigo-500/10 border-indigo-500/30 flex items-center justify-between text-xs animate-in fade-in">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-[var(--text-main)] text-sm sm:text-base truncate block">
                  {selectedLesson.name}
                </span>
                <span className="text-[11px] text-indigo-300 flex items-center gap-1.5 mt-0.5">
                  <span className="font-semibold">Class {selectedLesson.class}</span>
                  <span>•</span>
                  <span>{selectedLesson.class === '10' ? 'CBSE Class 10 Board Exam Syllabus' : 'CBSE Official NCERT Chapter'}</span>
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedLesson(null);
                setTypedLessonQuery('');
              }}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[var(--raised-main)] hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
            >
              Change Chapter
            </button>
          </div>
        )}

        {/* Type to search input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[var(--text-muted)] pointer-events-none" />
          <input
            type="text"
            placeholder={`Search across all chapters 1st to 10th (e.g. Real Numbers, Chemical Reactions, Motion, Triangles, Tenses, Electricity)...`}
            value={typedLessonQuery}
            onFocus={() => setIsSearching(true)}
            onChange={(e) => {
              setTypedLessonQuery(e.target.value);
              setSelectedLesson(null);
              setIsSearching(true);
            }}
            className="w-full pl-10 pr-4 py-3 rounded-2xl text-xs sm:text-sm border transition-colors outline-hidden bg-[var(--raised-main)] border-[var(--border-main)] focus:border-white/50 text-[var(--text-main)] placeholder:text-[var(--text-muted)]/60"
          />
        </div>

        {/* Chapter Browser List */}
        {!selectedLesson && (
          <div className="space-y-4">
            {/* If user typed a search query */}
            {typedLessonQuery.trim().length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] px-1">
                  <span>Found {matchingLessons.length} matching chapters</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTypedLessonQuery('');
                      setIsSearching(false);
                    }}
                    className="text-indigo-400 hover:underline"
                  >
                    Clear search
                  </button>
                </div>

                {matchingLessons.length === 0 ? (
                  <div className="p-4 rounded-2xl border border-dashed border-[var(--border-main)] text-center text-xs text-[var(--text-muted)] space-y-1">
                    <p>No standard chapter matches &quot;{typedLessonQuery}&quot;.</p>
                    <p className="text-[11px] text-indigo-400">
                      You can still tap &quot;Start Test&quot; below to take an AI test on this topic directly!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto p-1">
                    {matchingLessons.map((lesson, idx) => {
                      const isClass10Item = lesson.class === '10';
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedLesson(lesson);
                            setTypedLessonQuery(lesson.name);
                            setIsSearching(false);
                          }}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2.5 group ${
                            isClass10Item
                              ? 'bg-amber-500/5 border-amber-500/25 hover:border-amber-400 hover:bg-amber-500/10'
                              : 'bg-[var(--raised-main)] border-[var(--border-main)] hover:border-indigo-400/50 hover:bg-indigo-500/10'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <BookOpen className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isClass10Item ? 'text-amber-400' : 'text-indigo-400'}`} />
                            <span className="text-xs font-medium text-[var(--text-main)] truncate">
                              {lesson.name}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                            isClass10Item
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-[var(--card-main)] border border-[var(--border-main)] text-[var(--text-muted)]'
                          }`}>
                            Class {lesson.class}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : selectedClassFilter === 'ALL' ? (
              /* ALL CLASSES VIEW: Grouped by class (Class 10 down to Class 1) */
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {['10', '9', '8', '7', '6', '5', '4', '3', '2', '1'].map((c) => {
                  const chapters = groupedLessonsByClass[c] || [];
                  if (chapters.length === 0) return null;
                  const isClass10Section = c === '10';

                  return (
                    <div
                      key={c}
                      className={`p-3.5 rounded-2xl border space-y-2.5 ${
                        isClass10Section
                          ? 'bg-amber-500/5 border-amber-500/30'
                          : 'bg-[var(--raised-main)]/60 border-[var(--border-main)]'
                      }`}
                    >
                      {/* Section Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isClass10Section ? (
                            <>
                              <Award className="w-4 h-4 text-amber-400 shrink-0" />
                              <span className="font-bold text-xs sm:text-sm text-amber-300">
                                Class 10 — CBSE Board Examination (High Yield PYQ Bank)
                              </span>
                            </>
                          ) : (
                            <>
                              <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                              <span className="font-bold text-xs sm:text-sm text-[var(--text-main)]">
                                Class {c} CBSE Curriculum
                              </span>
                            </>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isClass10Section
                            ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                            : 'bg-[var(--card-main)] border border-[var(--border-main)] text-[var(--text-muted)]'
                        }`}>
                          {chapters.length} Chapters
                        </span>
                      </div>

                      {/* Chapters Grid for this Class */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {chapters.map((lesson, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSelectedLesson(lesson);
                              setTypedLessonQuery(lesson.name);
                              setIsSearching(false);
                            }}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 group ${
                              isClass10Section
                                ? 'bg-[var(--card-main)] border-amber-500/20 hover:border-amber-400 hover:bg-amber-500/10'
                                : 'bg-[var(--card-main)] border-[var(--border-main)] hover:border-indigo-400/50 hover:bg-indigo-500/10'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] font-bold text-[var(--text-muted)] shrink-0 w-5">
                                #{idx + 1}
                              </span>
                              <span className="text-xs font-medium text-[var(--text-main)] truncate">
                                {lesson.name}
                              </span>
                            </div>
                            {isClass10Section && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 font-extrabold shrink-0 uppercase">
                                Board
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* SINGLE CLASS VIEW: Renders all chapters of that selected class */
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] px-1">
                  <span className="font-semibold text-[var(--text-main)]">
                    Class {selectedClassFilter} Syllabus ({classLessons.length} chapters)
                  </span>
                  {selectedClassFilter === '10' && (
                    <span className="text-[11px] text-amber-400 font-bold flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" /> Official Board Paper Syllabus
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[460px] overflow-y-auto p-1">
                  {classLessons.map((lesson, idx) => {
                    const isClass10Item = lesson.class === '10';
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedLesson(lesson);
                          setTypedLessonQuery(lesson.name);
                          setIsSearching(false);
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2.5 group ${
                          isClass10Item
                            ? 'bg-amber-500/5 border-amber-500/25 hover:border-amber-400 hover:bg-amber-500/10'
                            : 'bg-[var(--raised-main)] border-[var(--border-main)] hover:border-indigo-400/50 hover:bg-indigo-500/10'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[10px] font-bold text-[var(--text-muted)] shrink-0 w-5">
                            #{idx + 1}
                          </span>
                          <BookOpen className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isClass10Item ? 'text-amber-400' : 'text-indigo-400'}`} />
                          <span className="text-xs font-medium text-[var(--text-main)] truncate">
                            {lesson.name}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                          isClass10Item
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-[var(--card-main)] border border-[var(--border-main)] text-[var(--text-muted)]'
                        }`}>
                          Class {lesson.class}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 4: Difficulty Selection */}
      <div className="p-5 rounded-[24px] border space-y-3 bg-[var(--card-main)] border-[var(--border-main)]">
        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          4. Difficulty Level
        </label>
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setDifficulty('EASY')}
            className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
              difficulty === 'EASY'
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold ring-1 ring-emerald-400 shadow-sm'
                : 'bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 mx-auto mb-1.5" />
            <span className="text-xs font-bold block">EASY</span>
            <span className="text-[10px] text-[var(--text-muted)]">Direct NCERT</span>
          </button>

          <button
            type="button"
            onClick={() => setDifficulty('MEDIUM')}
            className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
              difficulty === 'MEDIUM'
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold ring-1 ring-amber-400 shadow-sm'
                : 'bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 mx-auto mb-1.5" />
            <span className="text-xs font-bold block">MEDIUM</span>
            <span className="text-[10px] text-[var(--text-muted)]">Board Standard</span>
          </button>

          <button
            type="button"
            onClick={() => setDifficulty('HARD')}
            className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
              difficulty === 'HARD'
                ? 'bg-rose-500/20 border-rose-400 text-rose-300 font-bold ring-1 ring-rose-400 shadow-sm'
                : 'bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-rose-400 mx-auto mb-1.5" />
            <span className="text-xs font-bold block">HARD</span>
            <span className="text-[10px] text-[var(--text-muted)]">HOTS & Exemplar</span>
          </button>
        </div>
      </div>

      {/* Step 5: Number of Questions */}
      <div className="p-5 rounded-[24px] border space-y-4 bg-[var(--card-main)] border-[var(--border-main)]">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            5. Number of Questions
          </label>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[var(--raised-main)] text-[var(--text-main)]">
            {numberOfQs} Questions (~{numberOfQs} mins)
          </span>
        </div>

        {/* Chips */}
        <div className="flex flex-wrap gap-2">
          {[5, 10, 15, 20, 25, 30].map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => setNumberOfQs(count)}
              className={`px-4 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                numberOfQs === count
                  ? 'bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] border-transparent shadow-sm scale-105'
                  : 'bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      {/* Start Test Button */}
      <button
        type="button"
        onClick={handleGenerateTest}
        disabled={!selectedLesson && !typedLessonQuery.trim()}
        className="w-full py-4 px-6 rounded-full font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-xl bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] hover:opacity-90 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
      >
        <Sparkles className="w-5 h-5" />
        <span>
          Start {numberOfQs} {difficulty} CBSE Questions Test
        </span>
      </button>

      <div className="text-center space-y-1">
        <p className="text-[11px] text-[var(--text-muted)]">
          Questions referenced from CBSE Board Examination Papers (2019–2024), NCERT Exemplars & SQPs
        </p>
      </div>
    </div>
  );
};
