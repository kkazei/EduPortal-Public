import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import SchoolYearSwitcher from './SchoolYearSwitcher';
import { 
  Home,
  Bell, 
  Users,
  LogOut, 
  BookOpen,
  Layers,
  Book,
  User,
  School,
  Settings,
  UserPlus,
  Menu,
  X,
  Archive,
  BarChart3,
  MoreHorizontal,
  GraduationCap,
  ChevronDown,
  Shield
} from 'lucide-react';

const AdminTopNav = () => {
  const { logout, user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const moreRef = useRef(null);
  const userRef = useRef(null);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setMoreOpen(false);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  // Check if user is admin
  useEffect(() => {
    if (!user || (user.user_role !== 'admin' && user.user_role !== 'superadmin')) {
      navigate('/login');
    }
  }, [user, navigate]);

  const isSuperAdmin = user?.user_role === 'superadmin';

  return (
    <div className="fixed top-0 left-0 right-0 z-40 print:hidden">
      {/* Main navbar with glass effect */}
      <div className={`transition-all duration-300 ${
        scrolled 
          ? 'bg-purple-700/95 backdrop-blur-xl shadow-xl border-b border-purple-600/20' 
          : 'bg-gradient-to-r from-secondary-600 via-purple-700 to-indigo-800'
      } text-white`}>
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/admin/dashboard" className="flex items-center group">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-xl blur group-hover:bg-white/30 transition-all"></div>
                {isSuperAdmin ? (
                  <Shield className="h-9 w-9 text-white relative z-10 group-hover:scale-110 transition-transform" />
                ) : (
                  <GraduationCap className="h-9 w-9 text-white relative z-10 group-hover:scale-110 transition-transform" />
                )}
              </div>
              <div className="ml-3 hidden lg:flex items-center gap-2">
                <h2 className="text-2xl font-display font-bold bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
                  {isSuperAdmin ? 'Super Admin' : 'Admin Panel'}
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-white/20 text-white border border-white/30">
                  {isSuperAdmin ? 'Super Admin' : 'Admin'}
                </span>
              </div>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <NavLink
                to="/admin/dashboard"
                icon={<Layers className="h-4 w-4" />}
                label="Dashboard"
                active={location.pathname === "/admin/dashboard"}
              />

              <NavLink
                to="/admin/analytics"
                icon={<BarChart3 className="h-4 w-4" />}
                label="Analytics"
                active={location.pathname === "/admin/analytics"}
              />
              
              <NavLink
                to="/admin/students"
                icon={<Users className="h-4 w-4" />}
                label="Students"
                active={location.pathname === "/admin/students"}
              />

              <NavLink
                to="/admin/teachers"
                icon={<User className="h-4 w-4" />}
                label="Teachers"
                active={location.pathname === "/admin/teachers"}
              />

              <NavLink
                to="/admin/classes"
                icon={<School className="h-4 w-4" />}
                label="Classes"
                active={location.pathname === "/admin/classes"}
              />

              {/* More Dropdown */}
              <div className="relative" ref={moreRef}>
                <button
                  onClick={() => setMoreOpen(!moreOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="hidden lg:inline">More</span>
                </button>
                
                {moreOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 glass-card animate-dropdown origin-top rounded-xl">
                    <div className="p-2">
                      <DropdownLink
                        to="/admin/students/archive"
                        icon={<Archive className="h-4 w-4" />}
                        label="Student Archive"
                        onClick={() => setMoreOpen(false)}
                      />
                      <DropdownLink
                        to="/admin/class-subjects"
                        icon={<Book className="h-4 w-4" />}
                        label="Class Subjects"
                        onClick={() => setMoreOpen(false)}
                      />
                      <DropdownLink
                        to="/admin/school-years"
                        icon={<School className="h-4 w-4" />}
                        label="School Years"
                        onClick={() => setMoreOpen(false)}
                      />
                      <DropdownLink
                        to="/admin/audit-logs"
                        icon={<Settings className="h-4 w-4" />}
                        label="Report Logs"
                        onClick={() => setMoreOpen(false)}
                      />
                      {isSuperAdmin && (
                        <DropdownLink
                          to="/superadmin/users"
                          icon={<UserPlus className="h-4 w-4" />}
                          label="User Management"
                          onClick={() => setMoreOpen(false)}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </nav>
            
            {/* User menu */}
            <div className="hidden md:flex items-center gap-3" ref={userRef}>              
              <SchoolYearSwitcher variant="inverted" />
              
              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all duration-200 border border-white/20"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm">
                    {(user?.user_fullname || 'A').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium hidden lg:block">
                    {user?.user_fullname || 'Admin'}
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
                        <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-secondary-100 text-secondary-700 rounded-full">
                          {isSuperAdmin ? 'Super Admin' : 'Admin'}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          logout();
                          setUserMenuOpen(false);
                        }}
                        className="flex items-center w-full px-3 py-2 mt-1 text-sm text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={toggleMenu}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              >
                {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 md:hidden" onClick={toggleMenu}></div>
          <div className="fixed top-16 left-0 right-0 glass-card md:hidden shadow-xl animate-slide-down max-h-[calc(100vh-4rem)] overflow-y-auto z-40">
            <div className="p-4 space-y-2">
              <MobileNavLink
                to="/admin/dashboard"
                icon={<Layers className="h-5 w-5" />}
                label="Dashboard"
                active={location.pathname === "/admin/dashboard"}
                onClick={toggleMenu}
              />

              <MobileNavLink
                to="/admin/analytics"
                icon={<BarChart3 className="h-5 w-5" />}
                label="Analytics"
                active={location.pathname === "/admin/analytics"}
                onClick={toggleMenu}
              />
              
              <MobileNavLink
                to="/admin/students"
                icon={<Users className="h-5 w-5" />}
                label="Student Records"
                active={location.pathname === "/admin/students"}
                onClick={toggleMenu}
              />
              
              <MobileNavLink
                to="/admin/students/archive"
                icon={<Archive className="h-5 w-5" />}
                label="Student Archive"
                active={location.pathname === "/admin/students/archive"}
                onClick={toggleMenu}
              />
              
              <MobileNavLink
                to="/admin/teachers"
                icon={<User className="h-5 w-5" />}
                label="Teachers"
                active={location.pathname === "/admin/teachers"}
                onClick={toggleMenu}
              />
              
              <MobileNavLink
                to="/admin/classes"
                icon={<School className="h-5 w-5" />}
                label="Classes"
                active={location.pathname === "/admin/classes"}
                onClick={toggleMenu}
              />
              
              <MobileNavLink
                to="/admin/class-subjects"
                icon={<Book className="h-5 w-5" />}
                label="Class Subjects"
                active={location.pathname === "/admin/class-subjects"}
                onClick={toggleMenu}
              />

              <MobileNavLink
                to="/admin/school-years"
                icon={<School className="h-5 w-5" />}
                label="School Years"
                active={location.pathname === "/admin/school-years"}
                onClick={toggleMenu}
              />
              
              <MobileNavLink
                to="/admin/audit-logs"
                icon={<Settings className="h-5 w-5" />}
                label="Report Logs"
                active={location.pathname === "/admin/audit-logs"}
                onClick={toggleMenu}
              />
              
              {isSuperAdmin && (
                <MobileNavLink
                  to="/superadmin/users"
                  icon={<UserPlus className="h-5 w-5" />}
                  label="User Management"
                  active={location.pathname === "/superadmin/users"}
                  onClick={toggleMenu}
                />
              )}
              
              <div className="pt-4 mt-4 border-t border-gray-200">
                <div className="flex items-center gap-3 px-3 py-2 mb-2">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-semibold">
                    {(user?.user_fullname || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{user?.user_fullname}</p>
                    <p className="text-xs text-gray-500">{user?.user_email}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => { toggleMenu(); logout(); }}
                  className="flex items-center w-full px-3 py-2 rounded-xl text-danger-600 hover:bg-danger-50 transition-colors"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Desktop Nav Link Component
const NavLink = ({ to, icon, label, active }) => (
  <Link
    to={to}
    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
      active 
        ? "bg-white/20 text-white shadow-lg" 
        : "text-white/80 hover:bg-white/10 hover:text-white"
    }`}
  >
    {icon}
    <span className="hidden lg:inline">{label}</span>
  </Link>
);

// Dropdown Link Component
const DropdownLink = ({ to, icon, label, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
  >
    {icon}
    <span>{label}</span>
  </Link>
);

// Mobile Nav Link Component
const MobileNavLink = ({ to, icon, label, active, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
      active 
        ? "bg-secondary-50 text-secondary-700 shadow-sm" 
        : "text-gray-700 hover:bg-gray-50"
    }`}
  >
    {icon}
    <span>{label}</span>
  </Link>
);

export default AdminTopNav;