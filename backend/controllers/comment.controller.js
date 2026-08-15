import Comment from '../models/comment.model.js';
import User from '../models/user.model.js';
import Announcement from '../models/announcement.model.js';
import PushSubscription from '../models/pushSubscription.model.js';
import webpush from 'web-push';
import { Op } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Configure web-push with your VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:eduportal.sses@gmail.com',
    vapidPublicKey,
    vapidPrivateKey
  );
}

// Helper function to send notification to a specific user
const sendNotificationToUser = async (userId, notificationPayload) => {
  try {
    console.log(`Sending notification to user ${userId}:`, notificationPayload.title);
    
    // Get all active subscriptions for this user
    const subscriptions = await PushSubscription.findAll({
      where: {
        user_id: userId,
        is_active: true
      }
    });

    if (subscriptions.length === 0) {
      console.log(`No active subscriptions found for user ${userId}`);
      return { success: false, message: 'No active subscriptions' };
    }

    const promises = subscriptions.map(async (subscription) => {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        };

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(notificationPayload)
        );

        console.log(`Notification sent successfully to subscription ${subscription.id}`);
        return { success: true, subscriptionId: subscription.id };
      } catch (error) {
        console.error(`Failed to send notification to subscription ${subscription.id}:`, error);
        
        // If subscription is invalid, mark it as inactive
        if (error.statusCode === 410 || error.statusCode === 404) {
          await subscription.update({ is_active: false });
          console.log(`Marked subscription ${subscription.id} as inactive`);
        }
        
        return { success: false, subscriptionId: subscription.id, error: error.message };
      }
    });

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.success).length;
    
    console.log(`Sent notifications to ${successCount}/${subscriptions.length} subscriptions for user ${userId}`);
    
    return {
      success: successCount > 0,
      totalSubscriptions: subscriptions.length,
      successCount,
      results
    };
  } catch (error) {
    console.error('Error in sendNotificationToUser:', error);
    return { success: false, error: error.message };
  }
};

// Get all comments for an announcement with nested replies
export const getCommentsByAnnouncement = async (req, res) => {
  try {
    const { announcementId } = req.params;
    const { limit = 20, page = 1 } = req.query;

    // Check if announcement exists
    const announcement = await Announcement.findByPk(announcementId);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    const offset = (page - 1) * limit;

    // Recursive function to get nested replies
    const getRepliesRecursive = async (parentId, maxDepth = 5, currentDepth = 0) => {
      if (currentDepth >= maxDepth) return [];
      
      const replies = await Comment.findAll({
        where: {
          parent_comment_id: parentId,
          announcement_id: announcementId
        },
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'user_fullname', 'user_role']
          }
        ],
        order: [['created_at', 'ASC']]
      });

      // Get nested replies for each reply
      for (const reply of replies) {
        reply.dataValues.replies = await getRepliesRecursive(reply.id, maxDepth, currentDepth + 1);
      }

      return replies;
    };

    // Get top-level comments
    const topLevelComments = await Comment.findAndCountAll({
      where: {
        announcement_id: announcementId,
        parent_comment_id: null // Only top-level comments
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'user_fullname', 'user_role']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Get nested replies for each top-level comment
    for (const comment of topLevelComments.rows) {
      comment.dataValues.replies = await getRepliesRecursive(comment.id);
    }

    const totalPages = Math.ceil(topLevelComments.count / limit);

    res.status(200).json({
      success: true,
      count: topLevelComments.count,
      totalPages,
      currentPage: parseInt(page),
      data: topLevelComments.rows
    });
  } catch (error) {
    console.error('Error getting comments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve comments',
      error: error.message
    });
  }
};

// Create a new comment or reply (handles nested replies)
export const createComment = async (req, res) => {
  try {
    const { announcementId } = req.params;
    const { content, parent_comment_id } = req.body;

    // Validate input
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      });
    }

    // Check if announcement exists and get creator info
    const announcement = await Announcement.findByPk(announcementId, {
      attributes: ['id', 'title', 'user_id'],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'user_fullname', 'user_role']
        }
      ]
    });
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    let parentComment = null;
    let rootCommentId = null;

    // If it's a reply, check if parent comment exists
    if (parent_comment_id) {
      parentComment = await Comment.findOne({
        where: {
          id: parent_comment_id,
          announcement_id: announcementId
        },
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'user_fullname', 'user_role']
          }
        ]
      });
      
      if (!parentComment) {
        return res.status(404).json({
          success: false,
          message: 'Parent comment not found'
        });
      }

      // Find the root comment (for notification purposes)
      rootCommentId = parentComment.parent_comment_id || parentComment.id;
    }

    // Create the comment/reply
    const newComment = await Comment.create({
      content: content.trim(),
      announcement_id: announcementId,
      user_id: req.user.id,
      parent_comment_id: parent_comment_id || null
    });

    // Get the complete comment with author information
    const comment = await Comment.findByPk(newComment.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'user_fullname', 'user_role']
        }
      ]
    });

    // Get commenter's name with proper fallback
    const commenterName = comment.author?.user_fullname || req.user.user_fullname || req.user.username || 'Anonymous User';
    const shortContent = content.length > 100 ? content.substring(0, 100) + '...' : content;
    const announcementTitle = announcement.title.length > 50 ? 
      announcement.title.substring(0, 50) + '...' : announcement.title;

    // Send notification to announcement creator (if it's not their own comment)
    if (announcement.creator && announcement.creator.id !== req.user.id) {
      try {
        const isReply = parent_comment_id !== null;
        const notificationTitle = isReply ? 
          '💬 New Reply on Your Post' : 
          '💬 New Comment on Your Post';
        
        const announcementCreatorPayload = {
          title: notificationTitle,
          body: `${commenterName} ${isReply ? 'replied' : 'commented'}: "${shortContent}"`,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: `announcement-comment-${announcementId}-${Date.now()}`,
          data: {
            type: 'announcement_comment',
            announcementId: announcementId,
            announcementTitle: announcement.title,
            commentId: newComment.id,
            commenterName: commenterName,
            commentContent: content,
            isReply: isReply,
            url: `/announcement/${announcementId}#comment-${newComment.id}`,
            timestamp: new Date().toISOString()
          },
          actions: [
            {
              action: 'view',
              title: '👀 View Comment',
              icon: '/favicon.ico'
            },
            {
              action: 'dismiss',
              title: '❌ Dismiss'
            }
          ],
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 200]
        };
        
        await sendNotificationToUser(announcement.creator.id, announcementCreatorPayload);
        
        console.log(`✅ Comment notification sent to announcement creator ${announcement.creator.id} (${announcement.creator.user_fullname})`);
      } catch (notificationError) {
        console.error('❌ Error sending comment notification to announcement creator:', notificationError);
        // Don't fail the comment creation if notification fails
      }
    }

    // Send notification if this is a reply to someone else's comment (existing logic)
    if (parentComment && parentComment.author && parentComment.author.id !== req.user.id) {
      try {
        // Don't send reply notification if it's to the announcement creator (they already got one)
        if (parentComment.author.id !== announcement.creator.id) {
          const isNestedReply = parentComment.parent_comment_id !== null;
          const notificationTitle = isNestedReply ? 
            '💬 New Reply to Your Reply' : 
            '💬 New Reply to Your Comment';
          
          const replyNotificationPayload = {
            title: notificationTitle,
            body: `${commenterName} replied: "${shortContent}"`,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `reply-${parentComment.id}-${Date.now()}`,
            data: {
              type: 'comment_reply',
              announcementId: announcementId,
              announcementTitle: announcement.title,
              parentCommentId: parentComment.id,
              rootCommentId: rootCommentId,
              replyId: newComment.id,
              replyAuthor: commenterName,
              replyContent: content,
              isNestedReply: isNestedReply,
              url: `/announcement/${announcementId}#comment-${rootCommentId || parentComment.id}`,
              timestamp: new Date().toISOString()
            },
            actions: [
              {
                action: 'view',
                title: '👀 View Reply',
                icon: '/favicon.ico'
              },
              {
                action: 'dismiss',
                title: '❌ Dismiss'
              }
            ],
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200]
          };
          
          await sendNotificationToUser(parentComment.author.id, replyNotificationPayload);
          
          console.log(`✅ Reply notification sent to user ${parentComment.author.id} (${parentComment.author.user_fullname})`);
        }
      } catch (notificationError) {
        console.error('❌ Error sending reply notification:', notificationError);
        // Don't fail the comment creation if notification fails
      }
    }

    res.status(201).json({
      success: true,
      message: 'Comment created successfully',
      data: comment
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create comment',
      error: error.message
    });
  }
};

// Update a comment
export const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;

    // Validate input
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      });
    }

    // Find the comment
    const comment = await Comment.findByPk(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if user owns the comment or is admin
    if (comment.user_id !== req.user.id && req.user.user_role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this comment'
      });
    }

    // Update the comment
    await comment.update({
      content: content.trim()
    });

    // Get updated comment with author info
    const updatedComment = await Comment.findByPk(commentId, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'user_fullname', 'user_role']
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Comment updated successfully',
      data: updatedComment
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update comment',
      error: error.message
    });
  }
};

// Delete a comment (and all its nested replies)
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    // Find the comment
    const comment = await Comment.findByPk(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if user owns the comment or is admin
    if (comment.user_id !== req.user.id && req.user.user_role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this comment'
      });
    }

    // Recursive function to delete all nested replies
    const deleteRepliesRecursive = async (parentId) => {
      const replies = await Comment.findAll({
        where: { parent_comment_id: parentId }
      });

      for (const reply of replies) {
        // First delete all replies to this reply
        await deleteRepliesRecursive(reply.id);
        // Then delete the reply itself
        await reply.destroy();
      }
    };

    // Delete all nested replies first
    await deleteRepliesRecursive(commentId);

    // Then delete the comment itself
    await comment.destroy();

    res.status(200).json({
      success: true,
      message: 'Comment and all replies deleted successfully',
      data: { id: commentId }
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete comment',
      error: error.message
    });
  }
};

// Get replies for a specific comment (with nested structure)
export const getRepliesByComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { limit = 50, page = 1 } = req.query;

    // Check if parent comment exists
    const parentComment = await Comment.findByPk(commentId);
    if (!parentComment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const offset = (page - 1) * limit;

    // Recursive function to get nested replies
    const getRepliesRecursive = async (parentId, maxDepth = 5, currentDepth = 0) => {
      if (currentDepth >= maxDepth) return [];
      
      const replies = await Comment.findAll({
        where: {
          parent_comment_id: parentId
        },
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'user_fullname', 'user_role']
          }
        ],
        order: [['created_at', 'ASC']]
      });

      // Get nested replies for each reply
      for (const reply of replies) {
        reply.dataValues.replies = await getRepliesRecursive(reply.id, maxDepth, currentDepth + 1);
      }

      return replies;
    };

    // Get direct replies with their nested structure
    const directReplies = await Comment.findAndCountAll({
      where: {
        parent_comment_id: commentId
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'user_fullname', 'user_role']
        }
      ],
      order: [['created_at', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Get nested replies for each direct reply
    for (const reply of directReplies.rows) {
      reply.dataValues.replies = await getRepliesRecursive(reply.id);
    }

    const totalPages = Math.ceil(directReplies.count / limit);

    res.status(200).json({
      success: true,
      count: directReplies.count,
      totalPages,
      currentPage: parseInt(page),
      data: directReplies.rows
    });
  } catch (error) {
    console.error('Error getting replies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve replies',
      error: error.message
    });
  }
};

// Get comment statistics for an announcement
export const getCommentStats = async (req, res) => {
  try {
    const { announcementId } = req.params;

    // Check if announcement exists
    const announcement = await Announcement.findByPk(announcementId);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Get total comment count (including all nested replies)
    const totalComments = await Comment.count({
      where: {
        announcement_id: announcementId
      }
    });

    // Get top-level comment count
    const topLevelComments = await Comment.count({
      where: {
        announcement_id: announcementId,
        parent_comment_id: null
      }
    });

    // Get unique commenters count
    const uniqueCommenters = await Comment.count({
      where: {
        announcement_id: announcementId
      },
      distinct: true,
      col: 'user_id'
    });

    // Get recent activity (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentComments = await Comment.count({
      where: {
        announcement_id: announcementId,
        created_at: {
          [Op.gte]: yesterday
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalComments,
        topLevelComments,
        totalReplies: totalComments - topLevelComments,
        uniqueCommenters,
        recentComments
      }
    });
  } catch (error) {
    console.error('Error getting comment stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve comment statistics',
      error: error.message
    });
  }
};

export default {
  getCommentsByAnnouncement,
  createComment,
  updateComment,
  deleteComment,
  getRepliesByComment,
  getCommentStats
};