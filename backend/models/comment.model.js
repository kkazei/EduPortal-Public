import { DataTypes } from 'sequelize';
import sequelize from '../db/dbConfig.js';
import User from './user.model.js';

const Comment = sequelize.define('Comment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Comment content is required'
      },
      len: {
        args: [1, 1000],
        msg: 'Comment must be between 1 and 1000 characters'
      }
    }
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
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  parent_comment_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'comments',
      key: 'id'
    },
    onDelete: 'CASCADE',
    comment: 'For reply comments, this references the parent comment'
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
  }
}, {
  tableName: 'comments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'comments_announcement_id_idx',
      fields: ['announcement_id']
    },
    {
      name: 'comments_user_id_idx',
      fields: ['user_id']
    },
    {
      name: 'comments_parent_comment_id_idx',
      fields: ['parent_comment_id']
    }
  ]
});

// Define association with User model
Comment.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'author'
});

// Self-referencing association for replies
Comment.belongsTo(Comment, {
  foreignKey: 'parent_comment_id',
  as: 'parentComment'
});

Comment.hasMany(Comment, {
  foreignKey: 'parent_comment_id',
  as: 'replies'
});

export default Comment;