import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  startAfter,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreErrors';
import {
  BroadcastMessage,
  ClassGroup,
  SubjectItem,
  TestResult,
  AIChatMessage,
  GameScores,
  UserProfile,
} from '../types';

// ==========================================
// 1. BROADCAST MESSAGES SERVICE
// ==========================================

// Send a new broadcast message (Text-only, no attachments)
export async function sendBroadcastMessage(params: {
  classId: string; // 'all' or class ID
  senderId: string;
  senderName: string;
  text: string;
}): Promise<string> {
  const { classId, senderId, senderName, text } = params;
  try {
    const docRef = await addDoc(collection(db, 'messages'), {
      classId,
      senderId,
      senderName,
      text: text.trim(),
      timestamp: new Date().toISOString(),
      serverCreated: serverTimestamp(),
      edited: false,
      forwarded: false,
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'messages');
  }
}

// Edit a broadcast message
export async function editBroadcastMessage(msgId: string, newText: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'messages', msgId), {
      text: newText.trim(),
      edited: true,
      editedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `messages/${msgId}`);
  }
}

// Forward a broadcast message to another class or all
export async function forwardBroadcastMessage(
  originalMessage: BroadcastMessage,
  targetClassId: string,
  adminSenderId: string,
  adminName: string
): Promise<void> {
  try {
    await addDoc(collection(db, 'messages'), {
      classId: targetClassId,
      senderId: adminSenderId,
      senderName: adminName,
      text: originalMessage.text,
      timestamp: new Date().toISOString(),
      serverCreated: serverTimestamp(),
      forwarded: true,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'messages');
  }
}

// Delete a broadcast message
// 1-Week (7 Days) Message Retention in milliseconds
export const MESSAGE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

// Automatic 7-day (1 week) retention cleanup for broadcast messages
export async function cleanupExpiredMessages(): Promise<number> {
  const sevenDaysAgo = new Date(Date.now() - MESSAGE_RETENTION_MS).toISOString();
  try {
    let totalDeleted = 0;
    let keepCleaning = true;
    let cycles = 0;

    // Batch clean expired broadcast messages
    while (keepCleaning && cycles < 5) {
      cycles++;
      const q = query(collection(db, 'messages'), where('timestamp', '<', sevenDaysAgo), limit(100));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        keepCleaning = false;
        break;
      }
      const deletePromises = snapshot.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      totalDeleted += snapshot.docs.length;
      if (snapshot.docs.length < 100) {
        keepCleaning = false;
      }
    }

    if (totalDeleted > 0) {
      console.log(`[Auto-Retention] Successfully deleted ${totalDeleted} broadcast message(s) older than 1 week.`);
    }
    return totalDeleted;
  } catch (err) {
    console.warn('[Auto-Retention] Broadcast cleanup note:', err);
    return 0;
  }
}

// Global background retention scheduler (runs automatically without user intervention)
let retentionSchedulerActive = false;
export function startAutomaticRetentionScheduler(): () => void {
  if (retentionSchedulerActive) return () => {};
  retentionSchedulerActive = true;

  // Immediate background execution on app initialization
  cleanupExpiredMessages().catch(() => {});

  // Recurring background execution every 30 minutes
  const intervalId = setInterval(() => {
    cleanupExpiredMessages().catch(() => {});
  }, 30 * 60 * 1000);

  return () => {
    clearInterval(intervalId);
    retentionSchedulerActive = false;
  };
}

export async function deleteBroadcastMessage(msgId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'messages', msgId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `messages/${msgId}`);
  }
}

// Subscribe to messages for a class (or school-wide broadcasts)
// Filters messages within the last 7 days (auto-retention requirement)
export function subscribeClassMessages(
  classId: string | null,
  limitCount: number,
  onUpdate: (messages: BroadcastMessage[]) => void,
  onError?: (err: any) => void
): () => void {
  // Trigger background automatic deletion of any expired messages
  cleanupExpiredMessages().catch(() => {});

  const messagesCol = collection(db, 'messages');
  // Retention cutoff: 7 days ago
  const sevenDaysAgo = new Date(Date.now() - MESSAGE_RETENTION_MS).toISOString();

  let q = query(
    messagesCol,
    where('timestamp', '>=', sevenDaysAgo),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: BroadcastMessage[] = [];
      const cutoffMs = Date.now() - MESSAGE_RETENTION_MS;

      snapshot.forEach((d) => {
        const data = d.data();
        const msgTime = new Date(data.timestamp).getTime();

        // 1-Week auto-retention safeguard:
        // If an expired message is encountered, lazily delete it from Firestore and omit from UI
        if (!isNaN(msgTime) && msgTime < cutoffMs) {
          deleteDoc(d.ref).catch(() => {});
          return;
        }

        // Client filter for classId or 'all' if student is specified
        if (!classId || data.classId === 'all' || data.classId === classId) {
          msgs.push({
            id: d.id,
            classId: data.classId,
            senderId: data.senderId,
            senderName: data.senderName,
            text: data.text,
            timestamp: data.timestamp,
            edited: !!data.edited,
            forwarded: !!data.forwarded,
          });
        }
      });
      // Sort ascending so newest is at the bottom (WhatsApp style)
      msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      onUpdate(msgs);
    },
    (err) => {
      console.error('Messages subscription error:', err);
      if (onError) onError(err);
    }
  );
}

// ==========================================
// 2. CLASSES & STUDENTS MANAGEMENT
// ==========================================

export function subscribeClasses(
  onUpdate: (classes: ClassGroup[]) => void,
  onError?: (err: any) => void
): () => void {
  return onSnapshot(
    collection(db, 'classes'),
    (snapshot) => {
      const classes: ClassGroup[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        classes.push({
          id: d.id,
          className: data.className,
          section: data.section,
          groupName: data.groupName,
          createdAt: data.createdAt,
        });
      });
      // Sort by class name then section
      classes.sort((a, b) => a.className.localeCompare(b.className) || a.section.localeCompare(b.section));
      onUpdate(classes);
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

export async function createClass(className: string, section: string, groupName: string): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'classes'), {
      className: className.trim(),
      section: section.trim().toUpperCase(),
      groupName: groupName.trim(),
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'classes');
  }
}

export async function updateClassGroupName(classId: string, newGroupName: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'classes', classId), {
      groupName: newGroupName.trim(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `classes/${classId}`);
  }
}

export async function deleteClass(
  classId: string,
  purgeStudents: boolean = true,
  className?: string,
  section?: string
): Promise<void> {
  try {
    // 1. Delete the class record
    await deleteDoc(doc(db, 'classes', classId));

    // 2. If requested, delete all student accounts in this class
    if (purgeStudents && className && section) {
      try {
        const qStudents = query(
          collection(db, 'users'),
          where('role', '==', 'student'),
          where('className', '==', className),
          where('section', '==', section)
        );
        const snap = await getDocs(qStudents);
        for (const sDoc of snap.docs) {
          // Delete student doc
          await deleteDoc(sDoc.ref);
          // Delete their AI chats subcollection
          try {
            const chatCol = collection(db, `ai_chats/${sDoc.id}/messages`);
            const chatSnap = await getDocs(chatCol);
            for (const c of chatSnap.docs) {
              await deleteDoc(c.ref);
            }
          } catch {}
        }
      } catch (subErr) {
        console.warn('Class student cleanup notice:', subErr);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `classes/${classId}`);
  }
}

// Fetch all students belonging to a class
export function subscribeStudentsByClass(
  className: string,
  section: string,
  onUpdate: (students: UserProfile[]) => void,
  onError?: (err: any) => void
): () => void {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'student'),
    where('className', '==', className),
    where('section', '==', section)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const students: UserProfile[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        students.push({
          uid: d.id,
          role: 'student',
          name: data.name,
          username: data.username,
          className: data.className,
          section: data.section,
          rollNo: data.rollNo || '',
          internalEmail: data.internalEmail,
          createdAt: data.createdAt,
        });
      });
      // Sort by roll no
      students.sort((a, b) => (parseInt(a.rollNo) || 0) - (parseInt(b.rollNo) || 0));
      onUpdate(students);
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

// Fetch all students (for counting / admin stats)
export function subscribeAllStudents(
  onUpdate: (students: UserProfile[]) => void,
  onError?: (err: any) => void
): () => void {
  const q = query(collection(db, 'users'), where('role', '==', 'student'));
  return onSnapshot(
    q,
    (snapshot) => {
      const students: UserProfile[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        students.push({
          uid: d.id,
          role: 'student',
          name: data.name,
          username: data.username,
          className: data.className,
          section: data.section,
          rollNo: data.rollNo || '',
          internalEmail: data.internalEmail,
          createdAt: data.createdAt,
        });
      });
      onUpdate(students);
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

// Fetch all admins
export function subscribeAllAdmins(
  onUpdate: (admins: UserProfile[]) => void,
  onError?: (err: any) => void
): () => void {
  const q = query(collection(db, 'users'), where('role', '==', 'admin'));
  return onSnapshot(
    q,
    (snapshot) => {
      const admins: UserProfile[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        admins.push({
          uid: d.id,
          role: 'admin',
          name: data.name,
          username: data.username,
          className: '',
          section: '',
          rollNo: '',
          internalEmail: data.internalEmail,
          createdAt: data.createdAt,
        });
      });
      onUpdate(admins);
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

export async function deleteUserAccount(uid: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'users', uid));

    // Also delete any AI chats subcollection messages for this user
    try {
      const chatCol = collection(db, `ai_chats/${uid}/messages`);
      const chatSnap = await getDocs(chatCol);
      for (const c of chatSnap.docs) {
        await deleteDoc(c.ref);
      }
    } catch {}

    // Clean up local saved device session if present
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('abhyaas_device_saved_sessions');
        if (raw) {
          const sessions = JSON.parse(raw);
          const filtered = sessions.filter((s: any) => s.uid !== uid);
          localStorage.setItem('abhyaas_device_saved_sessions', JSON.stringify(filtered));
        }
      } catch {}
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
  }
}

// ==========================================
// 3. SUBJECTS & LESSONS SERVICE
// ==========================================

export function subscribeSubjects(
  onUpdate: (subjects: SubjectItem[]) => void,
  onError?: (err: any) => void
): () => void {
  return onSnapshot(
    collection(db, 'subjects'),
    (snapshot) => {
      const items: SubjectItem[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        items.push({
          id: d.id,
          name: data.name,
          lessons: Array.isArray(data.lessons) ? data.lessons : [],
        });
      });

      if (items.length === 0) {
        // Automatically seed INITIAL_SUBJECTS in background if empty
        import('../data/seedData').then(({ INITIAL_SUBJECTS }) => {
          const fallbackList: SubjectItem[] = INITIAL_SUBJECTS.map((s, idx) => ({
            id: `seed_subj_${idx}_${s.name.toLowerCase()}`,
            name: s.name,
            lessons: s.lessons,
          }));
          onUpdate(fallbackList);
          syncLatestCbseSyllabus().catch(() => {});
        });
        return;
      }

      const SUBJECT_ORDER: Record<string, number> = {
        'mathematics': 1,
        'science': 2,
        'social science': 3,
        'english': 4,
        'hindi': 5,
        'computer & ai': 6,
        'computer': 6,
      };
      items.sort((a, b) => {
        const orderA = SUBJECT_ORDER[a.name.toLowerCase()] || 99;
        const orderB = SUBJECT_ORDER[b.name.toLowerCase()] || 99;
        return orderA - orderB || a.name.localeCompare(b.name);
      });
      onUpdate(items);
    },
    (err) => {
      // Fallback on offline or error
      import('../data/seedData').then(({ INITIAL_SUBJECTS }) => {
        const fallbackList: SubjectItem[] = INITIAL_SUBJECTS.map((s, idx) => ({
          id: `seed_subj_${idx}_${s.name.toLowerCase()}`,
          name: s.name,
          lessons: s.lessons,
        }));
        onUpdate(fallbackList);
      });
      if (onError) onError(err);
    }
  );
}

export async function addSubject(name: string): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'subjects'), {
      name: name.trim(),
      lessons: [],
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'subjects');
  }
}

export async function addLessonToSubject(
  subjectId: string,
  lessonName: string,
  gradeClass: string
): Promise<void> {
  try {
    const subjRef = doc(db, 'subjects', subjectId);
    const snap = await getDoc(subjRef);
    if (!snap.exists()) throw new Error('Subject not found');
    const existing = snap.data().lessons || [];
    existing.push({ name: lessonName.trim(), class: gradeClass.trim() });
    await updateDoc(subjRef, { lessons: existing });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `subjects/${subjectId}`);
  }
}

export async function deleteLessonFromSubject(
  subjectId: string,
  lessonIndex: number
): Promise<void> {
  try {
    const subjRef = doc(db, 'subjects', subjectId);
    const snap = await getDoc(subjRef);
    if (!snap.exists()) throw new Error('Subject not found');
    const existing: any[] = snap.data().lessons || [];
    existing.splice(lessonIndex, 1);
    await updateDoc(subjRef, { lessons: existing });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `subjects/${subjectId}`);
  }
}

export async function deleteSubject(subjectId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'subjects', subjectId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `subjects/${subjectId}`);
  }
}

// ==========================================
// 4. TEST RESULTS SERVICE
// ==========================================

export async function saveTestResult(result: Omit<TestResult, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'test_results'), {
      ...result,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'test_results');
  }
}

export function subscribeStudentTestResults(
  studentId: string,
  onUpdate: (results: TestResult[]) => void,
  onError?: (err: any) => void
): () => void {
  const q = query(
    collection(db, 'test_results'),
    where('studentId', '==', studentId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const results: TestResult[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        results.push({
          id: d.id,
          studentId: data.studentId,
          studentName: data.studentName,
          lesson: data.lesson,
          subject: data.subject,
          difficulty: data.difficulty,
          numberOfQs: data.numberOfQs,
          score: data.score,
          wrongCount: data.wrongCount,
          date: data.date,
          timeTakenSeconds: data.timeTakenSeconds,
          reviewItems: data.reviewItems || [],
        });
      });
      onUpdate(results);
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

// ==========================================
// 5. AI CHAT MESSAGES SERVICE (1-Week Auto-Retention)
// ==========================================

// Automatic 7-day (1 week) retention cleanup for student AI chat messages
export async function cleanupExpiredAIChatMessages(studentId: string): Promise<number> {
  if (!studentId) return 0;
  const sevenDaysAgo = new Date(Date.now() - MESSAGE_RETENTION_MS).toISOString();
  try {
    const colRef = collection(db, `ai_chats/${studentId}/messages`);
    const q = query(colRef, where('timestamp', '<', sevenDaysAgo), limit(100));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return 0;
    await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
    return snapshot.docs.length;
  } catch (err) {
    console.warn(`[Auto-Retention] AI chat cleanup note (${studentId}):`, err);
    return 0;
  }
}

export function subscribeAIChatMessages(
  studentId: string,
  onUpdate: (messages: AIChatMessage[]) => void,
  onError?: (err: any) => void
): () => void {
  // Fire-and-forget background cleanup of expired chat messages
  cleanupExpiredAIChatMessages(studentId).catch(() => {});

  const colRef = collection(db, `ai_chats/${studentId}/messages`);
  const q = query(colRef, orderBy('timestamp', 'asc'), limit(100));

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: AIChatMessage[] = [];
      const cutoffMs = Date.now() - MESSAGE_RETENTION_MS;

      snapshot.forEach((d) => {
        const data = d.data();
        const msgTime = new Date(data.timestamp).getTime();

        // 1-Week auto-retention safeguard:
        // Automatically delete messages older than 7 days and omit from UI
        if (!isNaN(msgTime) && msgTime < cutoffMs) {
          deleteDoc(d.ref).catch(() => {});
          return;
        }

        msgs.push({
          id: d.id,
          role: data.role,
          text: data.text,
          timestamp: data.timestamp,
          extractedQuestion: data.extractedQuestion,
          practiceQuestions: data.practiceQuestions,
        });
      });
      onUpdate(msgs);
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

export async function saveAIChatMessage(
  studentId: string,
  message: Omit<AIChatMessage, 'id'>
): Promise<string> {
  // Background check to keep history within 1 week
  cleanupExpiredAIChatMessages(studentId).catch(() => {});
  try {
    const colRef = collection(db, `ai_chats/${studentId}/messages`);
    const docRef = await addDoc(colRef, {
      ...message,
      serverCreated: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `ai_chats/${studentId}/messages`);
  }
}

export async function clearAIChatHistory(studentId: string): Promise<void> {
  try {
    const colRef = collection(db, `ai_chats/${studentId}/messages`);
    const snap = await getDocs(colRef);
    const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `ai_chats/${studentId}/messages`);
  }
}

// ==========================================
// 6. GAME SCORES SERVICE
// ==========================================

export function subscribeGameScores(
  studentId: string,
  onUpdate: (scores: GameScores) => void,
  onError?: (err: any) => void
): () => void {
  const docRef = doc(db, 'gameScores', studentId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        onUpdate({
          ms: d.ms || 0,
          ws: d.ws || 0,
          sn: d.sn || 0,
          ttt: Array.isArray(d.ttt) && d.ttt.length === 3 ? (d.ttt as [number, number, number]) : [0, 0, 0],
          updatedAt: d.updatedAt,
        });
      } else {
        onUpdate({ ms: 0, ws: 0, sn: 0, ttt: [0, 0, 0] });
      }
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

export async function updateGameHighScore(
  studentId: string,
  gameType: 'ms' | 'ws' | 'sn',
  newScore: number
): Promise<void> {
  try {
    const docRef = doc(db, 'gameScores', studentId);
    const snap = await getDoc(docRef);
    let currentHigh = 0;
    if (snap.exists()) {
      currentHigh = snap.data()[gameType] || 0;
    }
    if (newScore > currentHigh) {
      await setDoc(
        docRef,
        {
          [gameType]: newScore,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `gameScores/${studentId}`);
  }
}

export async function updateTicTacToeScore(
  studentId: string,
  result: 'win' | 'draw' | 'loss'
): Promise<void> {
  try {
    const docRef = doc(db, 'gameScores', studentId);
    const snap = await getDoc(docRef);
    let ttt = [0, 0, 0]; // [win, draw, loss]
    if (snap.exists() && Array.isArray(snap.data().ttt)) {
      ttt = snap.data().ttt;
    }
    if (result === 'win') ttt[0] += 1;
    else if (result === 'draw') ttt[1] += 1;
    else if (result === 'loss') ttt[2] += 1;

    await setDoc(
      docRef,
      {
        ttt,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `gameScores/${studentId}`);
  }
}

// Manually trigger complete CBSE Syllabus update from seedData
export async function syncLatestCbseSyllabus(): Promise<{ addedLessons: number; totalSubjects: number }> {
  try {
    const { INITIAL_SUBJECTS } = await import('../data/seedData');
    const subjectsSnap = await getDocs(collection(db, 'subjects'));
    const existingSubjectDocs = new Map<string, { id: string; lessons: any[] }>();
    subjectsSnap.forEach((d) => {
      const data = d.data();
      existingSubjectDocs.set((data.name || '').toLowerCase(), {
        id: d.id,
        lessons: Array.isArray(data.lessons) ? data.lessons : [],
      });
    });

    let addedLessonsCount = 0;

    for (const subj of INITIAL_SUBJECTS) {
      const existing = existingSubjectDocs.get(subj.name.toLowerCase());
      if (!existing) {
        await addDoc(collection(db, 'subjects'), {
          name: subj.name,
          lessons: subj.lessons,
        });
        addedLessonsCount += subj.lessons.length;
      } else {
        const existingKeys = new Set(existing.lessons.map((l: any) => `${l.name}__${l.class}`));
        const merged = [...existing.lessons];
        let hasNew = false;
        for (const l of subj.lessons) {
          const key = `${l.name}__${l.class}`;
          if (!existingKeys.has(key)) {
            merged.push(l);
            existingKeys.add(key);
            addedLessonsCount += 1;
            hasNew = true;
          }
        }
        if (hasNew) {
          await updateDoc(doc(db, 'subjects', existing.id), {
            lessons: merged,
          });
        }
      }
    }
    return { addedLessons: addedLessonsCount, totalSubjects: INITIAL_SUBJECTS.length };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'subjects');
  }
}

export async function resetTicTacToeScore(studentId: string): Promise<void> {
  try {
    const docRef = doc(db, 'gameScores', studentId);
    await setDoc(docRef, { ttt: [0, 0, 0] }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `gameScores/${studentId}`);
  }
}
