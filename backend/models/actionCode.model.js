import { DataTypes } from 'sequelize';
import sequelize from '../db/dbConfig.js';
import User from './user.model.js';

const ActionCode = sequelize.define('ActionCode', {
  action_type: {
    type: DataTypes.ENUM(
      'update_role',
      'delete_user',
      'restore_user',
      'export_audit_logs',
      'delete_audit_logs'
    ),
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING(12),
    allowNull: false,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  used_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  },
  target_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: true,
  underscored: true,
});

// Associations (defined here to avoid circular in index until imported)
User.hasMany(ActionCode, { foreignKey: 'user_id', as: 'actionCodes' });
ActionCode.belongsTo(User, { foreignKey: 'user_id', as: 'actor' });
ActionCode.belongsTo(User, { foreignKey: 'target_user_id', as: 'targetUser', constraints: false });

export default ActionCode;
