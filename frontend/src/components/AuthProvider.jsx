import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useLocation } from 'react-router-dom';

export default function AuthProvider({ children }) {
  const { checkAuth, isCheckingAuth, isAuthenticated, isOnline, token } = useAuthStore();
  const checkAuthRef = useRef(checkAuth);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const location = useLocation();
  
  // Keep the ref updated
  useEffect(() => {
    checkAuthRef.current = checkAuth;
  }, [checkAuth]);
  
  // Skip auth checks for public routes
  const isPublicRoute = location.pathname === '/login' || location.pathname === '/signup';
  
  // Check authentication status only once when the app starts
  useEffect(() => {
    // Skip if we've already done the initial check or if we're on a public route
    if (initialCheckDone || isPublicRoute) {
      setInitialCheckDone(true);
      return;
    }
    
    console.log('AuthProvider: Performing initial auth check for protected route');
    
    checkAuthRef.current()
      .catch(err => {
        console.error('Auth check error:', err);
      })
      .finally(() => {
        setInitialCheckDone(true);
      });
      
  }, [initialCheckDone, isPublicRoute]); // checkAuth not in dependency array
  
  // Show loading state during initial auth check, but only for protected routes
  if (!isPublicRoute && isCheckingAuth && !initialCheckDone) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  // If offline but we have a token, treat as authenticated (read-only UI)
  const effectiveAuth = isAuthenticated || (!!token && !isOnline);

  // Render children once auth check is complete
  return children;
}