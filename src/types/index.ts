export type UserRole = 'admin' | 'student';

export type StudentTab = 'home' | 'messages' | 'aitest' | 'aichat' | 'games' | 'profile';

export interface UserProfile {
  uid: string;
  role: UserRole;
  name: string;
  username: string;
  className: string;
  section: string;
  rollNo: string;
  internalEmail: string;
  createdAt: string;
}

export interface ClassGroup {
  id: string;
  className: string;
  section: string;
  groupName: string;
  createdAt: string;
  studentCount?: number;
}

export interface BroadcastMessage {
  id: string;
  classId: string; // 'all' or class ID
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string; // ISO string
  edited?: boolean;
  forwarded?: boolean;
}

export interface LessonItem {
  name: string;
  class: string; // "1", "2", ... "10", "All"
}

export interface SubjectItem {
  id: string;
  name: string;
  lessons: LessonItem[];
}

export interface MCQQuestion {
  id?: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  boardReference?: string; // e.g. "CBSE 2023 Set-1", "CBSE 2024 SQP", "CBSE PYQ Repeated"
}

export interface TestReviewItem {
  question: string;
  options: string[];
  chosenIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  explanation: string;
  boardReference?: string;
}

export interface TestResult {
  id: string;
  studentId: string;
  studentName: string;
  lesson: string;
  subject: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  numberOfQs: number;
  score: number;
  wrongCount: number;
  date: string;
  timeTakenSeconds?: number;
  reviewItems?: TestReviewItem[];
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  extractedQuestion?: string;
  practiceQuestions?: MCQQuestion[];
}

export interface GameScores {
  ms: number; // Math Sprint high score
  ws: number; // Word Scramble high score
  sn: number; // Snake high score
  ttt: [number, number, number]; // [wins, draws, losses]
  updatedAt?: string;
}

export interface SavedDeviceSession {
  uid: string;
  username: string;
  name: string;
  role: UserRole;
  className: string;
  section: string;
  rollNo: string;
  internalEmail: string;
  authPassword?: string;
  lastActive: number;
}
