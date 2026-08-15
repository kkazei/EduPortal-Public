import { Attendance, AttendanceSummary, updateAttendanceSummary } from '../models/attendance.model.js';
import MonthlySchoolDay from '../models/monthlySchoolDay.model.js';
import Student from '../models/student.model.js';
import Class from '../models/class.model.js';
import SchoolYear from '../models/schoolYear.model.js';

// Get attendance for a specific student
export const getStudentAttendance = async (req, res) => {
  try {
    const { studentId, schoolYear } = req.params;
    
    // Validate studentId
    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required' });
    }
    
    // Get current school year if not provided
  const targetSchoolYear = schoolYear || await SchoolYear.getActiveYearName();
    
    // Check if the Attendance model exists in the database
    try {
      // Fetch existing monthly attendance records
      const monthlyAttendance = await Attendance.findAll({
        where: { student_id: studentId, school_year: targetSchoolYear },
        order: [['id', 'ASC']]
      });

      // Build map of existing records for quick lookup
      const attendanceMap = {};
      monthlyAttendance.forEach(r => { attendanceMap[r.month] = r; });

      // Fetch monthly default school days for the year
      let defaultsMap = {};
      try {
        const defaultsRows = await MonthlySchoolDay.findAll({ where: { school_year: targetSchoolYear } });
        defaultsRows.forEach(row => { defaultsMap[row.month] = row.school_days; });
      } catch (e) {
        // Non-fatal; defaultsMap stays empty
        console.warn('MonthlySchoolDay lookup failed:', e.message);
      }
      
      // Get attendance summary for the school year
      const attendanceSummary = await AttendanceSummary.findOne({
        where: {
          student_id: studentId,
          school_year: targetSchoolYear
        }
      });
      
      // Ordered list of months we care about
      const MONTHS_ORDER = ['June','July','August','September','October','November','December','January','February','March'];

      // Build monthly array merging defaults + existing records
      const monthly = MONTHS_ORDER.map(m => {
        const rec = attendanceMap[m];
        const schoolDays = rec?.school_days ?? defaultsMap[m] ?? 0;
        const daysPresent = rec?.days_present ?? 0;
        const daysAbsent = rec?.days_absent ?? 0;
        return {
          month: m,
          school_days: schoolDays,
            days_present: daysPresent,
            days_absent: daysAbsent,
            attendance_rate: schoolDays > 0 ? ((daysPresent / schoolDays) * 100).toFixed(2) : '0.00'
        };
      });
      
      // Format the response
      const response = {
        student_id: studentId,
        school_year: targetSchoolYear,
        monthly,
        summary: attendanceSummary ? {
          total_school_days: attendanceSummary.total_school_days || 0,
          total_days_present: attendanceSummary.total_days_present || 0,
          total_days_absent: attendanceSummary.total_days_absent || 0,
          overall_attendance_rate: attendanceSummary.total_school_days > 0
            ? ((attendanceSummary.total_days_present / attendanceSummary.total_school_days) * 100).toFixed(2)
            : "0.00"
        } : null
      };
      
      return res.status(200).json(response);
    } catch (modelError) {
      // If there's an error with the models, return empty data structure
      console.error('Database model error:', modelError);
      return res.status(200).json({
        student_id: studentId,
        school_year: targetSchoolYear,
        monthly: [],
        summary: null,
        message: 'Attendance system is being initialized'
      });
    }
    
  } catch (error) {
    console.error('Error getting student attendance:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve attendance records', 
      error: error.message 
    });
  }
};

// Bulk update attendance (simplified)
export const bulkUpdateAttendance = async (req, res) => {
  try {
    const { studentId, classId } = req.params;
    const { entries, school_year } = req.body;
    
    // Validate input
    if (!entries || !Array.isArray(entries)) {
      return res.status(400).json({ message: 'Invalid attendance data provided' });
    }
    
    if (!studentId || !classId) {
      return res.status(400).json({ message: 'Student ID and Class ID are required' });
    }
    
    // Get current school year if not provided
  const targetSchoolYear = school_year || await SchoolYear.getActiveYearName();
    
    try {
      // Fetch monthly defaults map for fallback
      const monthlyDefaults = {};
      const defaultsRows = await MonthlySchoolDay.findAll({ where: { school_year: targetSchoolYear } });
      defaultsRows.forEach(r => { monthlyDefaults[r.month] = r.school_days; });

      // Process each month's attendance with better error handling
      for (const monthData of entries) {
        // Skip months with no school days
        const effectiveSchoolDays = (monthData.school_days ?? monthlyDefaults[monthData.month]) || 0;
        if (effectiveSchoolDays <= 0) {
          continue;
        }
        
        // Validate month data
        if (!monthData.month || 
            isNaN(monthData.school_days) || 
            isNaN(monthData.days_present) || 
            isNaN(monthData.days_absent)) {
          console.warn(`Skipping invalid data for month: ${monthData.month}`);
          continue;
        }
        
        // Find or create the attendance record
        const [attendance, created] = await Attendance.findOrCreate({
          where: {
            student_id: studentId,
            class_id: classId,
            month: monthData.month,
            school_year: targetSchoolYear
          },
          defaults: {
            school_days: effectiveSchoolDays,
            days_present: monthData.days_present,
            days_absent: monthData.days_absent
          }
        });
        
        // If record existed, update it
        if (!created) {
          await attendance.update({
            school_days: effectiveSchoolDays,
            days_present: monthData.days_present,
            days_absent: monthData.days_absent
          });
        }
      }
      
      // Try to update attendance summary, but don't fail if it doesn't work
      try {
        await updateAttendanceSummary(studentId, classId, targetSchoolYear);
      } catch (summaryError) {
        console.error('Error updating attendance summary:', summaryError);
      }
      
      // Get updated attendance records with simpler query
      const updatedAttendance = await Attendance.findAll({
        where: {
          student_id: studentId,
          class_id: classId,
          school_year: targetSchoolYear
        },
        order: [['id', 'ASC']]
      });
      
      return res.status(200).json({
        message: 'Attendance records updated successfully',
        school_year: targetSchoolYear,
        attendance: updatedAttendance.map(record => ({
          month: record.month,
          school_days: record.school_days,
          days_present: record.days_present,
          days_absent: record.days_absent,
          attendance_rate: record.school_days > 0
            ? ((record.days_present / record.school_days) * 100).toFixed(2)
            : "0.00"
        }))
      });
      
    } catch (dbError) {
      // If there's a database error, return a helpful message
      console.error('Database error during attendance update:', dbError);
      return res.status(500).json({ 
        message: 'Database error updating attendance records. The attendance tables may need to be created.',
        error: dbError.message
      });
    }
    
  } catch (error) {
    console.error('Error updating attendance in bulk:', error);
    return res.status(500).json({ 
      message: 'Failed to update attendance records', 
      error: error.message 
    });
  }
};

// Update the simplified function to actually do the work
export const updateAttendance = async (req, res) => {
  try {
    const { studentId, classId } = req.params;
    const { month, school_days, days_present, days_absent, school_year } = req.body;
    
    // Validate input
    if (!month || isNaN(school_days) || isNaN(days_present) || isNaN(days_absent)) {
      return res.status(400).json({ message: 'Invalid attendance data provided' });
    }
    
    // Get current school year if not provided
  const targetSchoolYear = school_year || await SchoolYear.getActiveYearName();
    
    try {
      // Find or create the attendance record
      const [attendance, created] = await Attendance.findOrCreate({
        where: {
          student_id: studentId,
          class_id: classId,
          month: month,
          school_year: targetSchoolYear
        },
        defaults: {
          school_days,
          days_present,
          days_absent
        }
      });
      
      // If record existed, update it
      // If school_days was not provided or zero, fallback to default configured value
      let effectiveSchoolDays = school_days;
      if (!effectiveSchoolDays || effectiveSchoolDays === 0) {
        try {
          const defaultRow = await MonthlySchoolDay.findOne({ where: { school_year: targetSchoolYear, month } });
          if (defaultRow) effectiveSchoolDays = defaultRow.school_days;
        } catch (e) {
          // ignore
        }
      }

      if (!created) {
        await attendance.update({
          school_days: effectiveSchoolDays,
          days_present,
          days_absent
        });
      } else if (effectiveSchoolDays !== school_days) {
        // newly created with provided school_days, adjust if we found a default fallback
        await attendance.update({ school_days: effectiveSchoolDays });
      }
      
      // Try to update attendance summary
      try {
        await updateAttendanceSummary(studentId, classId, targetSchoolYear);
      } catch (summaryError) {
        console.error('Error updating attendance summary:', summaryError);
      }
      
      return res.status(200).json({
        message: `Attendance for ${month} updated successfully`,
        attendance: {
          month,
          school_days: effectiveSchoolDays,
          days_present,
          days_absent,
          attendance_rate: effectiveSchoolDays > 0 ? ((days_present / effectiveSchoolDays) * 100).toFixed(2) : '0.00'
        }
      });
    } catch (dbError) {
      console.error('Database error during attendance update:', dbError);
      return res.status(500).json({ 
        message: 'Database error updating attendance record',
        error: dbError.message
      });
    }
  } catch (error) {
    console.error('Error updating attendance:', error);
    return res.status(500).json({ message: 'Failed to update attendance', error: error.message });
  }
};

// Simplified class attendance getter
export const getClassAttendance = async (req, res) => {
  try {
    const { classId, month, schoolYear } = req.params;
    
    // Return empty array for now
    return res.status(200).json([]);
  } catch (error) {
    console.error('Error getting class attendance:', error);
    return res.status(500).json({ message: 'Failed to retrieve class attendance records', error: error.message });
  }
};