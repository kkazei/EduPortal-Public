import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { BookOpen, Layers, BarChart3, Users, Settings, LogOut, Menu, X, UserCog } from 'lucide-react';
import AccountSettingsModal from './Modals/AccountSettingsModal';

export default function SuperAdminTopNav({ isMaximized, setIsMaximized }) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleMenu = () => setMenuOpen((v) => !v);
  const [accountOpen, setAccountOpen] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!user || user.user_role !== 'superadmin') {
      navigate('/login');
    }
  }, [user, navigate]);

  return (
    <div className="fixed top-0 left-0 right-0 z-40 print:hidden">
      <div className={`transition-all duration-300 ${
        scrolled 
          ? 'bg-indigo-700/95 backdrop-blur-xl shadow-xl border-b border-indigo-600/20' 
          : 'bg-gradient-to-r from-indigo-700 to-purple-800'
      } text-white`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-white" />
              <h2 className="text-2xl font-bold ml-3 hidden md:block">EduPortal Super Admin</h2>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Link to="/superadmin/dashboard" className={`px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/superadmin/dashboard' ? 'bg-white bg-opacity-20 text-white' : 'text-white hover:bg-white hover:bg-opacity-10'}`}>
                <div className="flex items-center"><Layers className="h-5 w-5 mr-2" /><span>Dashboard</span></div>
              </Link>
              <Link to="/superadmin/analytics" className={`px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/superadmin/analytics' ? 'bg-white bg-opacity-20 text-white' : 'text-white hover:bg-white hover:bg-opacity-10'}`}>
                <div className="flex items-center"><BarChart3 className="h-5 w-5 mr-2" /><span>Analytics</span></div>
              </Link>
              <Link to="/superadmin/users" className={`px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/superadmin/users' ? 'bg-white bg-opacity-20 text-white' : 'text-white hover:bg-white hover:bg-opacity-10'}`}>
                <div className="flex items-center"><Users className="h-5 w-5 mr-2" /><span>Users</span></div>
              </Link>
              <Link to="/superadmin/users/archived" className={`px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/superadmin/users/archived' ? 'bg-white bg-opacity-20 text-white' : 'text-white hover:bg-white hover:bg-opacity-10'}`}>
                <div className="flex items-center"><Users className="h-5 w-5 mr-2" /><span>Archived</span></div>
              </Link>
              <Link to="/superadmin/audit-logs" className={`px-3 py-2 rounded-md text-sm font-medium ${location.pathname === '/superadmin/audit-logs' ? 'bg-white bg-opacity-20 text-white' : 'text-white hover:bg-white hover:bg-opacity-10'}`}>
                <div className="flex items-center"><Settings className="h-5 w-5 mr-2" /><span>Report Logs</span></div>
              </Link>
              <button onClick={()=>setAccountOpen(true)} className="px-3 py-2 rounded-md text-sm font-medium flex items-center hover:bg-white hover:bg-opacity-10">
                <UserCog className="h-5 w-5 mr-2" /><span>Account</span>
              </button>
              <button onClick={logout} className="bg-purple-800 hover:bg-purple-900 px-3 py-2 rounded-md text-sm font-medium flex items-center">
                <LogOut className="h-5 w-5 mr-2" /><span>Logout</span>
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button onClick={toggleMenu} className="text-white hover:text-purple-100 focus:outline-none">
                {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="bg-indigo-800 md:hidden shadow-lg z-20">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link to="/superadmin/dashboard" className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/superadmin/dashboard' ? 'bg-white bg-opacity-20 text-white' : 'text-white hover:bg-white hover:bg-opacity-10'}`} onClick={toggleMenu}>
              Dashboard
            </Link>
            <Link to="/superadmin/analytics" className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/superadmin/analytics' ? 'bg-white bg-opacity-20 text-white' : 'text-white hover:bg-white hover:bg-opacity-10'}`} onClick={toggleMenu}>
              Analytics
            </Link>
            <Link to="/superadmin/users" className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/superadmin/users' ? 'bg-white bg-opacity-20 text-white' : 'text-white hover:bg-white hover:bg-opacity-10'}`} onClick={toggleMenu}>
              Users
            </Link>
            <Link to="/superadmin/users/archived" className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/superadmin/users/archived' ? 'bg-white bg-opacity-20 text-white' : 'text-white hover:bg-white hover:bg-opacity-10'}`} onClick={toggleMenu}>
              Archived Users
            </Link>
            <Link to="/superadmin/audit-logs" className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname === '/superadmin/audit-logs' ? 'bg-white bg-opacity-20 text-white' : 'text-white hover:bg-white hover:bg-opacity-10'}`} onClick={toggleMenu}>
              Report Logs
            </Link>
            <div className="pt-2 mt-3 border-t border-indigo-700">
              <div className="px-3 py-2 text-sm font-medium text-white">{user?.user_fullname || user?.user_email || 'Super Admin'}</div>
              <button onClick={() => { toggleMenu(); setAccountOpen(true); }} className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-white hover:bg-white hover:bg-opacity-10">
                <UserCog className="h-5 w-5 mr-2" /> Account Settings
              </button>
              <button onClick={() => { toggleMenu(); logout(); }} className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-white hover:bg-white hover:bg-opacity-10">Logout</button>
            </div>
          </div>
        </div>
      )}
      <AccountSettingsModal isOpen={accountOpen} onClose={() => setAccountOpen(false)} />
    </div>
  );
}
