import { DataTypes } from 'sequelize';
import sequelize from '../db/dbConfig.js';
// Import models with dynamic imports to prevent circular dependencies
import Student from './student.model.js';
import Class from './class.model.js';

// Attendance Model - for monthly attendance records
const Attendance = sequelize.define('Attendance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'students',
      key: 'id'
    }
  },
  class_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'classes',
      key: 'id'
    }
  },
  school_year: {
    type: DataTypes.STRING(9),
    allowNull: false,
    comment: 'Format: YYYY-YYYY (e.g., 2023-2024)'
  },
  month: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: 'Month name (e.g., "July", "August")'
  },
  school_days: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Total number of school days in this month'
  },
  days_present: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of days the student was present'
  },
  days_absent: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of days the student was absent'
  }
}, {
  timestamps: true,
  underscored: true,
  tableName: 'attendances',
  indexes: [
    {
      unique: true,
      fields: ['student_id', 'class_id', 'school_year', 'month'],
      name: 'attendance_unique_constraint'
    }
  ]
});

// Static method instead of prototype to avoid "this" binding issues
Attendance.calculateRate = function(schoolDays, daysPresent) {
  if (!schoolDays || schoolDays === 0) return 0;
  return ((daysPresent / schoolDays) * 100).toFixed(2);
};

// Summary Model - for school year totals
const AttendanceSummary = sequelize.define('AttendanceSummary', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'students',
      key: 'id'
    }
  },
  class_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'classes',
      key: 'id'
    }
  },
  school_year: {
    type: DataTypes.STRING(9),
    allowNull: false,
    comment: 'Format: YYYY-YYYY (e.g., 2023-2024)'
  },
  total_school_days: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Total number of school days in the school year'
  },
  total_days_present: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Total number of days the student was present'
  },
  total_days_absent: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Total number of days the student was absent'
  }
}, {
  timestamps: true,
  underscored: true,
  tableName: 'attendance_summaries',
  indexes: [
    {
      unique: true,
      fields: ['student_id', 'class_id', 'school_year'],
      name: 'attendance_summary_unique_constraint'
    }
  ]
});

// Static method for calculating overall rate
AttendanceSummary.calculateOverallRate = function(totalSchoolDays, totalDaysPresent) {
  if (!totalSchoolDays || totalSchoolDays === 0) return 0;
  return ((totalDaysPresent / totalSchoolDays) * 100).toFixed(2);
};

// Function to sync tables explicitly
const syncAttendanceTables = async () => {
  try {
    await Attendance.sync();
    await AttendanceSummary.sync();
    console.log("Attendance tables synchronized successfully");
    return true;
  } catch (error) {
    console.error("Error synchronizing attendance tables:", error);
    return false;
  }
};

// Function to update attendance summary after attendance record changes
const updateAttendanceSummary = async (studentId, classId, schoolYear) => {
  if (!studentId || !classId || !schoolYear) {
    console.error("Missing required parameters for updateAttendanceSummary");
    return null;
  }
  
  try {
    // Get all monthly attendance records for this student and school year
    const monthlyAttendance = await Attendance.findAll({
      where: {
        student_id: studentId,
        class_id: classId,
        school_year: schoolYear
      }
    });
    
    // Calculate totals
    let totalSchoolDays = 0;
    let totalDaysPresent = 0;
    let totalDaysAbsent = 0;
    
    monthlyAttendance.forEach(record => {
      totalSchoolDays += record.school_days || 0;
      totalDaysPresent += record.days_present || 0;
      totalDaysAbsent += record.days_absent || 0;
    });
    
    // Update or create summary record
    let summary;
    try {
      // Find existing summary
      summary = await AttendanceSummary.findOne({
        where: {
          student_id: studentId,
          class_id: classId,
          school_year: schoolYear
        }
      });
      
      if (summary) {
        // Update existing
        await summary.update({
          total_school_days: totalSchoolDays,
          total_days_present: totalDaysPresent,
          total_days_absent: totalDaysAbsent
        });
      } else {
        // Create new
        summary = await AttendanceSummary.create({
          student_id: studentId,
          class_id: classId,
          school_year: schoolYear,
          total_school_days: totalSchoolDays,
          total_days_present: totalDaysPresent,
          total_days_absent: totalDaysAbsent
        });
      }
    } catch (summaryError) {
      console.error("Error updating attendance summary:", summaryError);
    }
    
    return summary;
  } catch (error) {
    console.error("Error updating attendance summary:", error);
    // Return null instead of throwing to prevent crashes
    return null;
  }
};

// Set up associations in a try-catch to prevent crashes
try {
  Attendance.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
  Attendance.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });
  
  AttendanceSummary.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
  AttendanceSummary.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });
} catch (error) {
  console.error("Error setting up attendance associations:", error);
}

export { 
  Attendance, 
  AttendanceSummary, 
  updateAttendanceSummary,
  syncAttendanceTables
};
export default Attendance;