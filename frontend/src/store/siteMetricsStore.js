import { create } from 'zustand';
import axios from 'axios';

const API = import.meta.env.MODE === 'development' ? 'http://localhost:5000/api/visits' : '/api/visits';

export const useSiteMetricsStore = create((set) => ({
  totalUnique: 0,
  totalVisits: 0,
  loading: false,
  error: null,

  registerVisit: async () => {
    try {
      // Generate or reuse a stable visitor UID
      let uid = localStorage.getItem('visitor_uid');
      if (!uid) {
        uid = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
        localStorage.setItem('visitor_uid', uid);
      }
      // Prevent multiple calls in the same page session
      if (sessionStorage.getItem('visit_registered') === '1') return;
      sessionStorage.setItem('visit_registered', '1');

      const res = await axios.post(API, { visitorUid: uid }, { withCredentials: false });
      const total = res.data?.data?.totalVisits ?? res.data?.data?.uniqueVisitors ?? 0;
      set({ totalVisits: total, totalUnique: total });
    } catch (e) {
      // non-blocking
    }
  },

  fetchTotal: async () => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get(`${API}/total`, { withCredentials: false });
      const total = res.data?.data?.totalVisits ?? res.data?.data?.uniqueVisitors ?? 0;
      set({ totalVisits: total, totalUnique: total, loading: false });
      return total;
    } catch (e) {
      set({ error: 'Failed to fetch total visits', loading: false });
      throw e;
    }
  },
}));
