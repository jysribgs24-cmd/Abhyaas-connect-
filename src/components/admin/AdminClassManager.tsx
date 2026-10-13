import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  KeyRound,
  Upload,
  UserPlus,
  Check,
  AlertCircle,
  FileSpreadsheet,
  X,
  Search,
} from 'lucide-react';
import { ClassGroup, UserProfile } from '../../types';
import {
  createClass,
  updateClassGroupName,
  deleteClass,
  subscribeStudentsByClass,
  deleteUserAccount,
} from '../../lib/dataService';
import {
  createStudentAccount,
  resetUserPassword,
  isPasswordAlreadyUsed,
} from '../../lib/authService';

interface AdminClassManagerProps {
  classes: ClassGroup[];
  allStudents: UserProfile[];
  onShowCredentialsModal: (
    accounts: Array<{ name: string; username: string; password: string; className?: string; section?: string; rollNo?: string }>
  ) => void;
}

export const AdminClassManager: React.FC<AdminClassManagerProps> = ({
  classes,
  allStudents,
  onShowCredentialsModal,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [classStudents, setClassStudents] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassSection, setNewClassSection] = useState('A');
  const [newGroupName, setNewGroupName] = useState('');

  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [editGroupNameValue, setEditGroupNameValue] = useState('');

  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentUsername, setStudentUsername] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentRollNo, setStudentRollNo] = useState('');
  const [studentError, setStudentError] = useState<string | null>(null);
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);

  const [resetPassStudent, setResetPassStudent] = useState<UserProfile | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [resetPassError, setResetPassError] = useState<string | null>(null);

  const [isCsvUploadOpen, setIsCsvUploadOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [csvProgress, setCsvProgress] = useState<{ current: number; total: number } | null>(null);

  // In-app deletion confirmation states (no window.confirm)
  const [classToDelete, setClassToDelete] = useState<ClassGroup | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleConfirmDeleteClass = async () => {
    if (!classToDelete) return;
    setIsDeleting(true);
    try {
      await deleteClass(classToDelete.id, true, classToDelete.className, classToDelete.section);
      if (selectedClassId === classToDelete.id) {
        const remaining = classes.filter((c) => c.id !== classToDelete.id);
        setSelectedClassId(remaining.length > 0 ? remaining[0].id : '');
      }
      setToastMessage(`Class ${classToDelete.className} ${classToDelete.section} deleted successfully.`);
      setTimeout(() => setToastMessage(null), 3500);
      setClassToDelete(null);
    } catch (err: any) {
      setToastMessage(err.message || 'Failed to delete class');
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    setIsDeleting(true);
    try {
      await deleteUserAccount(studentToDelete.uid);
      setClassStudents((prev) => prev.filter((s) => s.uid !== studentToDelete.uid));
      setToastMessage(`Student "${studentToDelete.name}" deleted successfully.`);
      setTimeout(() => setToastMessage(null), 3500);
      setStudentToDelete(null);
    } catch (err: any) {
      setToastMessage(err.message || 'Failed to delete student');
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setIsDeleting(false);
    }
  };

  // Set default selection
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  const currentClass = classes.find((c) => c.id === selectedClassId) || classes[0];

  // Subscribe to students of selected class
  useEffect(() => {
    if (!currentClass) return;
    setEditGroupNameValue(currentClass.groupName);
    const unsub = subscribeStudentsByClass(
      currentClass.className,
      currentClass.section,
      (students) => setClassStudents(students)
    );
    return () => unsub();
  }, [currentClass?.className, currentClass?.section]);

  // Student count map per class
  const studentCountMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    allStudents.forEach((s) => {
      const key = `${s.className}-${s.section}`;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [allStudents]);

  // Filtered students by search term
  const filteredStudents = classStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rollNo.includes(searchTerm)
  );

  // Create New Class Handler
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !newClassSection.trim() || !newGroupName.trim()) return;

    try {
      const id = await createClass(newClassName, newClassSection, newGroupName);
      setSelectedClassId(id);
      setIsCreateClassOpen(false);
      setNewClassName('');
      setNewGroupName('');
    } catch (err: any) {
      alert(err.message || 'Failed to create class');
    }
  };

  // Update Group Name Handler
  const handleSaveGroupName = async () => {
    if (!currentClass || !editGroupNameValue.trim()) return;
    try {
      await updateClassGroupName(currentClass.id, editGroupNameValue.trim());
      setIsEditingGroupName(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update group name');
    }
  };

  // Single Add Student Handler
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !studentUsername || !studentPassword || !studentRollNo || !currentClass) {
      setStudentError('All fields are required.');
      return;
    }

    setStudentError(null);
    setIsCreatingStudent(true);

    try {
      await createStudentAccount({
        name: studentName,
        username: studentUsername,
        password: studentPassword,
        className: currentClass.className,
        section: currentClass.section,
        rollNo: studentRollNo,
      });

      // Show 10-second password reveal modal
      onShowCredentialsModal([
        {
          name: studentName,
          username: studentUsername,
          password: studentPassword,
          className: currentClass.className,
          section: currentClass.section,
          rollNo: studentRollNo,
        },
      ]);

      setIsAddStudentOpen(false);
      setStudentName('');
      setStudentUsername('');
      setStudentPassword('');
      setStudentRollNo('');
    } catch (err: any) {
      setStudentError(err.message || 'Failed to create student account');
    } finally {
      setIsCreatingStudent(false);
    }
  };

  // Reset Password Handler
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassStudent || !newPasswordValue.trim()) return;

    setResetPassError(null);
    try {
      await resetUserPassword(resetPassStudent.uid, newPasswordValue.trim());

      onShowCredentialsModal([
        {
          name: resetPassStudent.name,
          username: resetPassStudent.username,
          password: newPasswordValue.trim(),
          className: resetPassStudent.className,
          section: resetPassStudent.section,
          rollNo: resetPassStudent.rollNo,
        },
      ]);

      setResetPassStudent(null);
      setNewPasswordValue('');
    } catch (err: any) {
      setResetPassError(err.message || 'Failed to reset password');
    }
  };

  // CSV Bulk Upload Handler
  const handleProcessCsv = async () => {
    if (!csvContent.trim() || !currentClass) return;

    setIsProcessingCsv(true);
    setCsvErrors([]);

    const lines = csvContent
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // Skip header line if starts with Name
    const dataLines = lines[0].toLowerCase().includes('name') ? lines.slice(1) : lines;
    const total = dataLines.length;
    setCsvProgress({ current: 0, total });

    const createdAccounts: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < total; i++) {
      const line = dataLines[i];
      const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));

      if (cols.length < 4) {
        errors.push(`Row ${i + 1}: Insufficient columns. Required format: Name,Username,Password,RollNo`);
        setCsvProgress({ current: i + 1, total });
        continue;
      }

      const [name, username, password, rollNo] = cols;

      try {
        await createStudentAccount({
          name,
          username,
          password,
          className: currentClass.className,
          section: currentClass.section,
          rollNo,
        });

        createdAccounts.push({
          name,
          username,
          password,
          className: currentClass.className,
          section: currentClass.section,
          rollNo,
        });
      } catch (err: any) {
        errors.push(`Row ${i + 1} (${name}): ${err.message || 'Failed'}`);
      }

      setCsvProgress({ current: i + 1, total });
    }

    setCsvErrors(errors);
    setIsProcessingCsv(false);

    if (createdAccounts.length > 0) {
      onShowCredentialsModal(createdAccounts);
      setCsvContent('');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full rounded-2xl border overflow-hidden bg-[var(--card-main)] border-[var(--border-main)] shadow-xl">
      {/* 30% Left Column: WhatsApp-style Class List */}
      <div className="w-full lg:w-[32%] border-b lg:border-b-0 lg:border-r border-[var(--border-main)] flex flex-col bg-[var(--card-main)]">
        {/* Top Header */}
        <div className="p-4 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--raised-main)]">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <span className="font-bold text-sm">Class Groups</span>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateClassOpen(true)}
            className="px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] hover:opacity-90 flex items-center gap-1 active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Class</span>
          </button>
        </div>

        {/* Classes List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-main)]">
          {classes.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--text-muted)]">
              No classes created yet.
            </div>
          ) : (
            classes.map((cls) => {
              const count = studentCountMap[`${cls.className}-${cls.section}`] || 0;
              const isSelected = cls.id === currentClass?.id;

              return (
                <div
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors group ${
                    isSelected
                      ? 'bg-[var(--raised-main)] border-l-4 border-white'
                      : 'hover:bg-[var(--raised-main)]/60'
                  }`}
                >
                  <div className="min-w-0 pr-2 flex-1">
                    <h4 className="font-bold text-xs sm:text-sm truncate">
                      {cls.groupName || `${cls.className} ${cls.section}`}
                    </h4>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      Class {cls.className} • Section {cls.section}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--border-main)] text-[var(--text-main)]">
                      {count}
                    </span>
                    <button
                      type="button"
                      title="Delete Class"
                      onClick={(e) => {
                        e.stopPropagation();
                        setClassToDelete(cls);
                      }}
                      className="p-1.5 rounded-md hover:bg-red-500/15 text-[var(--text-muted)] hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 70% Right Column: Selected Class Students Table & Controls */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--card-main)]">
        {currentClass ? (
          <>
            {/* Header of selected class */}
            <div className="p-4 border-b border-[var(--border-main)] flex flex-wrap items-center justify-between gap-3 bg-[var(--raised-main)]">
              <div className="flex items-center gap-2 min-w-0">
                {isEditingGroupName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editGroupNameValue}
                      onChange={(e) => setEditGroupNameValue(e.target.value)}
                      className="px-3 py-1 rounded-xl text-sm border bg-[var(--card-main)] border-[var(--border-main)] text-[var(--text-main)] outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleSaveGroupName}
                      className="p-1.5 rounded-lg bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)]"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingGroupName(false)}
                      className="p-1.5 rounded-lg border border-[var(--border-main)] text-[var(--text-muted)]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base sm:text-lg tracking-tight truncate">
                      {currentClass.groupName}
                    </h2>
                    <button
                      type="button"
                      title="Edit Group Name"
                      onClick={() => setIsEditingGroupName(true)}
                      className="p-1 rounded-lg hover:bg-[var(--card-main)] text-[var(--text-muted)] hover:text-white transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCsvUploadOpen(true)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border border-[var(--border-main)] hover:bg-[var(--card-main)] flex items-center gap-1.5 transition-colors text-[var(--text-main)] cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>CSV Upload</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(true)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] hover:opacity-90 flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Student</span>
                </button>

                <button
                  type="button"
                  title="Delete this class"
                  onClick={() => setClassToDelete(currentClass)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/15 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete Class</span>
                </button>
              </div>
            </div>

            {/* Filter Search Bar */}
            <div className="p-3 border-b border-[var(--border-main)]">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Filter students in this class by name, roll no, or username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border outline-hidden bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>

            {/* Students Table */}
            <div className="flex-1 overflow-x-auto overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--raised-main)]/60 text-[var(--text-muted)] border-b border-[var(--border-main)] uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Roll</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-4">Internal Auth Email</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-main)]">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[var(--text-muted)]">
                        No students enrolled in Class {currentClass.className} {currentClass.section} yet. Click &quot;Add Student&quot; or &quot;CSV Upload&quot; to enroll.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st) => (
                      <tr key={st.uid} className="hover:bg-[var(--raised-main)]/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold">{st.rollNo}</td>
                        <td className="py-3 px-4 font-semibold text-[var(--text-main)]">
                          {st.name}
                        </td>
                        <td className="py-3 px-4 font-mono text-[var(--text-muted)]">
                          @{st.username}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[var(--text-muted)]">
                          {st.internalEmail}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                          <button
                            type="button"
                            title="Reset Password"
                            onClick={() => {
                              setResetPassStudent(st);
                              setNewPasswordValue('');
                              setResetPassError(null);
                            }}
                            className="p-1.5 rounded-lg border border-[var(--border-main)] hover:bg-[var(--raised-main)] text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Delete Student"
                            onClick={() => setStudentToDelete(st)}
                            className="p-1.5 rounded-lg border border-[var(--border-main)] hover:bg-red-500/15 text-[var(--text-muted)] hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-[var(--text-muted)]">
            Select or create a class to manage students.
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: CREATE NEW CLASS */}
      {/* ======================================================== */}
      {isCreateClassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl p-6 border shadow-2xl bg-[var(--card-main)] border-[var(--border-main)] text-[var(--text-main)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-main)]">
              <h3 className="font-bold text-base">Create New Class</h3>
              <button
                type="button"
                onClick={() => setIsCreateClassOpen(false)}
                className="p-1 rounded-full text-[var(--text-muted)] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                  Class Name (e.g. 10th, 9th, 8th)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10th"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-main)] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                  Section (e.g. A, B, C)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A"
                  value={newClassSection}
                  onChange={(e) => setNewClassSection(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-main)] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                  Group Display Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10th A — Champions"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-main)] outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateClassOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold border border-[var(--border-main)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full text-xs font-bold bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)]"
                >
                  Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: ADD STUDENT */}
      {/* ======================================================== */}
      {isAddStudentOpen && currentClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl p-6 border shadow-2xl bg-[var(--card-main)] border-[var(--border-main)] text-[var(--text-main)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-main)]">
              <div>
                <h3 className="font-bold text-base">Add Student to Class {currentClass.className} {currentClass.section}</h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Username may repeat. Password must be unique across all students.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddStudentOpen(false)}
                className="p-1 rounded-full text-[var(--text-muted)] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {studentError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{studentError}</span>
              </div>
            )}

            <form onSubmit={handleAddStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-main)] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                  Username (may repeat, e.g. rahul)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. rahul"
                  value={studentUsername}
                  onChange={(e) => setStudentUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-main)] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                  Password (must be unique across all accounts)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. rahul@9812"
                  value={studentPassword}
                  onChange={(e) => setStudentPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-main)] outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                  Roll Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 14"
                  value={studentRollNo}
                  onChange={(e) => setStudentRollNo(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-main)] outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold border border-[var(--border-main)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingStudent}
                  className="px-5 py-2 rounded-full text-xs font-bold bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] disabled:opacity-50"
                >
                  {isCreatingStudent ? 'Creating...' : 'Create Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: RESET PASSWORD */}
      {/* ======================================================== */}
      {resetPassStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl p-6 border shadow-2xl bg-[var(--card-main)] border-[var(--border-main)] text-[var(--text-main)] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
              <h3 className="font-bold text-sm">Reset Password</h3>
              <button
                type="button"
                onClick={() => setResetPassStudent(null)}
                className="p-1 rounded-full text-[var(--text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              Enter a new unique password for <strong>{resetPassStudent.name}</strong> (@{resetPassStudent.username}).
            </p>

            {resetPassError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs">
                {resetPassError}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3">
              <input
                type="text"
                required
                placeholder="New unique password..."
                value={newPasswordValue}
                onChange={(e) => setNewPasswordValue(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs border bg-[var(--raised-main)] border-[var(--border-main)] font-mono outline-hidden"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPassStudent(null)}
                  className="px-4 py-2 rounded-full text-xs font-semibold border border-[var(--border-main)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full text-xs font-bold bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)]"
                >
                  Reset & View (10s)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: CSV BULK UPLOAD */}
      {/* ======================================================== */}
      {isCsvUploadOpen && currentClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl p-6 border shadow-2xl bg-[var(--card-main)] border-[var(--border-main)] text-[var(--text-main)] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-main)]">
              <div>
                <h3 className="font-bold text-base">Bulk Enroll Students (CSV)</h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Target Class: Class {currentClass.className} {currentClass.section}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCsvUploadOpen(false)}
                className="p-1 rounded-full text-[var(--text-muted)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl border bg-[var(--raised-main)] border-[var(--border-main)] text-xs text-[var(--text-muted)] space-y-1">
              <span className="font-bold text-[var(--text-main)] block">Required CSV Format:</span>
              <p className="font-mono text-[11px] text-indigo-300">
                Name,Username,Password,RollNo
              </p>
              <p className="text-[11px]">
                Example:<br />
                Aarav Patel,aarav,aarav#781,01<br />
                Diya Nair,diya,diya#442,02<br />
                Rohan Gupta,rohan,rohan#918,03
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                Paste CSV Lines or Drag File
              </label>
              <textarea
                rows={6}
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder="Aarav Patel,aarav,aarav#781,01&#10;Diya Nair,diya,diya#442,02"
                className="w-full p-3 rounded-2xl text-xs border font-mono bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-main)] outline-hidden"
              />
            </div>

            {/* Progress bar */}
            {csvProgress && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-[var(--text-muted)]">
                  <span>Processing...</span>
                  <span>{csvProgress.current} / {csvProgress.total}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[var(--border-main)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent-pill-bg)] transition-all"
                    style={{ width: `${(csvProgress.current / csvProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error report */}
            {csvErrors.length > 0 && (
              <div className="p-3 rounded-2xl border bg-red-500/10 border-red-500/30 text-red-300 text-xs space-y-1 max-h-36 overflow-y-auto">
                <span className="font-bold block">Failed Rows Report:</span>
                {csvErrors.map((err, i) => (
                  <p key={i}>• {err}</p>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCsvUploadOpen(false)}
                className="px-4 py-2 rounded-full text-xs font-semibold border border-[var(--border-main)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!csvContent.trim() || isProcessingCsv}
                onClick={handleProcessCsv}
                className="px-5 py-2 rounded-full text-xs font-bold bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] disabled:opacity-50"
              >
                {isProcessingCsv ? 'Processing...' : 'Upload & Enroll'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Class Confirmation Modal */}
      {classToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl p-6 border shadow-2xl bg-[var(--card-main)] border-[var(--border-main)] text-[var(--text-main)] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
              <div className="flex items-center gap-2 text-red-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-bold text-base">Delete Class</h3>
              </div>
              <button
                type="button"
                onClick={() => setClassToDelete(null)}
                className="p-1 rounded-full text-[var(--text-muted)] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-[var(--text-main)] font-semibold">
                Are you sure you want to delete <span className="font-bold text-white">Class {classToDelete.className} {classToDelete.section}</span> ({classToDelete.groupName})?
              </p>
              <p className="text-[var(--text-muted)]">
                This will delete the class group from the school portal. This action cannot be undone.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setClassToDelete(null)}
                className="px-4 py-2 rounded-full text-xs font-semibold border border-[var(--border-main)] hover:bg-[var(--raised-main)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteClass}
                className="px-5 py-2 rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Class'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Student Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl p-6 border shadow-2xl bg-[var(--card-main)] border-[var(--border-main)] text-[var(--text-main)] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
              <div className="flex items-center gap-2 text-red-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-bold text-base">Delete Student Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="p-1 rounded-full text-[var(--text-muted)] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-[var(--text-main)] font-semibold">
                Are you sure you want to permanently delete <span className="font-bold text-white">{studentToDelete.name}</span> (Roll: {studentToDelete.rollNo}, @{studentToDelete.username})?
              </p>
              <p className="text-[var(--text-muted)]">
                The student will no longer be able to sign in, and their profile will be removed from Class {studentToDelete.className} {studentToDelete.section}.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 rounded-full text-xs font-semibold border border-[var(--border-main)] hover:bg-[var(--raised-main)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteStudent}
                className="px-5 py-2 rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Student'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-[var(--raised-main)] border border-[var(--border-main)] shadow-2xl text-xs font-semibold text-emerald-400 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
