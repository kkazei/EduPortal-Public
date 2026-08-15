import { DataTypes, Op } from 'sequelize'; // Added Op here
import sequelize from '../db/dbConfig.js';
import Class from './class.model.js';
import User from './user.model.js';
import Student from './student.model.js';

const Subject = sequelize.define('Subject', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  subject_code: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true,
    comment: 'Unique code identifier for the subject'
  },
  subject_name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Name of the subject'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of the subject content and objectives'
  },
  grade_level: {
    type: DataTypes.ENUM('Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'),
    allowNull: false,
    comment: 'Grade level for which this subject is intended'
  },
  teacher_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Foreign key referencing the teacher assigned to this subject'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether this subject is currently active'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  underscored: true,
  tableName: 'subjects',
  
  // Virtual fields
  getterMethods: {
    formatted_name() {
      return `${this.subject_code} - ${this.subject_name}`;
    }
  },
  
  // Hooks
  hooks: {
    beforeCreate: async (subject) => {
      // Capitalize the subject code
      if (subject.subject_code) {
        subject.subject_code = subject.subject_code.toUpperCase();
      }
    },
    
    beforeUpdate: async (subject) => {
      // Capitalize the subject code
      if (subject.changed('subject_code') && subject.subject_code) {
        subject.subject_code = subject.subject_code.toUpperCase();
      }
    }
  }
});



// Define the Grades model for students' subject grades
const Grade = sequelize.define('Grade', {
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
  subject_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'subjects',
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
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'School year when the grade was recorded'
  },
  q1_grade: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'First quarter grade'
  },
  q2_grade: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Second quarter grade'
  },
  q3_grade: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Third quarter grade'
  },
  q4_grade: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Fourth quarter grade'
  },
  final_grade: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Final grade (usually average of quarters)'
  },
  remarks: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Teacher remarks on student performance'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  underscored: true,
  tableName: 'grades',
  
  // Hooks to automatically calculate final grade when quarter grades are provided
  hooks: {
    beforeCreate: calculateFinalGrade,
    beforeUpdate: calculateFinalGrade
  }
});

// Function to calculate the final grade
function calculateFinalGrade(grade) {
  const q1 = parseFloat(grade.q1_grade);
  const q2 = parseFloat(grade.q2_grade);
  const q3 = parseFloat(grade.q3_grade);
  const q4 = parseFloat(grade.q4_grade);
  
  // Check if all quarter grades are available
  if (!isNaN(q1) && !isNaN(q2) && !isNaN(q3) && !isNaN(q4)) {
    const finalGrade = (q1 + q2 + q3 + q4) / 4;
    grade.final_grade = parseFloat(finalGrade.toFixed(2));
  }
}



// Create a default subjects data model by grade level
const defaultSubjectsData = {
  // Grade 1 (leave as is)
  "Grade 1": [
    {
      subject_code: "LANG1",
      subject_name: "Language",
      description: "Introduction to language skills including speaking, listening, and basic literacy.",
    },
    {
      subject_code: "READ1",
      subject_name: "Reading and Literacy",
      description: "Fundamental reading skills, phonics, and early literacy development.",
    },
    {
      subject_code: "MATH1",
      subject_name: "Mathematics",
      description: "Basic number concepts, counting, and simple arithmetic operations.",
    },
    {
      subject_code: "MAKB1",
      subject_name: "Makabansa",
      description: "Introduction to Filipino identity, culture, and civic awareness.",
    },
    {
      subject_code: "GMRC1",
      subject_name: "Good Manners and Right Conduct (GMRC)",
      description: "Good Manners and Right Conduct: basic values education and character formation.",
    },
    {
      subject_code: "SCIE1",
      subject_name: "SCIENCE",
      description: "Introduction to scientific concepts through observation and exploration.",
    },
    {
      subject_code: "COMP1",
      subject_name: "COMPUTER EDUCATION",
      description: "Basic computer literacy and introduction to educational technology.",
    }
  ],

  // Grade 2
  "Grade 2": [
    {
      subject_code: "FIL2",
      subject_name: "Filipino",
      description: "",
    },
    {
      subject_code: "ENG2",
      subject_name: "English",
      description: "",
    },
    {
      subject_code: "MATH2",
      subject_name: "Mathematics",
      description: "",
    },
    {
      subject_code: "SCIE2",
      subject_name: "Science",
      description: "",
    },
    {
      subject_code: "MAKB2",
      subject_name: "Makabansa / Araling Panlipunan",
      description: "",
    },
    {
      subject_code: "EPP2",
      subject_name: "EPP / TLE / Computer",
      description: "",
    },
    {
      subject_code: "GMRC2",
      subject_name: "GMRC",
      description: "",
    }
  ],

  // Grade 3
  "Grade 3": [
    {
      subject_code: "FIL3",
      subject_name: "Filipino",
      description: "",
    },
    {
      subject_code: "ENG3",
      subject_name: "English",
      description: "",
    },
    {
      subject_code: "MATH3",
      subject_name: "Mathematics",
      description: "",
    },
    {
      subject_code: "MAKB3",
      subject_name: "Makabansa / Araling Panlipunan",
      description: "",
    },
    {
      subject_code: "GMRC3",
      subject_name: "GMRC",
      description: "",
    },
    {
      subject_code: "SCIE3",
      subject_name: "Science",
      description: "",
    },
    {
      subject_code: "COMP3",
      subject_name: "Computer",
      description: "",
    }
  ],

  // Grade 4
  "Grade 4": [
    {
      subject_code: "FIL4",
      subject_name: "Filipino",
      description: "",
    },
    {
      subject_code: "ENG4",
      subject_name: "English",
      description: "",
    },
    {
      subject_code: "MATH4",
      subject_name: "Mathematics",
      description: "",
    },
    {
      subject_code: "AP4",
      subject_name: "Araling Panlipunan",
      description: "",
    },
    {
      subject_code: "MAPEH4",
      subject_name: "MAPEH",
      description: "",
    },
    {
      subject_code: "MUA4",
      subject_name: "Music and Arts",
      description: "",
    },
    {
      subject_code: "PEH4",
      subject_name: "Physical Education and Health",
      description: "",
    },
    {
      subject_code: "GMRC4",
      subject_name: "GMRC/Values Education",
      description: "",
    },
    {
      subject_code: "SCIE4",
      subject_name: "Science",
      description: "",
    },
    {
      subject_code: "EPP4",
      subject_name: "EPP/TLE",
      description: "",
    },
    {
      subject_code: "ELEC4",
      subject_name: "Elective",
      description: "",
    },
    {
      subject_code: "ICT4",
      subject_name: "ICT",
      description: "",
    },
    {
      subject_code: "ROB4",
      subject_name: "Robotics",
      description: "",
    }
  ]
};

// Helper function to seed default subjects
const seedDefaultSubjects = async () => {
  try {
    // Check if subjects already exist
    const count = await Subject.count();
    if (count > 0) {
      console.log('Subjects already seeded. Skipping...');
      return;
    }
    
    let createdCount = 0;
    
    // Create subjects for each grade level
    for (const gradeLevel in defaultSubjectsData) {
      const subjects = defaultSubjectsData[gradeLevel];
      for (const subject of subjects) {
        await Subject.create({
          ...subject,
          grade_level: gradeLevel
        });
        createdCount++;
      }
    }
    
    console.log(`Successfully seeded ${createdCount} default subjects.`);
  } catch (error) {
    console.error('Error seeding default subjects:', error);
  }
};

// This function will calculate the average grade for a given quarter across all subjects
const calculateAverageQuarterGrade = async (studentId, classId, quarter, schoolYear) => {
  try {
    if (!['q1', 'q2', 'q3', 'q4', 'final'].includes(quarter)) {
      throw new Error('Invalid quarter specified. Must be q1, q2, q3, q4, or final');
    }
    
    const gradeField = `${quarter}_grade`;
    
    // Find all grades for the student in the specified quarter
    const grades = await Grade.findAll({
      where: {
        student_id: studentId,
        class_id: classId,
        school_year: schoolYear,
        [gradeField]: {
          [Op.not]: null // Use Op.not instead of sequelize.Op.not
        }
      },
      attributes: ['subject_id', gradeField]
    });
    
    if (grades.length === 0) {
      return null; // No grades found for this quarter
    }
    
    // Calculate the average grade for the quarter
    let totalGrade = 0;
    let validGradeCount = 0;
    
    grades.forEach(grade => {
      const gradeValue = parseFloat(grade[gradeField]);
      if (!isNaN(gradeValue)) {
        totalGrade += gradeValue;
        validGradeCount++;
      }
    });
    
    if (validGradeCount === 0) {
      return null; // No valid grades to calculate average
    }
    
    // Calculate and round to 2 decimal places
    const averageGrade = parseFloat((totalGrade / validGradeCount).toFixed(2));
    return averageGrade;
  } catch (error) {
    console.error(`Error calculating average ${quarter} grade:`, error);
    throw error;
  }
};

// A function to calculate all quarter averages and final average for a student
const calculateStudentQuarterlyAverages = async (studentId, classId, schoolYear) => {
  try {
    const quarters = ['q1', 'q2', 'q3', 'q4'];
    const results = {};
    
    // Calculate average for each quarter
    for (const quarter of quarters) {
      results[quarter] = await calculateAverageQuarterGrade(
        studentId, classId, quarter, schoolYear
      );
    }
    
    // Calculate final average from quarter averages
    let validQuarterCount = 0;
    let totalQuarterAverage = 0;
    
    quarters.forEach(quarter => {
      if (results[quarter] !== null) {
        totalQuarterAverage += results[quarter];
        validQuarterCount++;
      }
    });
    
    if (validQuarterCount > 0) {
      results.final = parseFloat((totalQuarterAverage / validQuarterCount).toFixed(2));
    } else {
      results.final = null;
    }
    
    return {
      q1_average: results.q1,
      q2_average: results.q2,
      q3_average: results.q3,
      q4_average: results.q4,
      final_average: results.final,
      student_id: studentId,
      class_id: classId,
      school_year: schoolYear
    };
  } catch (error) {
    console.error('Error calculating student quarterly averages:', error);
    throw error;
  }
};

// Create a model to store the quarterly averages
const QuarterlyAverage = sequelize.define('QuarterlyAverage', {
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
    type: DataTypes.STRING,
    allowNull: false
  },
  q1_average: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Average of all subject grades for Quarter 1'
  },
  q2_average: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Average of all subject grades for Quarter 2'
  },
  q3_average: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Average of all subject grades for Quarter 3'
  },
  q4_average: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Average of all subject grades for Quarter 4'
  },
  final_average: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Final average of all quarterly averages'
  },
  remarks: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Overall remarks for the student'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  underscored: true,
  tableName: 'quarterly_averages',
  indexes: [
    {
      unique: true,
      fields: ['student_id', 'class_id', 'school_year']
    }
  ]
});



// Function to update or create quarterly averages for a student
const updateStudentQuarterlyAverages = async (studentId, classId, schoolYear) => {
  try {
    // Calculate the averages
    const averages = await calculateStudentQuarterlyAverages(studentId, classId, schoolYear);
    
    // Check if an entry already exists
    const [quarterlyAverage, created] = await QuarterlyAverage.findOrCreate({
      where: {
        student_id: studentId,
        class_id: classId,
        school_year: schoolYear
      },
      defaults: averages
    });
    
    // If the entry already exists, update it
    if (!created) {
      await quarterlyAverage.update(averages);
    }
    
    // Add remarks based on the final average
    let remarks = '';
    if (averages.final_average !== null) {
      if (averages.final_average >= 90) {
        remarks = 'Outstanding';
      } else if (averages.final_average >= 85) {
        remarks = 'Very Satisfactory';
      } else if (averages.final_average >= 80) {
        remarks = 'Satisfactory';
      } else if (averages.final_average >= 75) {
        remarks = 'Fairly Satisfactory';
      } else {
        remarks = 'Did Not Meet Expectations';
      }
      
      await quarterlyAverage.update({ remarks });
    }
    
    return quarterlyAverage;
  } catch (error) {
    console.error('Error updating quarterly averages:', error);
    throw error;
  }
};

// Modify Grade hooks to automatically update quarterly averages when grades change
const gradeHooks = {
  afterCreate: async (grade) => {
    await updateStudentQuarterlyAverages(
      grade.student_id, grade.class_id, grade.school_year
    );
  },
  afterUpdate: async (grade) => {
    if (grade.changed('q1_grade') || grade.changed('q2_grade') || 
        grade.changed('q3_grade') || grade.changed('q4_grade') || 
        grade.changed('final_grade')) {
      await updateStudentQuarterlyAverages(
        grade.student_id, grade.class_id, grade.school_year
      );
    }
  }
};

// Add these hooks to the Grade model
Grade.addHook('afterCreate', gradeHooks.afterCreate);
Grade.addHook('afterUpdate', gradeHooks.afterUpdate);

// Export models and helper functions
export { 
  Subject as default, 
  Grade, 
  QuarterlyAverage,
  defaultSubjectsData, 
  seedDefaultSubjects,
  calculateStudentQuarterlyAverages,
  updateStudentQuarterlyAverages
};