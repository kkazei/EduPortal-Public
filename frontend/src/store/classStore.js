import { create } from "zustand";
import axios from "axios";
import { useSchoolYearStore } from './schoolYearStore';

const API_URL = import.meta.env.MODE === "development" ? "http://localhost:5000/api/classes" : "/api/classes";

axios.defaults.withCredentials = true;

export const useClassStore = create((set) => ({
  classes: [],
  currentClass: null,
  isLoading: false,
  error: null,
  message: null,
  
  // Fetch classes for a given year. If includeAll=true and user is a teacher, backend will return all classes for that year.
  fetchClasses: async (schoolYear = null, includeAll = false) => {
    set({ isLoading: true, error: null });
    try {
      const selectedYear = schoolYear || useSchoolYearStore.getState().selected || null;
      const params = {};
      if (selectedYear) params.school_year = selectedYear;
      if (includeAll) params.all = 'true';
      const response = await axios.get(API_URL, { params });
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
  
  // Get a specific class by ID
  fetchClassById: async (classId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/${classId}`);
      set({ 
        currentClass: response.data.data, 
        isLoading: false 
      });
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch class details", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Create a new class (teacher only)
  createClass: async (classData) => {
    set({ isLoading: true, error: null });
    try {
      // Ensure school_year is populated; default to selected year if missing
      const payload = { ...classData };
      if (!payload.school_year) {
        const selectedYear = useSchoolYearStore.getState().selected || null;
        if (selectedYear) payload.school_year = selectedYear;
      }
      const response = await axios.post(API_URL, payload);
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
      const response = await axios.put(`${API_URL}/${classId}`, classData);
      set(state => ({ 
        classes: state.classes.map(cls => 
          cls.id === response.data.data.id ? response.data.data : cls
        ),
        currentClass: state.currentClass?.id === response.data.data.id 
          ? response.data.data 
          : state.currentClass,
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
  
  // Delete a class (admin only)
  deleteClass: async (classId) => {
    set({ isLoading: true, error: null });
    try {
      await axios.delete(`${API_URL}/${classId}`);
      set(state => ({ 
        classes: state.classes.filter(cls => cls.id !== parseInt(classId)),
        currentClass: state.currentClass?.id === parseInt(classId) ? null : state.currentClass,
        message: "Class deleted successfully",
        isLoading: false 
      }));
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to delete class", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Get subjects for a specific class
  fetchClassSubjects: async (classId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/${classId}/subjects`);
      set({ isLoading: false });
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch class subjects", 
        isLoading: false 
      });
      throw error;
    }
  },

  // Add a subject to a class
  addSubjectToClass: async (classId, subjectId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/${classId}/subjects`, {
        subject_id: subjectId
      });
      
      // Update the class in the store with new data
      set(state => ({ 
        classes: state.classes.map(cls => 
          cls.id === parseInt(classId) ? response.data.data : cls
        ),
        currentClass: state.currentClass?.id === parseInt(classId) ? response.data.data : state.currentClass,
        message: "Subject added to class successfully",
        isLoading: false 
      }));
      
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to add subject to class", 
        isLoading: false 
      });
      throw error;
    }
  },

  // Remove a subject from a class
  removeSubjectFromClass: async (classId, subjectId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.delete(`${API_URL}/${classId}/subjects/${subjectId}`);
      
      // Update the class in the store with new data
      set(state => ({ 
        classes: state.classes.map(cls => 
          cls.id === parseInt(classId) ? response.data.data : cls
        ),
        currentClass: state.currentClass?.id === parseInt(classId) ? response.data.data : state.currentClass,
        message: "Subject removed from class successfully",
        isLoading: false 
      }));
      
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to remove subject from class", 
        isLoading: false 
      });
      throw error;
    }
  },

  // Update your classStore.js to add this function
getClassById: async (classId) => {
  set({ isLoading: true, error: null });
  try {
    const response = await axios.get(`${API_URL}/classes/${classId}`);
    set({ isLoading: false });
    return response.data;
  } catch (error) {
    set({
      isLoading: false,
      error: error.response?.data?.message || 'Failed to fetch class details'
    });
    throw error;
  }
},
  
  // Clear any error or success messages
  clearMessages: () => {
    set({ error: null, message: null });
  },
  
  // Clear the current selected class
  clearCurrentClass: () => {
    set({ currentClass: null });
  }
}));