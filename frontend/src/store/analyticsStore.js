import { create } from "zustand";
import axios from "axios";

const API_URL = import.meta.env.MODE === "development" ? "http://localhost:5000/api/analytics" : "/api/analytics";

axios.defaults.withCredentials = true;

export const useAnalyticsStore = create((set) => ({
  classAnalytics: null,
  yearlyAnalytics: null,
  subjectAnalytics: null,
  classComparison: null,
  isLoading: false,
  error: null,
  message: null,
  
  // Get class analytics for a specific quarter
  getClassAnalytics: async (classId, quarter, schoolYear = null) => {
    set({ isLoading: true, error: null });
    try {
      const params = schoolYear ? `?schoolYear=${schoolYear}` : '';
      const response = await axios.get(`${API_URL}/class/${classId}/quarter/${quarter}${params}`);
      
      set({ 
        classAnalytics: response.data.data, 
        isLoading: false 
      });
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch class analytics", 
        isLoading: false 
      });
      throw error;
    }
  },

  // Get yearly analytics for a class (all quarters)
  getClassYearlyAnalytics: async (classId, schoolYear = null) => {
    set({ isLoading: true, error: null });
    try {
      const params = schoolYear ? `?schoolYear=${schoolYear}` : '';
      const response = await axios.get(`${API_URL}/class/${classId}/yearly${params}`);
      
      set({ 
        yearlyAnalytics: response.data.data, 
        isLoading: false 
      });
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch yearly analytics", 
        isLoading: false 
      });
      throw error;
    }
  },

  // Get subject performance analytics for a specific class
  getSubjectAnalytics: async (classId, subjectId, schoolYear = null) => {
    set({ isLoading: true, error: null });
    try {
      const params = schoolYear ? `?schoolYear=${schoolYear}` : '';
      const response = await axios.get(`${API_URL}/class/${classId}/subject/${subjectId}${params}`);
      
      set({ 
        subjectAnalytics: response.data.data, 
        isLoading: false 
      });
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch subject analytics", 
        isLoading: false 
      });
      throw error;
    }
  },

  // Get comparison analytics between different classes
  getClassComparison: async (gradeLevel = null, schoolYear = null) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (gradeLevel) params.append('gradeLevel', gradeLevel);
      if (schoolYear) params.append('schoolYear', schoolYear);
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await axios.get(`${API_URL}/comparison${queryString}`);
      
      set({ 
        classComparison: response.data.data, 
        isLoading: false 
      });
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch class comparison", 
        isLoading: false 
      });
      throw error;
    }
  },

  // Admin: Get analytics for any class
  getAdminClassAnalytics: async (classId, quarter, schoolYear = null) => {
    set({ isLoading: true, error: null });
    try {
      const params = schoolYear ? `?schoolYear=${schoolYear}` : '';
      const response = await axios.get(`${API_URL}/admin/class/${classId}/quarter/${quarter}${params}`);
      
      set({ 
        classAnalytics: response.data.data, 
        isLoading: false 
      });
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch admin class analytics", 
        isLoading: false 
      });
      throw error;
    }
  },

  // Admin: Get school-wide comparison
  getAdminClassComparison: async (gradeLevel = null, schoolYear = null) => {
    set({ isLoading: true, error: null });
    try {
      const gradeLevelPath = gradeLevel ? `/${gradeLevel}` : '';
      const params = schoolYear ? `?schoolYear=${schoolYear}` : '';
      const response = await axios.get(`${API_URL}/admin/comparison${gradeLevelPath}${params}`);
      
      set({ 
        classComparison: response.data.data, 
        isLoading: false 
      });
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch admin comparison", 
        isLoading: false 
      });
      throw error;
    }
  },

  // Calculate grade distribution for chart data
  getGradeDistributionChartData: (gradeClassification) => {
    if (!gradeClassification) return [];
    
    return Object.entries(gradeClassification).map(([range, data]) => ({
      range,
      count: data.count,
      label: data.label,
      percentage: 0 // Will be calculated in component based on total students
    }));
  },

  // Calculate honor roll statistics
  getHonorRollStats: (students) => {
    if (!students || students.length === 0) return {
      withHighestHonors: 0,
      withHighHonors: 0,
      withHonors: 0,
      total: 0
    };

    let withHighestHonors = 0;
    let withHighHonors = 0;
    let withHonors = 0;

    students.forEach(student => {
      if (student.average !== null && student.average !== undefined && student.average !== '') {
        const avg = parseFloat(student.average);
        // Updated thresholds to match your new logic
        if (avg >= 97.5) {
          withHighestHonors++;
        } else if (avg >= 94.5) {
          withHighHonors++;
        } else if (avg >= 89.5) { // Changed from 90 to 89.5
          withHonors++;
        }
        // Students below 89.5 are NOT counted in any honor category
      }
    });

    return {
      withHighestHonors,
      withHighHonors,
      withHonors,
      total: withHighestHonors + withHighHonors + withHonors
    };
  },

  // Calculate subject performance summary
  getSubjectPerformanceSummary: (subjectPerformance) => {
    if (!subjectPerformance) return [];
    
    return Object.entries(subjectPerformance).map(([subjectName, data]) => ({
      subject: subjectName,
      average: data.average,
      totalStudents: data.total_students,
      highest: data.highest,
      lowest: data.lowest,
      performance: data.average >= 90 ? 'Excellent' : 
                  data.average >= 85 ? 'Very Good' :
                  data.average >= 80 ? 'Good' :
                  data.average >= 75 ? 'Satisfactory' : 'Needs Improvement'
    }));
  },

  // Get trending data for quarters
  getQuarterlyTrends: (students) => {
    if (!students || students.length === 0) return [];
    
    // This would need quarterly data from yearly analytics
    // For now, return empty array - implement when quarterly comparison is needed
    return [];
  },

  // Export analytics data (prepare for download)
  prepareAnalyticsExport: (analyticsData, type = 'quarterly') => {
    if (!analyticsData) return null;
    
    switch (type) {
      case 'quarterly':
        return {
          className: `${analyticsData.class.grade_level} - ${analyticsData.class.section}`,
          quarter: analyticsData.quarter,
          schoolYear: analyticsData.class.school_year,
          students: analyticsData.students.map(student => ({
            name: student.full_name,
            lrn: student.lrn,
            ...student.grades,
            average: student.average
          })),
          summary: analyticsData.summary,
          honorRoll: analyticsData.honorRollSummary
        };
      
      case 'yearly':
        return {
          className: `${analyticsData.class.grade_level} - ${analyticsData.class.section}`,
          schoolYear: analyticsData.class.school_year,
          students: analyticsData.yearlyAverages.map(avg => ({
            name: `${avg.student.first_name} ${avg.student.last_name}`,
            lrn: avg.student.lrn,
            q1_average: avg.q1_average,
            q2_average: avg.q2_average,
            q3_average: avg.q3_average,
            q4_average: avg.q4_average,
            final_average: avg.final_average
          })),
          summary: analyticsData.summary,
          trends: analyticsData.trends
        };
        
      default:
        return analyticsData;
    }
  },

  // Validate quarter input
  validateQuarter: (quarter) => {
    const validQuarters = ['1', '2', '3', '4'];
    return validQuarters.includes(quarter.toString());
  },

  // Validate school year format
  validateSchoolYear: (schoolYear) => {
    if (!schoolYear) return true; // Optional parameter
    const yearPattern = /^\d{4}-\d{4}$/;
    return yearPattern.test(schoolYear);
  },

  // Clear analytics data
  clearAnalytics: () => {
    set({
      classAnalytics: null,
      yearlyAnalytics: null,
      subjectAnalytics: null,
      classComparison: null,
      error: null,
      message: null
    });
  },

  // Clear error and message
  clearMessages: () => {
    set({ error: null, message: null });
  },

  // Set loading state manually (for UI feedback)
  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  // Cache management for analytics data
  cacheKey: null,
  setCacheKey: (key) => {
    set({ cacheKey: key });
  },

  // Check if data needs refresh (optional feature)
  needsRefresh: (lastFetchTime, maxAge = 300000) => { // 5 minutes default
    if (!lastFetchTime) return true;
    return Date.now() - lastFetchTime > maxAge;
  }
}));