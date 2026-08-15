import { create } from 'zustand';
import axios from 'axios';

const API_URL = import.meta.env.MODE === 'development' ? 'http://localhost:5000/api/superadmin' : '/api/superadmin';

axios.defaults.withCredentials = true;

export const useSuperadminStore = create((set) => ({
  users: [],
  analytics: null,
  availableYears: [],
  loading: false,
  error: null,

  fetchUsers: async (q = '', role = '', sort = 'role_asc', includeDeleted = false, onlyDeleted = false) => {
    set({ loading: true, error: null });
    try {
      const params = {};
      if (q) params.q = q;
      if (role) params.role = role;
      if (sort) params.sort = sort;
      if (includeDeleted) params.include_deleted = 'true';
      if (onlyDeleted) params.only_deleted = 'true';
      const res = await axios.get(`${API_URL}/users`, { params });
      set({ users: res.data.data || [], loading: false });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load users', loading: false });
    }
  },

  requestActionCode: async (action_type, target_user_id) => {
    try {
      const res = await axios.post(`${API_URL}/users/action-code`, { action_type, target_user_id });
      return res.data.data; // { action_code_id, expires_at }
    } catch (error) {
      throw error;
    }
  },

  updateRole: async (id, role, action_code_id, code) => {
    set({ loading: true, error: null });
    try {
      await axios.patch(`${API_URL}/users/${id}/role`, { role, action_code_id, code });
      await useSuperadminStore.getState().fetchUsers();
      set({ loading: false });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to update role', loading: false });
      throw error;
    }
  },

  createUser: async (payload) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post(`${API_URL}/users`, payload);
      await useSuperadminStore.getState().fetchUsers();
      set({ loading: false });
      return res.data; // includes tempPassword (if generated)
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to create user', loading: false });
      throw error;
    }
  },

  deleteUser: async (id, action_code_id, code, confirm = 'DELETE') => {
    set({ loading: true, error: null });
    try {
      await axios.delete(`${API_URL}/users/${id}`, { data: { action_code_id, code, confirm } });
      await useSuperadminStore.getState().fetchUsers();
      set({ loading: false });
      return true;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to delete user', loading: false });
      throw error;
    }
  },

  restoreUser: async (id, action_code_id, code, refetchArgs = null) => {
    set({ loading: true, error: null });
    try {
      await axios.patch(`${API_URL}/users/${id}/restore`, { action_code_id, code });
      if (Array.isArray(refetchArgs)) {
        await useSuperadminStore.getState().fetchUsers(...refetchArgs);
      } else {
        await useSuperadminStore.getState().fetchUsers();
      }
      set({ loading: false });
      return true;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to restore user', loading: false });
      throw error;
    }
  },

  // Fetch superadmin analytics
  fetchAnalytics: async (schoolYear = null) => {
    set({ loading: true, error: null });
    try {
      let url = `${API_URL}/analytics`;
      if (schoolYear) url += `?school_year=${schoolYear}`;
      const res = await axios.get(url);
      set({ analytics: res.data.data || null, availableYears: res.data.data?.availableYears || [], loading: false });
      return res.data.data;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load analytics', loading: false, analytics: null });
      throw error;
    }
  },

  fetchAvailableYears: async () => {
    try {
      const res = await axios.get(`${API_URL}/analytics`);
      const years = res.data?.data?.availableYears || [new Date().getFullYear()];
      set({ availableYears: years });
      return years;
    } catch (error) {
      const fallback = [new Date().getFullYear()];
      set({ availableYears: fallback });
      return fallback;
    }
  },

  clearAnalytics: () => set({ analytics: null }),
}));
