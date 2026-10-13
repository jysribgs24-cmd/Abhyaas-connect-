import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { UnifiedLoginPage } from './components/UnifiedLoginPage';
import { StudentPanel } from './components/StudentPanel';
import { AdminDashboard } from './components/admin/AdminDashboard';

const MainApp: React.FC = () => {
  const { currentUser, loading, previewStudentClass, setPreviewStudentClass } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[var(--bg-main)] text-[var(--text-main)]">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl mb-4 shadow-lg bg-[var(--accent-pill-bg)] text-[var(--accent-pill-text)] animate-pulse">
          A
        </div>
        <h2 className="font-bold text-base tracking-tight">Abhyaas Connect</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">Connecting to school portal...</p>
      </div>
    );
  }

  // Not logged in -> Show Unified Login Page
  if (!currentUser) {
    return <UnifiedLoginPage />;
  }

  // Admin user
  if (currentUser.role === 'admin') {
    // If admin is using "View as Student" preview mode
    if (previewStudentClass) {
      return (
        <StudentPanel
          previewClass={previewStudentClass}
          onExitPreview={() => setPreviewStudentClass(null)}
        />
      );
    }

    return (
      <AdminDashboard
        adminUser={currentUser}
        onViewAsStudent={(cls) => setPreviewStudentClass(cls)}
      />
    );
  }

  // Student user
  return <StudentPanel />;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
