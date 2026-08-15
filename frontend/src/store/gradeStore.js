import { create } from "zustand";
import axios from "axios";
import { fetchWithCache } from '../utils/offlineCache';
import { enqueueGradeAction, flushGradeQueue } from '../utils/offlineQueue';
import { useSchoolYearStore } from './schoolYearStore';

const API_URL = import.meta.env.MODE === "development" ? "http://localhost:5000/api/grades" : "/api/grades";

axios.defaults.withCredentials = true;

export const useGradeStore = create((set, get) => ({
  studentGrades: [],
  classGrades: [],
  reportCard: null,
  isLoading: false,
  error: null,
  message: null,
  
  // Get grades for a specific student
  getStudentGrades: async (studentId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/student/${studentId}`);
      
      set({ 
        studentGrades: response.data, 
        isLoading: false 
      });
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch student grades", 
        isLoading: false 
      });
      throw error;
    }
  },

  // Get grades for all students in a class
  getClassGrades: async (classId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/class/${classId}`);
      
      set({ 
        classGrades: response.data, 
        isLoading: false 
      });
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch class grades", 
        isLoading: false 
      });
      throw error;
    }
  },

  // Update a student's grade for a subject
  updateStudentGrade: async (studentId, subjectId, classId, gradeData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.put(
        `${API_URL}/student/${studentId}/subject/${subjectId}/class/${classId}`,
        gradeData
      );
      
      // Update local state if student grades are currently loaded
      set(state => {
        // If we have current student grades loaded, update them
        if (state.studentGrades.length > 0) {
          const index = state.studentGrades.findIndex(
            grade => grade.subject_id === parseInt(subjectId) && grade.student_id === parseInt(studentId)
          );

          if (index !== -1) {
            const updatedGrades = [...state.studentGrades];
            updatedGrades[index] = response.data;
            return {
              studentGrades: updatedGrades,
              message: "Grade updated successfully",
              isLoading: false
            };
          } else {
            return {
              studentGrades: [...state.studentGrades, response.data],
              message: "Grade added successfully",
              isLoading: false
            };
          }
        }
        
        return { 
          message: "Grade updated successfully", 
          isLoading: false 
        };
      });
      
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to update grade", 
        isLoading: false 
      });
      throw error;
    }
  },

  // Get a student's report card with all subjects and grades
  getStudentReportCard: async (studentId, schoolYear = null) => {
    set({ isLoading: true, error: null });
    try {
      const selectedYear = schoolYear || useSchoolYearStore.getState().selected || null;
      const url = selectedYear 
        ? `${API_URL}/report-card/${studentId}/${selectedYear}`
        : `${API_URL}/report-card/${studentId}`;
        
      const response = await axios.get(url);
      
      set({ 
        reportCard: response.data, 
        isLoading: false 
      });
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch report card", 
        isLoading: false 
      });
      throw error;
    }
  },

  // Get a student's card with all subjects and grades (for student view)
  getStudentCard: async (studentId, schoolYear = null) => {
    set({ isLoading: true, error: null });
    try {
      const selectedYear = schoolYear || useSchoolYearStore.getState().selected || null;
      const url = selectedYear 
        ? `${API_URL}/student-card/${studentId}/${selectedYear}`
        : `${API_URL}/student-card/${studentId}`;
        
      const response = await axios.get(url);
      
      set({ 
        reportCard: response.data, 
        isLoading: false 
      });
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch student card", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Update multiple grades for a student at once (batch update)
  updateMultipleGrades: async (studentId, classId, gradesData) => {
    set({ isLoading: true, error: null });
    try {
      // Format the data properly for the API
      const payload = {
        gradesData: gradesData,
        school_year: gradesData.school_year || undefined
      };
      
      // Delete the school_year from gradesData if it exists at top level
      delete gradesData.school_year;
      
      // Submit all grades at once using the multiple-grades endpoint
      await axios.put(
        `${API_URL}/multiple-grades/${studentId}/class/${classId}`,
        payload
      );
      
      // Refresh student report card data
      const currentYear = new Date().getFullYear();
      const defaultSchoolYear = `${currentYear}-${currentYear + 1}`;
      const schoolYear = payload.school_year || defaultSchoolYear;
      const reportCard = await axios.get(`${API_URL}/report-card/${studentId}/${schoolYear}`);
      
      set({ 
        reportCard: reportCard.data,
        message: "All grades updated successfully",
        isLoading: false 
      });
      
      return reportCard.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to update grades", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Calculate GPA for displayed report card
  calculateGPA: (subjects) => {
    if (!subjects || subjects.length === 0) return null;
    
    let totalGrade = 0;
    let gradedSubjects = 0;
    
    subjects.forEach(subject => {
      if (subject.final_grade) {
        totalGrade += parseFloat(subject.final_grade);
        gradedSubjects++;
      }
    });
    
    if (gradedSubjects === 0) return null;
    return (totalGrade / gradedSubjects).toFixed(2);
  },
  
  // Clear any error or success messages
  clearMessages: () => {
    set({ error: null, message: null });
  },

  importGradesFromExcel: async (classId, studentsData, quarter) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/import-excel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          class_id: classId,
          students_data: studentsData,
          quarter: quarter
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import grades');
      }

      const result = await response.json();
      set({ 
        isLoading: false, 
        message: `Successfully imported Quarter ${quarter} grades for ${result.imported_count} students` 
      });
      
      return result;
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error.message || 'Failed to import grades from Excel' 
      });
      throw error;
    }
  },

  async fetchGrades(studentId) {
    return fetchWithCache(`grades:${studentId}`, async () => {
      const res = await fetch(`/api/grades/${studentId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch grades');
      const data = await res.json();
      set({ grades: data });
      return data;
    }).then((data) => {
      set({ grades: data });
      return data;
    }).catch((e) => {
      // Keep existing grades in state if available
      if (get().grades?.length) return get().grades;
      throw e;
    });
  },

  async submitGrade(payload) {
    if (!navigator.onLine) {
      enqueueGradeAction(payload);
      // Optimistic update in UI if desired
      return { queued: true };
    }
    const res = await fetch('/api/grades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to submit grade');
    // Optionally flush queue (if any were queued earlier)
    flushGradeQueue();
    return res.json();
  },
}));