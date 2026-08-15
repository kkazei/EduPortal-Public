import { DataTypes } from 'sequelize';
import sequelize from '../db/dbConfig.js';

const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: true },
  user_email: { type: DataTypes.STRING, allowNull: true },
  user_role: { type: DataTypes.STRING, allowNull: true },
  action: { type: DataTypes.STRING(255), allowNull: false },
  method: { type: DataTypes.STRING(10), allowNull: false },
  path: { type: DataTypes.STRING(255), allowNull: false },
  entity_type: { type: DataTypes.STRING(50), allowNull: true },
  entity_id: { type: DataTypes.STRING(50), allowNull: true },
  ip_address: { type: DataTypes.STRING(64), allowNull: true },
  user_agent: { type: DataTypes.TEXT, allowNull: true },
  metadata: { type: DataTypes.JSON, allowNull: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'audit_logs',
  timestamps: true,
  underscored: true,
});

export default AuditLog;