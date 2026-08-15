import sequelize from '../db/dbConfig.js';
import User from './user.model.js';
import Class from './class.model.js';
import Student from './student.model.js';
import Subject, { Grade, QuarterlyAverage } from './subject.model.js';
import Visitor from './visitor.model.js';
import ActionCode from './actionCode.model.js';

// Set up all associations here to avoid circular imports
const setupAssociations = () => {
  // User associations
  User.hasMany(Class, { foreignKey: 'adviser_id', as: 'advisedClasses' });
  User.hasMany(Subject, { foreignKey: 'teacher_id', as: 'taughtSubjects' });
  User.hasOne(Student, { foreignKey: 'user_id', as: 'studentProfile' });

  // Class associations
  Class.belongsTo(User, { foreignKey: 'adviser_id', as: 'adviser', constraints: false });
  Class.hasMany(Student, { foreignKey: 'class_id', as: 'students' });
  Class.hasMany(Grade, { foreignKey: 'class_id', as: 'classGrades' }); // Changed alias
  Class.hasMany(QuarterlyAverage, { foreignKey: 'class_id', as: 'classQuarterlyAverages' }); // Changed alias
  Class.belongsToMany(Subject, { 
    through: 'class_subjects',
    foreignKey: 'class_id',
    otherKey: 'subject_id',
    as: 'subjects'
  });

  // Student associations
  Student.belongsTo(Class, { foreignKey: 'class_id', as: 'class', onDelete: 'SET NULL' });
  Student.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  Student.hasMany(Grade, { foreignKey: 'student_id', as: 'grades' }); // Keep this alias
  Student.hasMany(QuarterlyAverage, { foreignKey: 'student_id', as: 'quarterlyAverages' }); // Keep this alias

  // Subject associations
  Subject.belongsTo(User, { foreignKey: 'teacher_id', as: 'teacher', constraints: false });
  Subject.hasMany(Grade, { foreignKey: 'subject_id', as: 'subjectGrades' });
  Subject.belongsToMany(Class, { 
    through: 'class_subjects',
    foreignKey: 'subject_id',
    otherKey: 'class_id',
    as: 'classes'
  });

  // Grade associations
  Grade.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
  Grade.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });
  Grade.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });

  // QuarterlyAverage associations
  QuarterlyAverage.belongsTo(Student, { foreignKey: 'student_id', as: 'student' });
  QuarterlyAverage.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });

  // ActionCode associations (already partially defined in model file)
  // Note: User.hasMany(ActionCode) & ActionCode.belongsTo(User) declared in model to avoid circular import order issues.
};

// Call setup function
setupAssociations();

export {
  sequelize,
  User,
  Class,
  Student,
  Subject,
  Grade,
  QuarterlyAverage,
  Visitor,
  ActionCode
};

export { sequelize as Sequelize }; // Export as Sequelize for backward compatibility