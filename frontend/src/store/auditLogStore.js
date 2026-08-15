import { create } from 'zustand';
import axios from 'axios';

const API_URL = import.meta.env.MODE === 'development' ? 'http://localhost:5000/api/audit-logs' : '/api/audit-logs';

axios.defaults.withCredentials = true;

export const useAuditLogStore = create((set) => ({
  logs: [],
  total: 0,
  loading: false,
  error: null,
  streaming: false,
  _es: null,

  fetchLogs: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get(API_URL, { params });
      set({ logs: res.data.data || [], total: res.data.total || 0, loading: false });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to load audit logs', loading: false });
    }
  },

  connectStream: () => {
    const state = useAuditLogStore.getState();
    if (state.streaming || state._es) return;
    try {
      const es = new EventSource(`${API_URL}/stream`, { withCredentials: true });
      es.onmessage = (evt) => {
        try {
          const log = JSON.parse(evt.data);
          set((s) => ({ logs: [log, ...s.logs].slice(0, 500) }));
        } catch (e) {
          // Ignore malformed SSE payloads but keep stream alive
          // Use debug to avoid noisy logs in production
          if (import.meta.env.MODE === 'development') {
            console.debug('audit-stream: invalid JSON payload', e);
          }
        }
      };
      es.onerror = () => {
        // Auto-close on error; caller can reconnect on focus
        try { es.close(); } catch (e) { void 0; }
        set({ streaming: false, _es: null });
      };
      set({ streaming: true, _es: es });
    } catch (e) {
      console.warn('SSE connect failed:', e?.message);
    }
  },

  disconnectStream: () => {
    const state = useAuditLogStore.getState();
    try { state._es?.close(); } catch (e) { void 0; }
    set({ streaming: false, _es: null });
  }
}));
