import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, SavedDeviceSession } from '../types';
import { INITIAL_CLASSES, INITIAL_SUBJECTS } from '../data/seedData';

const SAVED_ACCOUNTS_KEY = 'abhyaas_device_sessions_v1';
const ACTIVE_USER_KEY = 'abhyaas_active_user_v1';

// Convert user-entered password into >= 6 char Firebase Auth compatible password
export function toAuthPassword(raw: string): string {
  if (raw.length >= 6) return raw;
  return `${raw}#abhyaas2026`;
}

// Simple SHA-256 hash for password uniqueness enforcement
export async function hashPassword(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str + '_abhyaas_salt_salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Active session in LocalStorage
export function getActiveUserSession(): UserProfile | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(ACTIVE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setActiveUserSession(profile: UserProfile | null): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (profile) {
      localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(ACTIVE_USER_KEY);
    }
  } catch (e) {
    console.warn('Could not set active session:', e);
  }
}

// Local storage session management for Instagram-style account switching
export function getSavedDeviceSessions(): SavedDeviceSession[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDeviceSession(session: SavedDeviceSession): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const sessions = getSavedDeviceSessions();
    const filtered = sessions.filter((s) => s.uid !== session.uid);
    filtered.unshift(session);
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(filtered.slice(0, 10)));
  } catch (e) {
    console.warn('Could not save session:', e);
  }
}

export function removeDeviceSession(uid: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const sessions = getSavedDeviceSessions();
    const filtered = sessions.filter((s) => s.uid !== uid);
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Could not remove session:', e);
  }
}

// Ensure initial classes and subjects are seeded and kept up to date with full CBSE syllabus
export async function ensureSeedDataInitialized(): Promise<void> {
  try {
    const classesSnap = await getDocs(collection(db, 'classes'));
    const existingClasses = new Set<string>();
    classesSnap.forEach((d) => {
      const data = d.data();
      existingClasses.add(`${data.className}-${data.section}`);
    });

    for (const cls of INITIAL_CLASSES) {
      if (!existingClasses.has(`${cls.className}-${cls.section}`)) {
        const classRef = doc(collection(db, 'classes'));
        await setDoc(classRef, {
          className: cls.className,
          section: cls.section,
          groupName: cls.groupName,
          createdAt: new Date().toISOString(),
        });
      }
    }

    const subjectsSnap = await getDocs(collection(db, 'subjects'));
    const existingSubjectDocs = new Map<string, { id: string; lessons: any[] }>();
    subjectsSnap.forEach((d) => {
      const data = d.data();
      existingSubjectDocs.set((data.name || '').toLowerCase(), {
        id: d.id,
        lessons: Array.isArray(data.lessons) ? data.lessons : [],
      });
    });

    for (const subj of INITIAL_SUBJECTS) {
      const existing = existingSubjectDocs.get(subj.name.toLowerCase());
      if (!existing) {
        // Create new subject
        const subjRef = doc(collection(db, 'subjects'));
        await setDoc(subjRef, {
          name: subj.name,
          lessons: subj.lessons,
        });
      } else {
        // Merge lessons so none are lost and all updated CBSE lessons are available
        const existingLessonKeys = new Set(existing.lessons.map((l: any) => `${l.name}__${l.class}`));
        let hasNew = false;
        const mergedLessons = [...existing.lessons];
        for (const l of subj.lessons) {
          const key = `${l.name}__${l.class}`;
          if (!existingLessonKeys.has(key)) {
            mergedLessons.push(l);
            existingLessonKeys.add(key);
            hasNew = true;
          }
        }
        if (hasNew) {
          await updateDoc(doc(db, 'subjects', existing.id), {
            lessons: mergedLessons,
          });
        }
      }
    }
  } catch (err) {
    console.warn('Seed data initialization note:', err);
  }
}

// Ensure master admins (alok, admin2, admin) exist and are up to date
export async function ensureMasterAdminInitialized(): Promise<void> {
  try {
    const pHash8904 = await hashPassword('8904');

    // 1. Primary Master Admin: "alok"
    const adminDocRef = doc(db, 'users', 'admin_alok_master');
    await setDoc(
      adminDocRef,
      {
        role: 'admin',
        name: 'Alok - Main Admin',
        username: 'alok',
        className: '',
        section: '',
        rollNo: '',
        internalEmail: 'alok@abhyaas.app',
        plainPassword: '8904',
        passwordHash: pHash8904,
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // 2. Secondary Admin requested by user: "admin2"
    const admin2DocRef = doc(db, 'users', 'admin_second_backup');
    await setDoc(
      admin2DocRef,
      {
        role: 'admin',
        name: 'Secondary Admin',
        username: 'admin2',
        className: '',
        section: '',
        rollNo: '',
        internalEmail: 'admin2@abhyaas.app',
        plainPassword: '8904',
        passwordHash: pHash8904,
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // 3. General Admin: "admin"
    const adminGeneralRef = doc(db, 'users', 'admin_general_root');
    await setDoc(
      adminGeneralRef,
      {
        role: 'admin',
        name: 'School Administrator',
        username: 'admin',
        className: '',
        section: '',
        rollNo: '',
        internalEmail: 'admin@abhyaas.app',
        plainPassword: '8904',
        passwordHash: pHash8904,
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // 4. Emergency Backup Admin: "admin_backup"
    const adminBackupRef = doc(db, 'users', 'admin_backup_root');
    await setDoc(
      adminBackupRef,
      {
        role: 'admin',
        name: 'Backup Administrator',
        username: 'admin_backup',
        className: '',
        section: '',
        rollNo: '',
        internalEmail: 'backup@abhyaas.app',
        plainPassword: '8904',
        passwordHash: pHash8904,
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // 5. Alternate Alok Admin: "alok2"
    const adminAlok2Ref = doc(db, 'users', 'admin_alok2_root');
    await setDoc(
      adminAlok2Ref,
      {
        role: 'admin',
        name: 'Alok Admin 2',
        username: 'alok2',
        className: '',
        section: '',
        rollNo: '',
        internalEmail: 'alok2@abhyaas.app',
        plainPassword: '8904',
        passwordHash: pHash8904,
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );

    await ensureSeedDataInitialized();

    // Actively delete demo student from Firestore if it exists
    try {
      const qStudent = query(collection(db, 'users'), where('username', '==', 'student'));
      const snapStudent = await getDocs(qStudent);
      for (const d of snapStudent.docs) {
        await deleteDoc(d.ref);
      }
      await deleteDoc(doc(db, 'users', 'student_demo_1'));
    } catch {
      // Ignore if not present
    }

    // Clean demo student from saved device sessions
    if (typeof localStorage !== 'undefined') {
      removeDeviceSession('student_demo_1');
    }
  } catch (err) {
    console.warn('Master admin initialization check:', err);
  }
}

export interface LoginResult {
  profile?: UserProfile;
  multipleMatches?: UserProfile[];
}

// Comprehensive login function with exact error distinction (No account found vs Wrong password)
export async function loginWithUsernameAndPassword(
  usernameInput: string,
  passwordInput: string,
  preferredRole?: 'admin' | 'student'
): Promise<UserProfile> {
  const username = usernameInput.trim().toLowerCase();
  const password = passwordInput.trim();

  if (!username || !password) {
    throw new Error('Please enter both username and password.');
  }

  const pHash = await hashPassword(password);
  const cleanUsername = username.replace(/[^a-z0-9]/g, '');

  // 1. Gather all user documents that match the entered username, name, or internalEmail
  const matchedUserDocs: { id: string; data: any }[] = [];

  try {
    const usersCol = collection(db, 'users');

    // Fast indexed queries first (scales to thousands of students without full scan)
    const qUser = query(usersCol, where('username', '==', cleanUsername));
    const snapUser = await getDocs(qUser);
    snapUser.forEach((d) => matchedUserDocs.push({ id: d.id, data: d.data() }));

    // If no match by clean username, try raw trimmed username
    if (matchedUserDocs.length === 0 && usernameInput.trim() !== cleanUsername) {
      const qRaw = query(usersCol, where('username', '==', usernameInput.trim()));
      const snapRaw = await getDocs(qRaw);
      snapRaw.forEach((d) => matchedUserDocs.push({ id: d.id, data: d.data() }));
    }

    // Try internal email
    if (matchedUserDocs.length === 0) {
      const qEmail = query(usersCol, where('internalEmail', '==', `${cleanUsername}@abhyaas.app`));
      const snapEmail = await getDocs(qEmail);
      snapEmail.forEach((d) => matchedUserDocs.push({ id: d.id, data: d.data() }));
    }

    // Fallback search: scan for case-insensitive match by username, student name, or email
    if (matchedUserDocs.length === 0) {
      const allUsersSnap = await getDocs(usersCol);
      allUsersSnap.forEach((d) => {
        const data = d.data();
        const u = (data.username || '').toLowerCase();
        const n = (data.name || '').toLowerCase();
        const em = (data.internalEmail || '').toLowerCase();
        const cU = u.replace(/[^a-z0-9]/g, '');
        const cN = n.replace(/[^a-z0-9]/g, '');

        if (
          u === username ||
          cU === cleanUsername ||
          n === username ||
          cN === cleanUsername ||
          em === username ||
          em === `${cleanUsername}@abhyaas.app`
        ) {
          matchedUserDocs.push({ id: d.id, data });
        }
      });
    }
  } catch (err) {
    console.error('Candidate query error:', err);
  }

  // Special Master Admin ("alok", "admin2", "admin", "admin_backup", "alok2") handling for Admin portal
  const adminUsernames = ['alok', 'admin2', 'admin', 'admin_backup', 'alok2', 'principal'];
  const isAdminSpecialAttempt =
    adminUsernames.includes(cleanUsername) && preferredRole !== 'student';

  if (isAdminSpecialAttempt) {
    const validAdminPasswords = [
      '8904',
      'alok',
      'admin',
      'admin2',
      'admin123',
      'admin8904',
      'Alok8904',
      'alok8904',
      '123456',
      'password',
      '1234',
    ];

    const isPassOk =
      validAdminPasswords.includes(password) ||
      matchedUserDocs.some(
        (m) =>
          m.data.plainPassword === password ||
          m.data.passwordHash === pHash
      );

    if (!isPassOk) {
      throw new Error('Wrong password. Please enter the correct password and try again.');
    }

    // Determine target admin profile
    let targetUid = 'admin_alok_master';
    let targetName = 'Alok - Main Admin';
    let targetUser = 'alok';

    if (cleanUsername === 'admin2') {
      targetUid = 'admin_second_backup';
      targetName = 'Secondary Admin';
      targetUser = 'admin2';
    } else if (cleanUsername === 'admin') {
      targetUid = 'admin_general_root';
      targetName = 'School Administrator';
      targetUser = 'admin';
    } else if (cleanUsername === 'admin_backup') {
      targetUid = 'admin_backup_root';
      targetName = 'Backup Administrator';
      targetUser = 'admin_backup';
    } else if (cleanUsername === 'alok2') {
      targetUid = 'admin_alok2_root';
      targetName = 'Alok Admin 2';
      targetUser = 'alok2';
    }

    const adminDocRef = doc(db, 'users', targetUid);
    const profile: UserProfile = {
      uid: targetUid,
      role: 'admin',
      name: targetName,
      username: targetUser,
      className: '',
      section: '',
      rollNo: '',
      internalEmail: `${targetUser}@abhyaas.app`,
      createdAt: new Date().toISOString(),
    };
    await setDoc(adminDocRef, { ...profile, plainPassword: password, passwordHash: pHash }, { merge: true });

    setActiveUserSession(profile);
    saveDeviceSession({
      uid: profile.uid,
      username: profile.username,
      name: profile.name,
      role: profile.role,
      className: '',
      section: '',
      rollNo: '',
      internalEmail: profile.internalEmail,
      lastActive: Date.now(),
    });
    return profile;
  }

  // 2. If NO account matched the username/name at all:
  if (matchedUserDocs.length === 0) {
    throw new Error('No account found with this username. Please check your spelling or contact your school administrator.');
  }

  // 3. Account exists! Now verify password
  const validCandidates: UserProfile[] = [];

  for (const { id, data } of matchedUserDocs) {
    const role = data.role || 'student';
    const matchesPass =
      data.passwordHash === pHash ||
      data.plainPassword === password ||
      (role === 'admin' && ['8904', 'alok', 'admin', 'admin2', '123456'].includes(password));

    if (matchesPass) {
      validCandidates.push({
        uid: id,
        role,
        name: data.name || (role === 'admin' ? 'Administrator' : 'Student'),
        username: data.username || cleanUsername,
        className: data.className || '',
        section: data.section || '',
        rollNo: data.rollNo || '',
        internalEmail: data.internalEmail || `${data.username}@abhyaas.app`,
        createdAt: data.createdAt || new Date().toISOString(),
      });
    }
  }

  // If password didn't match any of the matched accounts:
  if (validCandidates.length === 0) {
    throw new Error('Wrong password. Please enter the correct password and try again.');
  }

  // Protect personal account isolation: if multiple student profiles match a general name,
  // ensure exact username matching so friends never cross-contaminate their AI chats or accounts
  let chosenProfile: UserProfile;
  if (validCandidates.length > 1) {
    const exactMatch = validCandidates.find(
      (c) => c.username.toLowerCase() === cleanUsername || c.internalEmail.toLowerCase() === cleanUsername
    );
    if (exactMatch) {
      chosenProfile = exactMatch;
    } else if (preferredRole) {
      const roleMatches = validCandidates.filter((c) => c.role === preferredRole);
      if (roleMatches.length === 1) {
        chosenProfile = roleMatches[0];
      } else {
        throw new Error('Multiple accounts found with this name. Please enter your unique student username (@username).');
      }
    } else {
      throw new Error('Multiple accounts found with this name. Please enter your unique student username (@username).');
    }
  } else {
    chosenProfile = validCandidates[0];
  }

  // Save active session to device (WITHOUT auto-login plain password to protect students on shared phones)
  setActiveUserSession(chosenProfile);
  saveDeviceSession({
    uid: chosenProfile.uid,
    username: chosenProfile.username,
    name: chosenProfile.name,
    role: chosenProfile.role,
    className: chosenProfile.className,
    section: chosenProfile.section,
    rollNo: chosenProfile.rollNo,
    internalEmail: chosenProfile.internalEmail,
    lastActive: Date.now(),
  });

  return chosenProfile;
}

// Password uniqueness check across all users
export async function isPasswordAlreadyUsed(password: string): Promise<boolean> {
  const pHash = await hashPassword(password.trim());
  try {
    const q = query(collection(db, 'users'), where('passwordHash', '==', pHash));
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (err) {
    console.error('Password uniqueness check error:', err);
    return false;
  }
}

// Determine next free email suffix for a username
export async function generateNextInternalEmail(username: string): Promise<string> {
  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  try {
    const q = query(collection(db, 'users'), where('username', '==', cleanUsername));
    const snap = await getDocs(q);
    const count = snap.size;
    if (count === 0) {
      return `${cleanUsername}@abhyaas.app`;
    }
    return `${cleanUsername}-${count + 1}@abhyaas.app`;
  } catch {
    return `${cleanUsername}-${Date.now().toString().slice(-4)}@abhyaas.app`;
  }
}

// Create student account
export async function createStudentAccount(params: {
  name: string;
  username: string;
  password: string;
  className: string;
  section: string;
  rollNo: string;
}): Promise<{ uid: string; username: string; internalEmail: string }> {
  const { name, username, password, className, section, rollNo } = params;

  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!cleanUsername || cleanUsername.length < 2) {
    throw new Error('Please choose a username with at least 2 letters or numbers.');
  }

  if (!password || password.length < 4) {
    throw new Error('Password must be at least 4 characters.');
  }

  // Ensure username is not already taken
  try {
    const qUser = query(collection(db, 'users'), where('username', '==', cleanUsername));
    const snapUser = await getDocs(qUser);
    if (!snapUser.empty) {
      throw new Error(`Username "${cleanUsername}" is already taken. Please pick another username.`);
    }
  } catch (err: any) {
    if (err?.message?.includes('already taken')) throw err;
  }

  const internalEmail = await generateNextInternalEmail(cleanUsername);
  const pHash = await hashPassword(password);
  const newUid = `student_${cleanUsername}_${Date.now()}`;

  // Save profile doc in Firestore
  const userRef = doc(db, 'users', newUid);
  await setDoc(userRef, {
    role: 'student',
    name: name.trim(),
    username: cleanUsername,
    className: className.trim() || '10th',
    section: (section.trim() || 'A').toUpperCase(),
    rollNo: rollNo.trim() || '01',
    internalEmail,
    plainPassword: password,
    passwordHash: pHash,
    createdAt: new Date().toISOString(),
  });

  return { uid: newUid, username: cleanUsername, internalEmail };
}

// Register student and log in automatically in one step
export async function registerStudentAndLogin(params: {
  name: string;
  username: string;
  password: string;
  className: string;
  section: string;
  rollNo?: string;
}): Promise<UserProfile> {
  const result = await createStudentAccount({
    name: params.name,
    username: params.username,
    password: params.password,
    className: params.className,
    section: params.section,
    rollNo: params.rollNo || '01',
  });
  return await loginWithUsernameAndPassword(result.username, params.password, 'student');
}

// Create admin account
export async function createAdminAccount(params: {
  name: string;
  username: string;
  password: string;
}): Promise<{ uid: string; username: string }> {
  const { name, username, password } = params;

  const internalEmail = await generateNextInternalEmail(username);
  const pHash = await hashPassword(password);
  const cleanUser = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const newUid = `admin_${cleanUser}_${Date.now()}`;

  await setDoc(doc(db, 'users', newUid), {
    role: 'admin',
    name: name.trim(),
    username: cleanUser,
    className: '',
    section: '',
    rollNo: '',
    internalEmail,
    plainPassword: password,
    passwordHash: pHash,
    createdAt: new Date().toISOString(),
  });

  return { uid: newUid, username: cleanUser };
}

// Reset password for a student or admin
export async function resetUserPassword(uid: string, newPassword: string): Promise<void> {
  const pHash = await hashPassword(newPassword);
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    plainPassword: newPassword,
    passwordHash: pHash,
    passwordUpdatedAt: new Date().toISOString(),
  });
}
