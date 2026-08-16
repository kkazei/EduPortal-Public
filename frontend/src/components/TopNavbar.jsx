import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { 
  Home, 
  Bell, 
  LogOut, 
  Archive,
  UserCog,
  ChevronDown,
  GraduationCap,
  Layers
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import AccountSettingsModal from "./Modals/AccountSettingsModal";
import SchoolYearSwitcher from './SchoolYearSwitcher';

const SideNavbar = ({ isMaximized, setIsMaximized }) => {
  const { logout, user } = useAuthStore();
  const location = useLocation();
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef(null);

  // Get user role from auth store
  const userRole = user?.user_role;
  // Normalize role casing to avoid mismatch (e.g., 'Teacher')
  const normalizedRole = (userRole || '').toLowerCase();
  const roleLabel = normalizedRole === 'teacher' ? 'Teacher' : normalizedRole === 'student' ? 'Student' : normalizedRole === 'admin' ? 'Admin' : normalizedRole === 'superadmin' ? 'Super Admin' : '';
  // Only show announcement archive for teachers
  const canViewTeacherFeatures = normalizedRole === 'teacher';

  const toggleUserMenu = () => setUserMenuOpen(!userMenuOpen);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-40 print:hidden">
        {/* Main navbar with glass effect */}
          <div className={`transition-all duration-300 ${
          scrolled 
            ? 'bg-primary-700/95 backdrop-blur-xl shadow-xl border-b border-primary-600/20' 
            : 'bg-primary-700 shadow-lg border-b border-primary-600/30'
        } text-white`}>
          <div className="container mx-auto px-3 lg:px-6">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link to="/dashboard" className="flex min-w-0 items-center group">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/20 rounded-xl blur group-hover:bg-white/30 transition-all"></div>
                  <GraduationCap className="relative z-10 h-8 w-8 text-white transition-transform group-hover:scale-110 md:h-9 md:w-9" />
                </div>
                <div className="ml-2 flex min-w-0 items-center gap-1.5 md:hidden">
                  <h2 className="truncate text-lg font-display font-bold text-white">
                    EduPortal
                  </h2>
                  {roleLabel && (
                    <span className="rounded-full border border-white/30 bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {roleLabel}
                    </span>
                  )}
                </div>
                <div className="ml-3 hidden md:flex items-center gap-2">
                  <h2 className="text-2xl font-display font-bold text-white">
                    EduPortal
                  </h2>
                  {roleLabel && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-white/20 text-white border border-white/30">
                      {roleLabel}
                    </span>
                  )}
                </div>
              </Link>
              
              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-2">
                <NavLink
                  to="/dashboard"
                  icon={<Home className="h-4 w-4" />}
                  label="Dashboard"
                  active={location.pathname === "/dashboard"}
                />
                
                <NavLink
                  to="/announcement"
                  icon={<Bell className="h-4 w-4" />}
                  label="Announcements"
                  active={location.pathname === "/announcement" || location.pathname === "/announcement-teacher"}
                />

                {canViewTeacherFeatures && (
                  <NavLink
                    to="/announcement/archive"
                    icon={<Archive className="h-4 w-4" />}
                    label="Archive"
                    active={location.pathname === "/announcement/archive"}
                  />
                )}

                {canViewTeacherFeatures && (
                  <NavLink
                    to="/teacher/class-subjects"
                    icon={<Layers className="h-4 w-4" />}
                    label="Class Subjects"
                    active={location.pathname.startsWith("/teacher/class-subjects")}
                  />
                )}
              </nav>

              <SchoolYearSwitcher variant="compactInverted" className="ml-2 shrink-0 md:hidden" />
              
              {/* School year switcher + user menu */}
              <div className="hidden md:flex items-center gap-3" ref={dropdownRef}>
                <SchoolYearSwitcher variant="inverted" />
                
                {/* User Dropdown */}
                <div className="relative">
                  <button
                    onClick={toggleUserMenu}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all duration-200 border border-white/20"
                  >
                    <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                      {(user?.user_fullname || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium hidden lg:block">
                      {user?.user_fullname || 'User'}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {/* Dropdown Menu */}
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 glass-card animate-dropdown origin-top rounded-xl">
                      <div className="p-2">
                        <div className="px-3 py-2 border-b border-gray-200">
                          <p className="text-sm font-semibold text-gray-900">{user?.user_fullname}</p>
                          <p className="text-xs text-gray-500">{user?.user_email}</p>
                          {roleLabel && (
                            <span className="inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                              {roleLabel}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setAccountSettingsOpen(true);
                            setUserMenuOpen(false);
                          }}
                          className="flex items-center w-full px-3 py-2 mt-1 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <UserCog className="h-4 w-4 mr-3" />
                          Account Settings
                        </button>
                        <button
                          onClick={() => {
                            logout();
                            setUserMenuOpen(false);
                          }}
                          className="flex items-center w-full px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Settings Modal */}
      <AccountSettingsModal 
        isOpen={accountSettingsOpen}
        onClose={() => setAccountSettingsOpen(false)}
      />
    </>
  );
};

// Desktop Nav Link Component
const NavLink = ({ to, icon, label, active }) => (
  <Link
    to={to}
    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
      active 
        ? "bg-white/20 text-white shadow-lg" 
        : "text-white/80 hover:bg-white/10 hover:text-white"
    }`}
  >
    {icon}
    <span>{label}</span>
  </Link>
);

export default SideNavbar;
