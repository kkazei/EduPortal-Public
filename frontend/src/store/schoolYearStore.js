import { create } from 'zustand';
import axios from 'axios';

const API_URL = import.meta.env.MODE === 'development' ? 'http://localhost:5000/api/school-years' : '/api/school-years';

axios.defaults.withCredentials = true;

const persistedSelected = typeof window !== 'undefined' ? localStorage.getItem('selectedSchoolYear') : null;

export const useSchoolYearStore = create((set, get) => ({
  years: [],
  current: null,
  selected: persistedSelected || null,
  loading: false,
  error: null,

  fetchYears: async () => {
    set({ loading: true, error: null });
    try {
      const [listRes, currentRes] = await Promise.all([
        axios.get(API_URL),
        axios.get(`${API_URL}/current`)
      ]);
      set({ years: listRes.data.data || [], current: currentRes.data.data || null, loading: false });
      // If nothing selected, default to active name
      const activeName = currentRes?.data?.data?.name || null;
      if (!get().selected && activeName) {
        set({ selected: activeName });
        if (typeof window !== 'undefined') localStorage.setItem('selectedSchoolYear', activeName);
      }
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load school years', loading: false });
    }
  },

  selectYear: (name) => {
    set({ selected: name });
    if (typeof window !== 'undefined') localStorage.setItem('selectedSchoolYear', name);
  },

  createYear: async (payload) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post(API_URL, payload);
      await get().fetchYears();
      return res.data.data;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to create school year', loading: false });
      throw error;
    }
  },

  activateYear: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.patch(`${API_URL}/${id}/activate`);
      await get().fetchYears();
      // also set selected to active
      const name = res?.data?.data?.name;
      if (name) get().selectYear(name);
      return res.data.data;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to activate school year', loading: false });
      throw error;
    }
  },

  endYear: async (id, endDate = null) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.patch(`${API_URL}/${id}/end`, endDate ? { end_date: endDate } : {});
      await get().fetchYears();
      return res.data.data;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to end school year', loading: false });
      throw error;
    }
  }
  ,

  updateYear: async (id, payload) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.patch(`${API_URL}/${id}`, payload);
      await get().fetchYears();
      return res.data.data;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to update school year', loading: false });
      throw error;
    }
  }
}));
