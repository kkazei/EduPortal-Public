import { DataTypes } from 'sequelize';
import sequelize from '../db/dbConfig.js';
import SchoolYear from './schoolYear.model.js';

// Stores the configured number of school days per month per school year
const MonthlySchoolDay = sequelize.define('MonthlySchoolDay', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  school_year: {
    type: DataTypes.STRING(9),
    allowNull: false,
    comment: 'Format: YYYY-YYYY'
  },
  month: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  school_days: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'monthly_school_days',
  timestamps: true,
  underscored: true,
  indexes: [
    { unique: true, fields: ['school_year', 'month'], name: 'monthly_school_days_unique' }
  ]
});

// Default mapping for a typical school year (counts, not dates)
const DEFAULT_SCHOOL_DAYS_MAP = {
  June: 11,
  July: 23,
  August: 20,
  September: 22,
  October: 23,
  November: 21,
  December: 14,
  January: 21,
  February: 19,
  March: 23
};

// Seed defaults for a target (or active) school year if missing
export const seedDefaultMonthlySchoolDays = async (targetYear) => {
  try {
    const year = targetYear || await SchoolYear.getActiveYearName();
    const existing = await MonthlySchoolDay.findAll({ where: { school_year: year } });
    if (existing.length === Object.keys(DEFAULT_SCHOOL_DAYS_MAP).length) return year; // Already complete

    for (const [month, days] of Object.entries(DEFAULT_SCHOOL_DAYS_MAP)) {
      await MonthlySchoolDay.findOrCreate({
        where: { school_year: year, month },
        defaults: { school_days: days }
      });
    }
    return year;
  } catch (e) {
    console.error('Failed seeding default monthly school days:', e.message);
    return null;
  }
};

export const getDefaultsMap = () => ({ ...DEFAULT_SCHOOL_DAYS_MAP });

export default MonthlySchoolDay;
