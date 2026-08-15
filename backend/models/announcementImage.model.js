import { DataTypes } from 'sequelize';
import sequelize from '../db/dbConfig.js';
import Announcement from './announcement.model.js';

const AnnouncementImage = sequelize.define('AnnouncementImage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  announcement_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'announcements',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  image_url: {
    type: DataTypes.STRING,
    allowNull: false
  },
  display_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Order to display images in'
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
  tableName: 'announcement_images',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default AnnouncementImage;