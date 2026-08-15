import { DataTypes } from 'sequelize';
import sequelize from '../db/dbConfig.js';

const PushSubscription = sequelize.define('PushSubscription', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // Allow null for anonymous subscriptions
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  endpoint: {
    type: DataTypes.STRING(500), 
    allowNull: false,
    unique: true
  },
  p256dh: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  auth: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  device_info: {
    type: DataTypes.JSON,
    allowNull: true
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
  tableName: 'push_subscriptions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Add associations
import User from './user.model.js';

PushSubscription.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(PushSubscription, { foreignKey: 'user_id', as: 'pushSubscriptions' });

export default PushSubscription;