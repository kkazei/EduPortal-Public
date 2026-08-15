import { DataTypes } from 'sequelize';
import sequelize from '../db/dbConfig.js';
import User from './user.model.js';
import { Grade, QuarterlyAverage } from './subject.model.js';

const Class = sequelize.define('Class', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  grade_level: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Grade level of the class (e.g., Grade 1, Grade 2)'
  },
  section: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Section name of the class (e.g., Section A, Section B)'
  },
  adviser_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of the teacher who is the adviser for this class'
    // Remove the references section from here
  },
  adviser_name: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Name of the teacher who is the adviser for this class'
  },
  student_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of students enrolled in the class'
  },
  school_year: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'School year (e.g., 2024-2025)'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether the class is active or archived'
  },
  archived_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when the class was archived'
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Marks a class as permanently deleted (soft-delete to preserve analytics)'
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when the class was permanently deleted'
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
  tableName: 'classes'
});

export default Class;