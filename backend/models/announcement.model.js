import { DataTypes } from 'sequelize';
import sequelize from '../db/dbConfig.js';
import User from './user.model.js';
import AnnouncementImage from './announcementImage.model.js';
import Comment from './comment.model.js';

const Announcement = sequelize.define('Announcement', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Announcement title is required'
      },
      len: {
        args: [3, 100],
        msg: 'Title must be between 3 and 100 characters'
      }
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Announcement content is required'
      }
    }
  },
  image_url: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL or path to the attached image'
  },
  publish_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'announcements',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'announcements_user_id_idx',
      fields: ['user_id']
    },
    {
      name: 'announcements_publish_date_idx',
      fields: ['publish_date']
    },
    {
      name: 'announcements_is_active_idx',
      fields: ['is_active']
    }
  ]
});

// Define association with User model
Announcement.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'creator'
});

// Define association with AnnouncementImage model
Announcement.hasMany(AnnouncementImage, {
  foreignKey: 'announcement_id',
  as: 'images',
  onDelete: 'CASCADE'
});

AnnouncementImage.belongsTo(Announcement, {
  foreignKey: 'announcement_id',
  as: 'announcement'
});

// Define association with Comment model
Announcement.hasMany(Comment, {
  foreignKey: 'announcement_id',
  as: 'comments',
  onDelete: 'CASCADE'
});

Comment.belongsTo(Announcement, {
  foreignKey: 'announcement_id',
  as: 'announcement'
});

// Static methods
Announcement.findActiveAnnouncements = function() {
  return this.findAll({
    where: {
      is_active: true,
      publish_date: {
        [sequelize.Sequelize.Op.lte]: new Date()
      }
    },
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'user_fullname', 'user_role']
      }
    ],
    order: [
      ['publish_date', 'DESC']
    ]
  });
};

export default Announcement;