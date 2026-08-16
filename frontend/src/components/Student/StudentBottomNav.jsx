import React, { lazy, Suspense, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, FileText, Home, LogOut, Settings, UserCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useStudentStore } from '../../store/studentStore';
import { getStudentGreetingName, getStudentInitial } from '../../utils/studentDisplayName';

const AccountSettingsModal = lazy(() => import('../Modals/AccountSettingsModal'));

const StudentBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { currentStudent } = useStudentStore();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);

  const initials = getStudentInitial({ currentStudent, user });
  const profileName = getStudentGreetingName({ currentStudent, user });

  const isActive = (paths) => paths.some((path) => location.pathname === path);

  const handleNavigate = (path) => {
    setProfileMenuOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    await logout();
    navigate('/student-login', { replace: true });
  };

  const navItems = [
    {
      label: 'Dashboard',
      icon: Home,
      active: isActive(['/student-dashboard']),
      action: () => handleNavigate('/student-dashboard')
    },
    {
      label: 'Report card',
      icon: FileText,
      active: isActive(['/student-report-card']),
      action: () => handleNavigate('/student-report-card')
    },
    {
      label: 'Announcements',
      icon: Bell,
      active: isActive(['/student/announcements']),
      action: () => handleNavigate('/student/announcements')
    },
    {
      label: 'Profile',
      icon: UserCircle,
      active: isActive(['/student-profile']),
      action: () => handleNavigate('/student-profile')
    }
  ];

  return (
    <>
      <nav
        className="liquid-glass-nav fixed bottom-4 left-1/2 z-40 flex w-max -translate-x-1/2 items-center gap-1.5 rounded-full px-3.5 py-2.5 sm:bottom-5 sm:gap-2 sm:px-4 sm:py-3 lg:hidden"
        aria-label="Student mobile navigation"
      >
        {navItems.map(({ label, icon: Icon, active, action }) => (
          <motion.button
            key={label}
            type="button"
            onClick={action}
            aria-label={label}
            title={label}
            whileTap={{ scale: 0.9 }}
            className={`relative z-10 grid h-12 w-12 place-items-center rounded-full transition-all duration-200 sm:h-14 sm:w-14 ${
              active
                ? 'text-slate-950'
                : 'text-slate-700/80 hover:bg-white/30 hover:text-slate-950'
            }`}
          >
            {active && (
              <motion.span
                layoutId="student-bottom-nav-active"
                className="absolute inset-1 rounded-full bg-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_7px_18px_rgba(15,23,42,0.14)] ring-1 ring-white/75 backdrop-blur-xl"
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              />
            )}
            <Icon className="relative z-10 h-5 w-5 sm:h-6 sm:w-6" strokeWidth={active ? 2.6 : 2.2} />
          </motion.button>
        ))}

        <div className="relative z-10 mx-0.5 h-8 w-px bg-slate-700/10 sm:mx-1 sm:h-9" />

        <motion.button
          type="button"
          onClick={() => setProfileMenuOpen((open) => !open)}
          aria-label="Profile menu"
          aria-expanded={profileMenuOpen}
          title="Profile menu"
          whileTap={{ scale: 0.9 }}
          className={`relative z-10 grid h-12 w-12 place-items-center rounded-full transition-all duration-200 sm:h-14 sm:w-14 ${
            profileMenuOpen ? 'bg-white/60 shadow-inner ring-1 ring-white/70' : 'hover:bg-white/30'
          }`}
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-800 shadow-sm ring-1 ring-white/80 sm:h-9 sm:w-9 sm:text-sm">
            {initials}
          </span>
        </motion.button>
      </nav>

      <AnimatePresence>
        {profileMenuOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close profile menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-transparent lg:hidden"
              onClick={() => setProfileMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className="liquid-glass-popover fixed bottom-24 left-1/2 z-50 w-60 -translate-x-1/2 rounded-3xl p-2 lg:hidden sm:bottom-28"
            >
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  setAccountSettingsOpen(true);
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-white/50"
              >
                <Settings className="h-4 w-4 text-blue-600" />
                Account settings
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50/70"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
              <div className="mt-1 flex items-center gap-2 border-t border-white/50 px-3 pt-3 text-xs text-slate-500">
                <UserCircle className="h-4 w-4" />
                {profileName}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Suspense fallback={null}>
        <AccountSettingsModal
          isOpen={accountSettingsOpen}
          onClose={() => setAccountSettingsOpen(false)}
        />
      </Suspense>
    </>
  );
};

export default StudentBottomNav;
