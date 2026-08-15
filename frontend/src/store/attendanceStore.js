import { create } from "zustand";
import axios from "axios";
import { useSchoolYearStore } from './schoolYearStore';

const API_URL = import.meta.env.MODE === "development" ? "http://localhost:5000/api/attendance" : "/api/attendance";

axios.defaults.withCredentials = true;

export const useAttendanceStore = create((set, get) => ({
  studentAttendance: null,
  classAttendance: [],
  monthlySchoolDays: null, // { school_year, months: { June: 11, ... } }
  monthlySchoolDaysLoading: false,
  isLoading: false,
  error: null,
  message: null,
  
  // Get attendance records for a specific student
  getStudentAttendance: async (studentId, schoolYear = null) => {
    set({ isLoading: true, error: null });
    try {
      const selectedYear = schoolYear || useSchoolYearStore.getState().selected || null;
      const url = selectedYear 
        ? `${API_URL}/student/${studentId}/${selectedYear}`
        : `${API_URL}/student/${studentId}`;
        
      const response = await axios.get(url);
      
      set({ 
        studentAttendance: response.data, 
        isLoading: false 
      });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
      set({ 
        error: error.response?.data?.message || "Failed to fetch attendance records", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Update attendance for a specific month
  updateAttendance: async (studentId, classId, attendanceData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.put(
        `${API_URL}/student/${studentId}/class/${classId}`,
        attendanceData
      );
      
      // Update local state with new attendance data
      set(state => {
        if (state.studentAttendance) {
          // Find and update the specific month in the monthly array
          const updatedMonthly = state.studentAttendance.monthly.map(month => {
            if (month.month === attendanceData.month) {
              return {
                month: attendanceData.month,
                school_days: attendanceData.school_days,
                days_present: attendanceData.days_present,
                days_absent: attendanceData.days_absent,
                attendance_rate: (attendanceData.days_present / attendanceData.school_days * 100).toFixed(2)
              };
            }
            return month;
          });
          
          // If month doesn't exist yet, add it
          if (!updatedMonthly.some(m => m.month === attendanceData.month)) {
            updatedMonthly.push({
              month: attendanceData.month,
              school_days: attendanceData.school_days,
              days_present: attendanceData.days_present,
              days_absent: attendanceData.days_absent,
              attendance_rate: (attendanceData.days_present / attendanceData.school_days * 100).toFixed(2)
            });
          }
          
          return {
            studentAttendance: {
              ...state.studentAttendance,
              monthly: updatedMonthly,
              // We'd need to recalculate summary here, but we'll refetch the data instead
            },
            message: `Attendance for ${attendanceData.month} updated successfully`,
            isLoading: false
          };
        }
        
        return { 
          message: `Attendance for ${attendanceData.month} updated successfully`, 
          isLoading: false 
        };
      });
      
      // Refetch to get updated summary data
  await get().getStudentAttendance(studentId, attendanceData.school_year || useSchoolYearStore.getState().selected || null);
      
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to update attendance", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Bulk update attendance for multiple months
  bulkUpdateAttendance: async (studentId, classId, attendanceData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.put(
        `${API_URL}/bulk-update/${studentId}/class/${classId}`,
        attendanceData
      );
      
      set({ 
        message: "Attendance records updated successfully",
        isLoading: false 
      });
      
      // Refetch to get updated data
  await get().getStudentAttendance(studentId, attendanceData.school_year || useSchoolYearStore.getState().selected || null);
      
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to update attendance records", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Get attendance for all students in a class
  getClassAttendance: async (classId, month = null, schoolYear = null) => {
    set({ isLoading: true, error: null });
    try {
      let url = `${API_URL}/class/${classId}`;
      if (month) url += `/${month}`;
      if (schoolYear) url += `/${schoolYear}`;
      
      const response = await axios.get(url);
      
      set({ 
        classAttendance: response.data, 
        isLoading: false 
      });
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch class attendance", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Clear messages
  clearMessages: () => {
    set({ error: null, message: null });
  }
  ,
  // Fetch configured monthly school days (falls back to seeding on server)
  getMonthlySchoolDays: async (schoolYear = null) => {
    set({ monthlySchoolDaysLoading: true, error: null });
    try {
      const selectedYear = schoolYear || useSchoolYearStore.getState().selected || null;
      const url = selectedYear ? `${API_URL}/school-days/${selectedYear}` : `${API_URL}/school-days`;
      const res = await axios.get(url);
      set({ monthlySchoolDays: res.data, monthlySchoolDaysLoading: false });
      return res.data;
    } catch (error) {
      console.error('Failed to fetch monthly school days:', error);
      set({ error: error.response?.data?.message || 'Failed to fetch monthly school days', monthlySchoolDaysLoading: false });
      throw error;
    }
  },
  // Update (admin) monthly school days map
  updateMonthlySchoolDays: async (monthsMap, schoolYear = null) => {
    set({ monthlySchoolDaysLoading: true, error: null });
    try {
      const selectedYear = schoolYear || useSchoolYearStore.getState().selected || null;
      if (!selectedYear) throw new Error('No target school year selected');
      const res = await axios.put(`${API_URL}/school-days/${selectedYear}`, { months: monthsMap });
      set({ monthlySchoolDays: res.data, monthlySchoolDaysLoading: false, message: 'Monthly school days updated' });
      return res.data;
    } catch (error) {
      console.error('Failed to update monthly school days:', error);
      set({ error: error.response?.data?.message || 'Failed to update monthly school days', monthlySchoolDaysLoading: false });
      throw error;
    }
  }
}));