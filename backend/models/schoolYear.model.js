import { DataTypes } from 'sequelize';
import sequelize from '../db/dbConfig.js';

const SchoolYear = sequelize.define('SchoolYear', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(9),
    allowNull: false,
    unique: true,
    comment: 'Format: YYYY-YYYY (e.g., 2025-2026)'
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
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
  tableName: 'school_years',
  timestamps: true,
  underscored: true
});

// Helper to get the active school year instance
SchoolYear.getActive = async function() {
  const active = await SchoolYear.findOne({ where: { is_active: true } });
  return active || null;
};

// Helper to get the active year name, fallback to computed current year span if none
SchoolYear.getActiveYearName = async function() {
  const active = await SchoolYear.getActive();
  if (active?.name) return active.name;
  // Fallback: compute academic year span from current date
  const today = new Date();
  const year = today.getFullYear();
  // If start/end are not defined, assume academic year spans current->next
  return `${year}-${year + 1}`;
};

// Ensure only one active at a time
SchoolYear.activate = async function(id) {
  const t = await sequelize.transaction();
  try {
    await SchoolYear.update({ is_active: false }, { where: {}, transaction: t });
    const [count] = await SchoolYear.update({ is_active: true }, { where: { id }, transaction: t });
    await t.commit();
    return count > 0;
  } catch (e) {
    await t.rollback();
    throw e;
  }
};

export default SchoolYear;
