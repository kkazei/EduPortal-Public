import { DataTypes } from 'sequelize';
import sequelize from '../db/dbConfig.js';
import Class from './class.model.js';
import User from './user.model.js'; 
import bcrypt from 'bcryptjs'; // Import bcrypt for password hashing

const Student = sequelize.define('Student', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  lrn: {
    type: DataTypes.STRING(12),
    allowNull: false,
    unique: true,
    comment: 'Learner Reference Number (LRN) - 12-digit unique identifier for students'
  },
  first_name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'First name of the student'
  },
  middle_name: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Middle name of the student (optional)'
  },
  last_name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Last name of the student'
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Age of the student'
  },
  sex: {
    type: DataTypes.ENUM('Male', 'Female'),
    allowNull: false,
    comment: 'Sex/Gender of the student'
  },
  birthdate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Date of birth of the student'
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Address of the student'
  },
  contact_number: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Contact number of the student or guardian'
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    },
    comment: 'Email address of the student or guardian'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Foreign key referencing the user account for this student'
  },
  class_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'classes',
      key: 'id'
    },
    comment: 'Foreign key referencing the class the student belongs to'
  },
  enrollment_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Date when the student was enrolled'
  },
  status: {
    type: DataTypes.ENUM('Active', 'Inactive', 'Transferred', 'Graduated'),
    allowNull: false,
    defaultValue: 'Active',
    comment: 'Current status of the student'
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Soft delete flag for students'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  timestamps: true,
  underscored: true,
  tableName: 'students',
  
  // Virtual fields for full name and complete section/grade information
  getterMethods: {
    full_name() {
      const middleInitial = this.middle_name ? `${this.middle_name.charAt(0)}. ` : '';
      return `${this.first_name} ${middleInitial}${this.last_name}`;
    }
  },
  
  // Hooks to update the student count in the associated class and create user account
  hooks: {
    beforeCreate: async (student) => {
      // Generate a default password
      // Default password = LRN (12 digits). Fallback to last_name if LRN missing.
      const defaultPassword = (student.lrn && String(student.lrn).trim() !== '')
        ? String(student.lrn)
        : String(student.last_name || '');
      
      // Hash the password directly here
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      // Generate a default email if not provided
      let studentEmail;
      
      if (!student.email || student.email.trim() === '') {
        studentEmail = `${student.lrn}@gmail.com`; // Default email with domain
      } else {
        studentEmail = student.email;
      }
      
      // Create a user account for the student with the hashed password
      try {
        const user = await User.create({
          user_email: studentEmail,
          password: hashedPassword, // Now we're using the hashed password
          user_role: 'student',
          user_fullname: `${student.first_name} ${student.middle_name ? student.middle_name + ' ' : ''}${student.last_name}`,
        }, {
          hooks: false // Skip User model hooks since we already hashed the password
        });
        
        // Set the user_id on the student record
        student.user_id = user.id;
        
        console.log(`User account created for student with LRN: ${student.lrn}`);
      } catch (error) {
        console.error('Error creating user account for student:', error);
        throw new Error('Failed to create user account for student');
      }
    },
    
    afterCreate: async (student, options) => {
      if (student.class_id) {
        const tx = options?.transaction;
        const studentClass = await Class.findByPk(student.class_id, tx ? { transaction: tx } : undefined);
        if (studentClass) {
          await studentClass.increment('student_count', tx ? { transaction: tx } : undefined);
        }
      }
    },
    
    afterUpdate: async (student, options) => {
      // Update student count in classes
      if (student.changed('class_id') && student.previous('class_id')) {
        const tx = options?.transaction;
        // Decrement count from old class
        const oldClass = await Class.findByPk(student.previous('class_id'), tx ? { transaction: tx } : undefined);
        if (oldClass) {
          await oldClass.decrement('student_count', tx ? { transaction: tx } : undefined);
        }
        // Increment count in new class
        if (student.class_id) {
          const newClass = await Class.findByPk(student.class_id, tx ? { transaction: tx } : undefined);
          if (newClass) {
            await newClass.increment('student_count', tx ? { transaction: tx } : undefined);
          }
        }
      }
      
      // Update related user account if name has changed
      if (student.changed('first_name') || student.changed('last_name')) {
        if (student.user_id) {
          try {
            await User.update(
              { user_fullname: `${student.first_name} ${student.last_name}` },
              { where: { id: student.user_id } }
            );
          } catch (error) {
            console.error('Error updating user name for student:', error);
          }
        }
      }
    },
    
    beforeDestroy: async (student) => {
      // Optional: Handle user account deletion or deactivation when student is deleted
      if (student.user_id) {
        try {
          // Option 1: Delete the user account
          // await User.destroy({ where: { id: student.user_id } });
          
          // Option 2: Deactivate the user account (safer)
          await User.update(
            { is_active: false },
            { where: { id: student.user_id } }
          );
        } catch (error) {
          console.error('Error deactivating user account for deleted student:', error);
        }
      }
    }
  }
});

export default Student;