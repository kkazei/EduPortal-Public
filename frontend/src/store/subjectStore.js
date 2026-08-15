import { create } from "zustand";
import axios from "axios";

const API_URL = import.meta.env.MODE === "development" 
  ? "http://localhost:5000/api/subjects" 
  : "/api/subjects";

axios.defaults.withCredentials = true;

export const useSubjectStore = create((set, get) => ({
  subjects: [],
  currentSubject: null,
  filteredSubjects: [],
  gradesByStudent: {}, // Store grades by student ID
  isLoading: false,
  error: null,
  message: null,
  
  // Fetch all subjects with optional filters
  fetchSubjects: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      // Build query string from filters
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value);
        }
      });
      
      const url = `${API_URL}?${queryParams.toString()}`;
      const response = await axios.get(url);
      
      set({ 
        subjects: response.data.data, 
        filteredSubjects: response.data.data,
        isLoading: false 
      });
      
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch subjects", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Fetch subjects by grade level
  fetchSubjectsByGradeLevel: async (gradeLevel) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}?grade_level=${gradeLevel}`);
      
      set({ 
        subjects: response.data.data, 
        filteredSubjects: response.data.data,
        isLoading: false 
      });
      
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch subjects for this grade level", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Fetch a specific subject by ID
  fetchSubjectById: async (subjectId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/${subjectId}`);
      
      set({ 
        currentSubject: response.data.data, 
        isLoading: false 
      });
      
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch subject details", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Fetch subjects for a specific class
  fetchSubjectsByClass: async (classId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/class/${classId}`);
      
      set({ 
        subjects: response.data.data, 
        filteredSubjects: response.data.data,
        isLoading: false 
      });
      
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch subjects for this class", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Fetch subjects and grades for a specific student
  fetchStudentSubjectsWithGrades: async (studentId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/student/${studentId}/grades`);
      
      // Store grades by student ID for easy access
      const grades = response.data.data;
      set(state => ({
        gradesByStudent: { 
          ...state.gradesByStudent,
          [studentId]: grades 
        },
        isLoading: false
      }));
      
      return grades;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch student grades", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Create a new subject (admin/teacher only)
  createSubject: async (subjectData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(API_URL, subjectData);
      
      set(state => ({ 
        subjects: [response.data.data, ...state.subjects],
        filteredSubjects: [response.data.data, ...state.filteredSubjects],
        message: "Subject created successfully",
        isLoading: false 
      }));
      
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to create subject", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Update an existing subject
  updateSubject: async (subjectId, subjectData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.put(`${API_URL}/${subjectId}`, subjectData);
      
      set(state => ({ 
        subjects: state.subjects.map(subject => 
          subject.id === response.data.data.id ? response.data.data : subject
        ),
        filteredSubjects: state.filteredSubjects.map(subject => 
          subject.id === response.data.data.id ? response.data.data : subject
        ),
        currentSubject: state.currentSubject?.id === response.data.data.id 
          ? response.data.data 
          : state.currentSubject,
        message: "Subject updated successfully",
        isLoading: false 
      }));
      
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to update subject", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Delete a subject
  deleteSubject: async (subjectId) => {
    set({ isLoading: true, error: null });
    try {
      await axios.delete(`${API_URL}/${subjectId}`);
      
      set(state => ({ 
        subjects: state.subjects.filter(subject => subject.id !== parseInt(subjectId)),
        filteredSubjects: state.filteredSubjects.filter(subject => subject.id !== parseInt(subjectId)),
        currentSubject: state.currentSubject?.id === parseInt(subjectId) ? null : state.currentSubject,
        message: "Subject deleted successfully",
        isLoading: false 
      }));
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to delete subject", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Update student grades for a subject
  updateStudentGrades: async (studentId, subjectId, gradesData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.put(
        `${API_URL}/student/${studentId}/subject/${subjectId}/grades`, 
        gradesData
      );
      
      // Update the grades in state
      set(state => {
        const currentGrades = state.gradesByStudent[studentId] || [];
        const updatedGrades = currentGrades.map(grade => 
          grade.subject_id === parseInt(subjectId) ? response.data.data : grade
        );
        
        // If the grade wasn't in the array (new grade), add it
        if (!currentGrades.some(grade => grade.subject_id === parseInt(subjectId))) {
          updatedGrades.push(response.data.data);
        }
        
        return {
          gradesByStudent: { 
            ...state.gradesByStudent,
            [studentId]: updatedGrades 
          },
          message: "Grades updated successfully",
          isLoading: false
        };
      });
      
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to update grades", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Seed default subjects from the backend model
  seedSubjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/seed`);
      
      // Refresh the subjects after seeding
      await get().fetchSubjects();
      
      set({
        message: response.data.message || "Default subjects seeded successfully",
        isLoading: false
      });
      
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to seed subjects", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Filter subjects locally based on criteria
  filterSubjects: (filterCriteria) => {
    set(state => {
      // Apply filters to the full subjects array
      const filtered = state.subjects.filter(subject => {
        // Match on subject name
        if (filterCriteria.name && !subject.subject_name.toLowerCase().includes(filterCriteria.name.toLowerCase())) {
          return false;
        }
        
        // Match on subject code
        if (filterCriteria.code && !subject.subject_code.toLowerCase().includes(filterCriteria.code.toLowerCase())) {
          return false;
        }
        
        // Match on grade level
        if (filterCriteria.grade_level && subject.grade_level !== filterCriteria.grade_level) {
          return false;
        }
        
        // Match on teacher
        if (filterCriteria.teacher_id && subject.teacher_id !== parseInt(filterCriteria.teacher_id)) {
          return false;
        }
        
        return true;
      });
      
      return { filteredSubjects: filtered };
    });
  },
  
  // Calculate grade statistics for report cards
  calculateGradeStats: (studentId) => {
    const grades = get().gradesByStudent[studentId] || [];
    
    if (!grades.length) {
      return { 
        average: 0,
        passing: 0,
        failing: 0,
        total: 0,
        incomplete: 0
      };
    }
    
    let totalFinalGrade = 0;
    let passingCount = 0;
    let failingCount = 0;
    let incompleteCount = 0;
    
    grades.forEach(grade => {
      if (grade.final_grade) {
        totalFinalGrade += parseFloat(grade.final_grade);
        
        if (parseFloat(grade.final_grade) >= 75) {
          passingCount++;
        } else {
          failingCount++;
        }
      } else {
        // If any quarter grade is missing, consider it incomplete
        incompleteCount++;
      }
    });
    
    const averageGrade = grades.length - incompleteCount > 0 
      ? totalFinalGrade / (grades.length - incompleteCount)
      : 0;
    
    return {
      average: parseFloat(averageGrade.toFixed(2)),
      passing: passingCount,
      failing: failingCount,
      total: grades.length,
      incomplete: incompleteCount
    };
  },
  
  // Clear any error or success messages
  clearMessages: () => {
    set({ error: null, message: null });
  },
  
  // Clear the current selected subject
  clearCurrentSubject: () => {
    set({ currentSubject: null });
  }
}));