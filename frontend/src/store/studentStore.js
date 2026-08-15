import { create } from "zustand";
import axios from "axios";
import { useSchoolYearStore } from './schoolYearStore';

const API_BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5000" : "";
const API_URL = `${API_BASE_URL}/api/students`;

axios.defaults.withCredentials = true;

export const useStudentStore = create((set, get) => ({
  students: [],
  currentStudent: null,
  filteredStudents: [],
  deletedStudents: [], // Add this to store deleted students
  isLoading: false,
  error: null,
  message: null,
  
  // Fetch all students (filtered by user role automatically in backend)
  fetchStudents: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      // Build query string from filters object
      const queryParams = new URLSearchParams();
      
      // Add all=true parameter to fetch all students at once
      queryParams.append('all', 'true');
      
      // Add any other filters provided
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      // Default to selected school year if none provided
      const selectedYear = filters.school_year || useSchoolYearStore.getState().selected || null;
      if (selectedYear) {
        queryParams.set('school_year', selectedYear);
      }
      
      const url = `${API_URL}?${queryParams.toString()}`;

      // If caller is scoping by school year, clear current lists to avoid stale counts
      if (selectedYear) {
        set({ students: [], filteredStudents: [] });
      }
      const response = await axios.get(url);
      
      set({ 
        students: response.data.data, 
        filteredStudents: response.data.data,
        isLoading: false 
      });
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch students", 
        isLoading: false 
      });
      throw error;
    }
  },

  // Add this method to your studentStore
fetchStudentByUserId: async (userId) => {
  set({ isLoading: true, error: null });
  try {
    const response = await axios.get(`${API_URL}/user/${userId}`);
    set({ 
      currentStudent: response.data.data, 
      isLoading: false 
    });
    return response.data.data;
  } catch (error) {
    set({ 
      error: error.response?.data?.message || "Failed to fetch student details", 
      isLoading: false 
    });
    throw error;
  }
},
  
  // Get a specific student by ID
  fetchStudentById: async (studentId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/${studentId}`);
      set({ 
        currentStudent: response.data.data, 
        isLoading: false 
      });
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch student details", 
        isLoading: false 
      });
      throw error;
    }
  },

    // New function to fetch deleted students
    fetchDeletedStudents: async () => {
        set({ isLoading: true, error: null });
        try {
          // Explicitly request deleted students
          const response = await axios.get(`${API_URL}/deleted`);
          
          set({ 
            deletedStudents: response.data.data,
            isLoading: false 
          });
          return response.data.data;
        } catch (error) {
          set({ 
            error: error.response?.data?.message || "Failed to fetch deleted students", 
            isLoading: false 
          });
          throw error;
        }
      },
  

  // Get a student by LRN
  fetchStudentByLRN: async (lrn) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/lrn/${lrn}`);
      set({ 
        currentStudent: response.data.data, 
        isLoading: false 
      });
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch student details", 
        isLoading: false 
      });
      throw error;
    }
  },

  // Get students by class ID
  fetchStudentsByClass: async (classId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/class/${classId}`);
      set({ 
        students: response.data.data, 
        filteredStudents: response.data.data,
        isLoading: false 
      });
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch students for this class", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Create a new student (teacher/admin only)
  createStudent: async (studentData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(API_URL, studentData);
      set(state => ({ 
        students: [response.data.data, ...state.students],
        filteredStudents: [response.data.data, ...state.filteredStudents],
        message: "Student created successfully",
        isLoading: false 
      }));
      return response.data.data;
    } catch (error) {
            set({ 
        error: error.response?.data?.message || "Failed to create student", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Update an existing student
  updateStudent: async (studentId, studentData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.put(`${API_URL}/${studentId}`, studentData);
      set(state => ({ 
        students: state.students.map(student => 
          student.id === response.data.data.id ? response.data.data : student
        ),
        filteredStudents: state.filteredStudents.map(student => 
          student.id === response.data.data.id ? response.data.data : student
        ),
        currentStudent: state.currentStudent?.id === response.data.data.id 
          ? response.data.data 
          : state.currentStudent,
        message: "Student updated successfully",
        isLoading: false 
      }));
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to update student", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Delete a student (soft delete)
  deleteStudent: async (studentId) => {
    set({ isLoading: true, error: null });
    try {
      await axios.delete(`${API_URL}/${studentId}`);
      set(state => ({ 
        students: state.students.filter(student => student.id !== parseInt(studentId)),
        filteredStudents: state.filteredStudents.filter(student => student.id !== parseInt(studentId)),
        currentStudent: state.currentStudent?.id === parseInt(studentId) ? null : state.currentStudent,
        message: "Student deleted successfully",
        isLoading: false 
      }));
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to delete student", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Restore a deleted student
  restoreStudent: async (studentId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.patch(`${API_URL}/${studentId}/restore`);
      
      // Update the state correctly using the state parameter in the set function
      set((state) => ({
        message: "Student restored successfully",
        isLoading: false,
        // Remove the restored student from deleted students list
        deletedStudents: state.deletedStudents.filter(student => student.id !== parseInt(studentId))
      }));
      
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to restore student", 
        isLoading: false 
      });
      throw error;
    }
  },

   // Permanently delete a student
   permanentlyDeleteStudent: async (studentId) => {
    set({ isLoading: true, error: null });
    try {
      await axios.delete(`${API_URL}/${studentId}/permanent`);
      set(state => ({ 
        students: state.students.filter(student => student.id !== parseInt(studentId)),
        filteredStudents: state.filteredStudents.filter(student => student.id !== parseInt(studentId)),
        deletedStudents: state.deletedStudents.filter(student => student.id !== parseInt(studentId)),
        currentStudent: state.currentStudent?.id === parseInt(studentId) ? null : state.currentStudent,
        message: "Student permanently deleted successfully",
        isLoading: false 
      }));
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to permanently delete student", 
        isLoading: false 
      });
      throw error;
    }
  },

  // Promote students from source class to target class
  promoteStudents: async ({ sourceClassId, targetClassId, studentIds }) => {
    set({ isLoading: true, error: null, message: null });
    try {
      const response = await axios.post(`${API_URL}/promote`, {
        source_class_id: sourceClassId,
        target_class_id: targetClassId,
        student_ids: studentIds,
      });
      set({ isLoading: false, message: response.data.message || 'Students promoted successfully' });
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to promote students',
        isLoading: false 
      });
      throw error;
    }
  },

  // Add this function to your store
  bulkCreateStudents: async (studentsData) => {
    set({ isLoading: true, error: null });
    try {
      console.log('Sending data to backend:', studentsData); // Add logging
      
      const response = await axios.post(`${API_URL}/bulk`, studentsData);
      console.log('Backend response:', response.data); // Add logging
      
      // Use get() to access the fetchStudents method
      await get().fetchStudents();
      
      set({ 
        message: `Successfully created ${studentsData.length} students`, 
        isLoading: false 
      });
      
      return response.data;
    } catch (error) {
      console.error("Error creating students in bulk:", error);
      set({ 
        error: error.response?.data?.message || "Failed to create students in bulk", 
        isLoading: false 
      });
      throw error;
    }
  },

  // Filter students locally
  filterStudents: (filterCriteria) => {
    set(state => {
      // Apply filters to the full students array
      const filtered = state.students.filter(student => {
        // Match on name (first, middle, or last)
        if (filterCriteria.name && !`${student.first_name} ${student.middle_name || ''} ${student.last_name}`.toLowerCase().includes(filterCriteria.name.toLowerCase())) {
          return false;
        }
        
        // Match on LRN
        if (filterCriteria.lrn && !student.lrn.includes(filterCriteria.lrn)) {
          return false;
        }
        
        // Match on gender
        if (filterCriteria.sex && student.sex !== filterCriteria.sex) {
          return false;
        }
        
        // Match on class if present
        if (filterCriteria.class_id && student.class_id !== parseInt(filterCriteria.class_id)) {
          return false;
        }
        
        return true;
      });
      
      return { filteredStudents: filtered };
    });
  },
  
  // Clear any error or success messages
  clearMessages: () => {
    set({ error: null, message: null });
  },
  
  // Clear the current selected student
  clearCurrentStudent: () => {
    set({ currentStudent: null });
  },

  // Add this function to your studentStore.js
  getClassStudents: async (classId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/class/${classId}/students`);
      set({ isLoading: false });
      return response.data.data; // Return the students array directly
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch class students", 
        isLoading: false 
      });
      throw error;
    }
  },

  // Add this method for password reset
  resetStudentPassword: async (studentId) => {
    set({ isLoading: true, error: null, message: null });
    try {
      console.log('Attempting to reset password for student ID:', studentId);
      
      const response = await axios.post(`${API_URL}/${studentId}/reset-password`);
      
      console.log('Password reset response:', response.data);
      
      set({ 
        message: response.data.message || 'Password reset successfully',
        isLoading: false 
      });
      return response.data;
    } catch (error) {
      console.error('Password reset error:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to reset password';
      
      set({ 
        error: errorMessage,
        isLoading: false 
      });
      throw error;
    }
  },

  // Require email-only setup on next login
  requireEmailSetup: async (studentId) => {
    set({ isLoading: true, error: null, message: null });
    try {
      const response = await axios.post(`${API_URL}/${studentId}/require-email-setup`);
      set({ message: response.data.message || 'Email setup required', isLoading: false });
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to require email setup';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },
}));