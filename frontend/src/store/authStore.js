import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import axios from "axios";
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5000" : "";
const API_URL = `${API_BASE_URL}/api/auth`;

axios.defaults.withCredentials = true;

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      studentInfo: null,
      isAuthenticated: false,
      error: null,
      isLoading: false,
      isCheckingAuth: true,
      message: null,
      userRole: null,
      token: null,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,

      setOnline: (status) => set({ isOnline: status }),

      signup: async (user_email, password, user_fullname, user_role) => {
        set({ isLoading: true, error: null });
        try {
          const response = await axios.post(`${API_URL}/signup`, { user_email, password, user_fullname, user_role });
          set({ 
            user: response.data.user, 
            isAuthenticated: true, 
            isLoading: false,
            userRole: response.data.user.user_role || null
          });
        } catch (error) {
          set({ error: error.response?.data?.message || "Error signing up", isLoading: false });
          throw error;
        }
      },

      login: async (user_email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await axios.post(`${API_URL}/login`, { user_email, password });
          // Clear cached API GETs from previous session
          if (typeof window !== 'undefined' && 'caches' in window) {
            try { await caches.delete('api-get-cache'); } catch (e) { console.warn('Cache clear failed', e); }
          }
          set({
            isAuthenticated: true,
            user: response.data.user,
            isLoading: false,
            userRole: response.data.user.user_role || null,
            studentInfo: null,
            token: response.data.token || null
          });
        } catch (error) {
          set({ error: error.response?.data?.message || "Error logging in", isLoading: false });
          throw error;
        }
      },

      // New student login method
      studentLogin: async (lrn, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await axios.post(`${API_URL}/student-login`, { lrn, password });
          if (response.data.success) {
            if (typeof window !== 'undefined' && 'caches' in window) {
              try { await caches.delete('api-get-cache'); } catch (e) { console.warn('Cache clear failed', e); }
            }
            set({
              isAuthenticated: true,
              user: response.data.user,
              studentInfo: response.data.student,
              isLoading: false,
              userRole: 'student',
              token: response.data.token || null
            });
            return response.data;
          }
        } catch (error) {
          set({ error: error.response?.data?.message || "Error logging in", isLoading: false });
          throw error;
        }
      },

      adminLogin: async (user_email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await axios.post(`${API_URL}/admin-login`, { user_email, password });
          if (response.data.user.user_role !== 'admin' && response.data.user.user_role !== 'superadmin') {
            throw new Error('Access denied. Admin privileges required.');
          }
          if (typeof window !== 'undefined' && 'caches' in window) {
            try { await caches.delete('api-get-cache'); } catch (e) { console.warn('Cache clear failed', e); }
          }
          set({
            isAuthenticated: true,
            user: response.data.user,
            isLoading: false,
            userRole: response.data.user.user_role,
            studentInfo: null,
            token: response.data.token || null
          });
          return response.data;
        } catch (error) {
          set({ 
            error: error.response?.data?.message || error.message || "Access denied", 
            isLoading: false 
          });
          throw error;
        }
      },

      superadminLogin: async (user_email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await axios.post(`${API_URL}/superadmin-login`, { user_email, password });
          if (response.data.user.user_role !== 'superadmin') {
            throw new Error('Access denied. Superadmin only.');
          }
          if (typeof window !== 'undefined' && 'caches' in window) {
            try { await caches.delete('api-get-cache'); } catch (e) { console.warn('Cache clear failed', e); }
          }
          set({
            isAuthenticated: true,
            user: response.data.user,
            isLoading: false,
            userRole: response.data.user.user_role,
            studentInfo: null,
            token: response.data.token || null
          });
          return response.data;
        } catch (error) {
          set({ 
            error: error.response?.data?.message || error.message || 'Superadmin access denied',
            isLoading: false
          });
          throw error;
        }
      },

      checkAuth: async () => {
        set({ isCheckingAuth: true });
        console.log("Starting auth check");

        const online = typeof navigator !== 'undefined' ? navigator.onLine : true;

        // If offline, trust the persisted session
        if (!online) {
          const state = useAuthStore.getState();
          if (state.isAuthenticated && state.user) {
            console.log("Offline: using persisted session");
            set({ isCheckingAuth: false }); // keep user as-is
            return true;
          } else {
            console.log("Offline: no session found");
            set({ isAuthenticated: false, isCheckingAuth: false, user: null, studentInfo: null, userRole: null });
            return false;
          }
        }

        try {
          console.log("Making request to check-auth endpoint");
          const response = await axios.get(`${API_URL}/check-auth`, {
            params: { t: Date.now() }, // cache-bust
          });

          if (response.data.success && response.data.user) {
            const updates = {
              user: response.data.user,
              isAuthenticated: true,
              isCheckingAuth: false,
              userRole: response.data.user.user_role || null
            };
            if (response.data.student) {
              updates.studentInfo = response.data.student;
            }
            set(updates);
            return true;
          } else {
            set({
              user: null,
              studentInfo: null,
              isAuthenticated: false,
              isCheckingAuth: false,
              userRole: null
            });
            return false;
          }
        } catch (error) {
          console.error("Error checking authentication:", error);
          const status = error?.response?.status;
          const latestState = useAuthStore.getState();
          const hasPersistedSession = !!latestState.isAuthenticated && !!latestState.user;

          // Keep the current session when auth check fails due to network/offline issues.
          if (!status && hasPersistedSession) {
            console.log("Auth check failed due to network/offline issue; keeping persisted session");
            set({ isCheckingAuth: false });
            return true;
          }

          // Only clear session on explicit auth failures.
          if (status === 401 || status === 403) {
            set({
              user: null,
              studentInfo: null,
              isAuthenticated: false,
              isCheckingAuth: false,
              userRole: null
            });
            return false;
          }

          // For non-auth server errors, preserve an existing session if available.
          if (hasPersistedSession) {
            set({ isCheckingAuth: false });
            return true;
          }

          set({
            user: null,
            studentInfo: null,
            isAuthenticated: false,
            isCheckingAuth: false,
            userRole: null
          });
          return false;
        }
      },

      forgotPassword: async (email) => {
        set({ isLoading: true, error: null, message: null });
        try {
          const response = await axios.post(`${API_URL}/forgot-password`, { email });
          set({ 
            message: response.data.message, 
            isLoading: false 
          });
          return { success: true, message: response.data.message };
        } catch (error) {
          set({ 
            error: error.response?.data?.message || "Failed to send reset email", 
            isLoading: false 
          });
          throw error;
        }
      },

      resetPassword: async (token, password) => {
        set({ isLoading: true, error: null, message: null });
        try {
          const response = await axios.post(`${API_URL}/reset-password/${token}`, { password });
          set({ 
            message: response.data.message, 
            isLoading: false 
          });
          return { success: true, message: response.data.message };
        } catch (error) {
          set({ 
            error: error.response?.data?.message || "Failed to reset password", 
            isLoading: false 
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true, error: null });
        try {
          await axios.post(`${API_URL}/logout`);
        } catch (error) {
          console.error("Error during logout:", error);
        } finally {
          // Clear cached API GETs so next login can’t read stale data
          if (typeof window !== 'undefined' && 'caches' in window) {
            try { await caches.delete('api-get-cache'); } catch (e) { console.warn('Cache clear failed', e); }
          }
          set({ 
            user: null, 
            studentInfo: null, 
            isAuthenticated: false, 
            isLoading: false, 
            userRole: null,
            token: null
          });
        }
      },
      
      // Method to clear session storage and state (for testing/debugging)
      clearAuthState: () => {
        set({ 
          user: null, 
          studentInfo: null, 
          isAuthenticated: false, 
          isLoading: false, 
          isCheckingAuth: false, 
          error: null, 
          message: null, 
          userRole: null,
          token: null
        });
      },

      // Regular password change (for all users)
      changePassword: async (currentPassword, newPassword) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await axios.post(`${API_URL}/change-password`, {
            current_password: currentPassword,
            new_password: newPassword,
          }, { withCredentials: true });
          
          set({ isLoading: false });
          
          if (response.data.success) {
            toast.success('Password changed successfully');
            return response.data;
          } else {
            throw new Error(response.data.message || 'Failed to change password');
          }
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error.response?.data?.message || 'An error occurred while changing password'
          });
          
          toast.error(error.response?.data?.message || 'Failed to change password');
          throw error;
        }
      },

      // First-time password update (only for students)
      updateFirstTimePassword: async (newPassword) => {
        set({ isLoading: true, error: null });
        
        try {
          // Only allow for student accounts
          const currentUser = useAuthStore.getState().user;
          if (!currentUser || currentUser.user_role !== 'student') {
            throw new Error('First-time password update is only available for student accounts');
          }

          if (!currentUser.is_first_login) {
            throw new Error('First-time password update is not available for this account');
          }

          const response = await axios.post(`${API_URL}/update-first-time-password`, {
            new_password: newPassword,
          }, { withCredentials: true });
          
          if (response.data.success) {
            // Update user state to mark first login as complete
            set(state => ({
              user: { 
                ...state.user, 
                // No longer auto-complete first login here; email verification will finalize
                is_first_login: true 
              },
              isLoading: false
            }));
            
            toast.success('Password updated. Please verify your email to complete setup.');
            return response.data;
          } else {
            throw new Error(response.data.message || 'Failed to update password');
          }
        } catch (error) {
          const errorMessage = error.response?.data?.message || error.message || 'Failed to update password';
          set({ 
            isLoading: false, 
            error: errorMessage
          });
          
          toast.error(errorMessage);
          throw new Error(errorMessage);
        }
      },

      // New: initiate first-time setup (password + email)
      initiateFirstTimeSetup: async (newPassword, email) => {
        set({ isLoading: true, error: null });
        try {
          const response = await axios.post(`${API_URL}/first-time/initiate`, { new_password: newPassword, email });
          set({ isLoading: false });
          if (response.data.success) {
            toast.success(response.data.message || 'Verification code sent');
            return response.data;
          } else {
            throw new Error(response.data.message || 'Failed to start setup');
          }
        } catch (error) {
          const msg = error.response?.data?.message || error.message || 'Failed to start setup';
          set({ isLoading: false, error: msg });
          toast.error(msg);
          throw new Error(msg);
        }
      },

      resendFirstTimeEmailCode: async () => {
        try {
          const response = await axios.post(`${API_URL}/first-time/resend`);
          if (response.data.success) {
            toast.success(response.data.message || 'Code resent');
            return response.data;
          }
          throw new Error(response.data.message || 'Failed to resend code');
        } catch (error) {
          const msg = error.response?.data?.message || error.message || 'Failed to resend code';
          toast.error(msg);
          throw new Error(msg);
        }
      },

      verifyFirstTimeEmail: async (code) => {
        set({ isLoading: true, error: null });
        try {
          const response = await axios.post(`${API_URL}/first-time/verify`, { code });
          set(state => ({
            isLoading: false,
            user: {
              ...state.user,
              is_first_login: false,
              // Email will be returned via next checkAuth; optimistic update keeps UX smooth
            }
          }));
          toast.success(response.data.message || 'Email verified. Setup complete.');
          return response.data;
        } catch (error) {
          const msg = error.response?.data?.message || error.message || 'Verification failed';
          set({ isLoading: false, error: msg });
          toast.error(msg);
          throw new Error(msg);
        }
      },

      // Email change (account settings)
      initiateEmailChange: async (newEmail) => {
        try {
          const res = await axios.post(`${API_URL}/email/change-initiate`, { new_email: newEmail });
          toast.success(res.data.message || 'Verification code sent to your new email');
          return res.data;
        } catch (error) {
          const msg = error.response?.data?.message || error.message || 'Failed to start email change';
          toast.error(msg);
          throw new Error(msg);
        }
      },
      resendEmailChangeCode: async () => {
        try {
          const res = await axios.post(`${API_URL}/email/resend`);
          toast.success(res.data.message || 'Code resent');
          return res.data;
        } catch (error) {
          const msg = error.response?.data?.message || error.message || 'Failed to resend code';
          toast.error(msg);
          throw new Error(msg);
        }
      },
      verifyEmailChange: async (code) => {
        try {
          const res = await axios.post(`${API_URL}/email/verify`, { code });
          // Optimistically update user email via checkAuth on next navigation; here, just toast
          toast.success(res.data.message || 'Email updated successfully');
          return res.data;
        } catch (error) {
          const msg = error.response?.data?.message || error.message || 'Failed to verify code';
          toast.error(msg);
          throw new Error(msg);
        }
      },

      // Verify current email for legacy unverified accounts
      initiateVerifyAccount: async () => {
        try {
          const res = await axios.post(`${API_URL}/email/verify-account/initiate`);
          toast.success(res.data.message || 'Verification code sent');
          return res.data;
        } catch (error) {
          const msg = error.response?.data?.message || error.message || 'Failed to send verification code';
          toast.error(msg);
          throw new Error(msg);
        }
      },
      resendVerifyAccount: async () => {
        try {
          const res = await axios.post(`${API_URL}/email/verify-account/resend`);
          toast.success(res.data.message || 'Code resent');
          return res.data;
        } catch (error) {
          const msg = error.response?.data?.message || error.message || 'Failed to resend code';
          toast.error(msg);
          throw new Error(msg);
        }
      },
      confirmVerifyAccount: async (code) => {
        try {
          const res = await axios.post(`${API_URL}/email/verify-account/confirm`, { code });
          // Optimistically mark as verified
          set(state => ({
            user: state.user ? { ...state.user, is_email_verified: true } : state.user
          }));
          toast.success(res.data.message || 'Email verified successfully');
          return res.data;
        } catch (error) {
          const msg = error.response?.data?.message || error.message || 'Failed to verify email';
          toast.error(msg);
          throw new Error(msg);
        }
      },

      // New method for account activation
      activateAccount: async (token, password) => {
        set({ isLoading: true, error: null, message: null });
        try {
          const response = await axios.post(`${API_URL}/activate-account/${token}`, { password });
          set({ 
            message: response.data.message, 
            isLoading: false 
          });
          return { success: true, message: response.data.message };
        } catch (error) {
          set({ 
            error: error.response?.data?.message || "Failed to activate account", 
            isLoading: false 
          });
          throw error;
        }
      },

      clearMessages: () => {
        set({ error: null, message: null });
      },
    }),
    {
      name: "auth-storage", // unique name for localStorage key
      storage: createJSONStorage(() => localStorage), 
      partialize: (state) => ({
        user: state.user,
        studentInfo: state.studentInfo, 
        isAuthenticated: state.isAuthenticated,
        userRole: state.userRole
      }),
    }
  )
);

// Subscribe to browser online/offline
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useAuthStore.getState().setOnline(true));
  window.addEventListener('offline', () => {
    useAuthStore.getState().setOnline(false);
    // If the user was logged in, don't force a re-check while offline
    const st = useAuthStore.getState();
    if (st.isAuthenticated) {
      useAuthStore.setState({ isCheckingAuth: false });
    }
  });
}