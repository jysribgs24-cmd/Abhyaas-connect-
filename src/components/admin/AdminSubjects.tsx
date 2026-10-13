import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  X,
  Search,
  BookPlus,
  GraduationCap,
  RefreshCw,
  Check,
} from 'lucide-react';
import { SubjectItem } from '../../types';
import {
  addSubject,
  addLessonToSubject,
  deleteLessonFromSubject,
  deleteSubject,
  syncLatestCbseSyllabus,
} from '../../lib/dataService';

interface AdminSubjectsProps {
  subjects: SubjectItem[];
}

const ALL_CLASSES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'All'];

export const AdminSubjects: React.FC<AdminSubjectsProps> = ({ subjects }) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [lessonSearch, setLessonSearch] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');

  // Modals state
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  const [isAddLessonOpen, setIsAddLessonOpen] = useState(false);
  const [newLessonName, setNewLessonName] = useState('');
  const [newLessonClass, setNewLessonClass] = useState('10');
  const [subjectToDelete, setSubjectToDelete] = useState<SubjectItem | null>(null);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];

  const handleSyncCbseSyllabus = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await syncLatestCbseSyllabus();
      setSyncStatus(`Updated! ${res.addedLessons} new CBSE chapters added across ${res.totalSubjects} subjects.`);
      setTimeout(() => setSyncStatus(null), 4000);
    } catch (err: any) {
      setSyncStatus('Failed to sync: ' + (err.message || 'error'));
      setTimeout(() => setSyncStatus(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    try {
      const id = await addSubject(newSubjectName.trim());
      setSelectedSubjectId(id);
      setIsAddSubjectOpen(false);
      setNewSubjectName('');
    } catch (err: any) {
      alert(err.message || 'Failed to add subject');
    }
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubject || !newLessonName.trim()) return;
    try {
      await addLessonToSubject(activeSubject.id, newLessonName.trim(), newLessonClass);
      setIsAddLessonOpen(false);
      setNewLessonName('');
    } catch (err: any) {
      alert(err.message || 'Failed to add lesson');
    }
  };

  // Filter lessons in selected subject
  const filteredLessons = (activeSubject?.lessons || []).filter((l) => {
    const matchesSearch = l.name.toLowerCase().includes(lessonSearch.toLowerCase());
    const matchesClass = classFilter === 'ALL' || l.class === classFilter;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="flex flex-col lg:flex-row h-full rounded-2xl border overflow-hidden bg-[var(--card-main)] border-[var(--border-main)] shadow-xl">
      {/* 30% Left: Subject List */}
      <div className="w-full lg:w-[32%] border-b lg:border-b-0 lg:border-r border-[var(--border-main)] flex flex-col bg-[var(--card-main)]">
        <div className="p-4 border-b border-[var(--border-main)] flex flex-wrap items-center justify-between gap-2 bg-[var(--raised-main)]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <span className="font-bold text-sm">CBSE Subjects</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={isSyncing}
              onClick={handleSyncCbseSyllabus}
              title="Sync & update all CBSE chapters from rationalized syllabus"
              className="px-2.5 py-1.5 rounded-full text-[11px] font-bold border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync CBSE</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddSubjectOpen(true)}
              className="px-3 py-1.5 rounded-full text-xs font-bold transition-all bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] hover:opacity-90 flex items-center gap-1 active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {syncStatus && (
          <div className="p-2.5 px-3 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-2 font-medium animate-in fade-in">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>{syncStatus}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-main)]">
          {subjects.map((subj) => {
            const isSelected = subj.id === activeSubject?.id;
            return (
              <div
                key={subj.id}
                onClick={() => setSelectedSubjectId(subj.id)}
                className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[var(--raised-main)] border-l-4 border-white'
                    : 'hover:bg-[var(--raised-main)]/60'
                }`}
              >
                <div>
                  <h4 className="font-bold text-xs sm:text-sm">{subj.name}</h4>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {subj.lessons.length} lessons registered
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--border-main)]">
                  {subj.lessons.length}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 70% Right: Lessons Manager for Selected Subject */}
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--card-main)]">
        {activeSubject ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-[var(--border-main)] flex flex-wrap items-center justify-between gap-3 bg-[var(--raised-main)]">
              <div>
                <h2 className="font-bold text-base sm:text-lg">{activeSubject.name}</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  {activeSubject.lessons.length} syllabus topics across Grades 1 to 10
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddLessonOpen(true)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] hover:opacity-90 flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <BookPlus className="w-3.5 h-3.5" />
                  <span>Add Lesson</span>
                </button>
                <button
                  type="button"
                  title="Delete Entire Subject"
                  onClick={() => setSubjectToDelete(activeSubject)}
                  className="p-1.5 rounded-xl border border-[var(--border-main)] hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="p-3 border-b border-[var(--border-main)] flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search lesson name..."
                  value={lessonSearch}
                  onChange={(e) => setLessonSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-main)] outline-hidden"
                />
              </div>

              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs border bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-main)] outline-hidden font-semibold"
              >
                <option value="ALL">All CBSE Classes (1st–10th)</option>
                {ALL_CLASSES.map((c) => (
                  <option key={c} value={c}>
                    Class {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Lessons List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-main)]">
              {filteredLessons.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                  No lessons found matching your filter.
                </div>
              ) : (
                filteredLessons.map((lesson, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 px-4 flex items-center justify-between hover:bg-[var(--raised-main)]/40 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-[var(--text-muted)] font-mono">{idx + 1}.</span>
                      <span className="font-semibold text-[var(--text-main)]">
                        {lesson.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--raised-main)] border border-[var(--border-main)] text-[var(--text-muted)]">
                        Class {lesson.class}
                      </span>
                      <button
                        type="button"
                        title="Delete lesson"
                        onClick={() => deleteLessonFromSubject(activeSubject.id, idx)}
                        className="p-1 rounded-md text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-[var(--text-muted)]">
            Select a subject to view and manage chapters.
          </div>
        )}
      </div>

      {/* Add Subject Modal */}
      {isAddSubjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl p-6 border shadow-2xl bg-[var(--card-main)] border-[var(--border-main)] text-[var(--text-main)] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
              <h3 className="font-bold text-sm">Add New Subject</h3>
              <button
                type="button"
                onClick={() => setIsAddSubjectOpen(false)}
                className="p-1 rounded-full text-[var(--text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateSubject} className="space-y-3">
              <input
                type="text"
                required
                placeholder="e.g. Hindi, Sanskrit, Social Science"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs border bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-main)] outline-hidden"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddSubjectOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold border border-[var(--border-main)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full text-xs font-bold bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)]"
                >
                  Create Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Lesson Modal */}
      {isAddLessonOpen && activeSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl p-6 border shadow-2xl bg-[var(--card-main)] border-[var(--border-main)] text-[var(--text-main)] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
              <h3 className="font-bold text-sm">Add Lesson to {activeSubject.name}</h3>
              <button
                type="button"
                onClick={() => setIsAddLessonOpen(false)}
                className="p-1 rounded-full text-[var(--text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddLesson} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                  Lesson / Chapter Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chemical Reactions and Equations"
                  value={newLessonName}
                  onChange={(e) => setNewLessonName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-main)] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                  Class / Grade
                </label>
                <select
                  value={newLessonClass}
                  onChange={(e) => setNewLessonClass(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border bg-[var(--raised-main)] border-[var(--border-main)] text-[var(--text-main)] outline-hidden font-semibold"
                >
                  {ALL_CLASSES.map((c) => (
                    <option key={c} value={c}>
                      Class {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddLessonOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold border border-[var(--border-main)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full text-xs font-bold bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)]"
                >
                  Add Chapter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Subject Confirmation Modal */}
      {subjectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl p-6 border shadow-2xl bg-[var(--card-main)] border-[var(--border-main)] text-[var(--text-main)] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
              <div className="flex items-center gap-2 text-red-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-bold text-base">Delete Subject</h3>
              </div>
              <button
                type="button"
                onClick={() => setSubjectToDelete(null)}
                className="p-1 rounded-full text-[var(--text-muted)] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-[var(--text-main)] font-semibold">
                Are you sure you want to delete <span className="font-bold text-white">{subjectToDelete.name}</span>?
              </p>
              <p className="text-[var(--text-muted)]">
                This will delete the subject and its lessons. This action cannot be undone.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSubjectToDelete(null)}
                className="px-4 py-2 rounded-full text-xs font-semibold border border-[var(--border-main)] hover:bg-[var(--raised-main)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await deleteSubject(subjectToDelete.id);
                    setSubjectToDelete(null);
                  } catch (err: any) {
                    alert(err.message || 'Failed to delete subject');
                  }
                }}
                className="px-5 py-2 rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                Yes, Delete Subject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
