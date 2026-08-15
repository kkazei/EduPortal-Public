import { create } from "zustand";
import axios from "axios";
import { useSchoolYearStore } from './schoolYearStore';

const API_URL = import.meta.env.MODE === "development" ? "http://localhost:5000/api/admin" : "/api/admin";

axios.defaults.withCredentials = true;

export const useAdminStore = create((set, get) => ({
  teachers: [],
  teacherTitles: [],
  classes: [],
  analyticsData: null,
  availableYears: [], // Add this state
  isLoading: false,
  error: null,
  message: null,
  
  // Teacher Management Functions
  
  // Get all teachers
  fetchTeachers: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/teachers`);
      set({ 
        teachers: response.data.data, 
        isLoading: false 
      });
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch teachers", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Get valid teacher titles
  fetchTeacherTitles: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/teacher-titles`);
      set({ 
        teacherTitles: response.data.data, 
        isLoading: false 
      });
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch teacher titles", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Create a new teacher account with activation email
  createTeacher: async (teacherData) => {
    set({ isLoading: true, error: null, message: null });
    try {
      const response = await axios.post(`${API_URL}/create-teacher`, teacherData);
      
      set(state => ({ 
        teachers: [response.data.teacher, ...state.teachers],
        message: response.data.message,
        isLoading: false 
      }));
      
      return { success: true, data: response.data };
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to create teacher account", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Update a teacher account
  updateTeacher: async (teacherId, teacherData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.put(`${API_URL}/teachers/${teacherId}`, teacherData);
      
      set(state => ({ 
        teachers: state.teachers.map(teacher => 
          teacher.id === parseInt(teacherId) ? response.data.data : teacher
        ),
        message: "Teacher account updated successfully",
        isLoading: false 
      }));
      
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to update teacher account", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Delete a teacher account
  deleteTeacher: async (teacherId) => {
    set({ isLoading: true, error: null });
    try {
      await axios.delete(`${API_URL}/teachers/${teacherId}`);
      set(state => ({ 
        teachers: state.teachers.filter(teacher => teacher.id !== parseInt(teacherId)),
        message: "Teacher account deleted successfully",
        isLoading: false 
      }));
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to delete teacher account", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Class Management Functions
  
  // Get all classes
  fetchClasses: async (schoolYear = null) => {
    set({ isLoading: true, error: null });
    try {
      const selectedYear = schoolYear || useSchoolYearStore.getState().selected || null;
      let url = `${API_URL}/classes`;
      if (selectedYear) {
        url += `?school_year=${selectedYear}`;
      }
      
      const response = await axios.get(url);
      set({ 
        classes: response.data.data, 
        isLoading: false 
      });
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch classes", 
        isLoading: false 
      });
      throw error;
    }
  },

  // Get archived classes
  fetchArchivedClasses: async (schoolYear = null) => {
    set({ isLoading: true, error: null });
    try {
      const selectedYear = schoolYear || useSchoolYearStore.getState().selected || null;
      let url = `${API_URL}/classes?archived=true`;
      if (selectedYear) {
        url += `&school_year=${selectedYear}`;
      }
      const response = await axios.get(url);
      set({ isLoading: false });
      return response.data.data;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch archived classes', isLoading: false });
      throw error;
    }
  },
  
  // Create a new class
  createClass: async (classData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/classes`, classData);
      set(state => ({ 
        classes: [response.data.data, ...state.classes],
        message: "Class created successfully",
        isLoading: false 
      }));
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to create class", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Update an existing class
  updateClass: async (classId, classData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.put(`${API_URL}/classes/${classId}`, classData);
      
      set(state => ({ 
        classes: state.classes.map(cls => 
          cls.id === parseInt(classId) ? response.data.data : cls
        ),
        message: "Class updated successfully",
        isLoading: false 
      }));
      
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to update class", 
        isLoading: false 
      });
      throw error;
    }
  },

  // Archive a class
  archiveClass: async (classId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.patch(`${API_URL}/classes/${classId}/archive`);
      set(state => ({
        classes: state.classes.filter(c => c.id !== parseInt(classId)),
        message: 'Class archived successfully',
        isLoading: false
      }));
      return response.data.data;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to archive class', isLoading: false });
      throw error;
    }
  },

  // Restore a class
  restoreClass: async (classId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.patch(`${API_URL}/classes/${classId}/restore`);
      // Caller should refresh lists; we only update message here
      set({ message: 'Class restored successfully', isLoading: false });
      return response.data.data;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to restore class', isLoading: false });
      throw error;
    }
  },

  // Permanently delete a class (safe)
  deleteClassPermanent: async (classId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.delete(`${API_URL}/classes/${classId}/permanent`);
      set({ message: 'Class permanently deleted', isLoading: false });
      return response.data.data;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to delete class', isLoading: false });
      throw error;
    }
  },

  // Analytics Functions - Add these new functions
  
  // Fetch analytics data
  fetchAnalytics: async (schoolYear = null) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      let url = `${API_URL}/analytics`;
      const selectedYear = schoolYear || useSchoolYearStore.getState().selected || null;
      if (selectedYear) {
        url += `?school_year=${selectedYear}`;
      }

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      set({ 
        analyticsData: response.data.data,
        availableYears: response.data.data.availableYears || [new Date().getFullYear()],
        isLoading: false 
      });
      
      return response.data.data;
    } catch (error) {
      console.error('Store analytics error:', error);
      set({ 
        error: error.response?.data?.message || "Failed to fetch analytics data", 
        isLoading: false,
        analyticsData: null
      });
      throw error;
    }
  },

  // Add function to fetch available years
  fetchAvailableYears: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/available-years`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      set({ availableYears: response.data.data });
      return response.data.data;
    } catch (error) {
      console.error('Store available years error:', error);
      // If error, fallback to current year
      const defaultYears = [new Date().getFullYear()];
      set({ availableYears: defaultYears });
      return defaultYears;
    }
  },

  // Clear analytics data
  clearAnalytics: () => {
    set({ analyticsData: null });
  },
  
  // Clear any error or success messages
  clearMessages: () => {
    set({ error: null, message: null });
  }
}));