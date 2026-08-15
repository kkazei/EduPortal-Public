import Announcement from '../models/announcement.model.js';
import User from '../models/user.model.js';
import { Op } from 'sequelize';
import AnnouncementImage from '../models/announcementImage.model.js';
import { deleteImageFromCloudinary } from '../config/cloudinary.js';
import { sendPushNotificationToAll, sendPushNotificationToClass } from './push.controller.js';

// Get all announcements (with optional filters)
export const getAllAnnouncements = async (req, res) => {
  try {
    const { 
      is_active, 
      search,
      user_id,
      limit = 10,
      page = 1
    } = req.query;

    const whereClause = {};
    if (is_active !== undefined) {
      whereClause.is_active = is_active === 'true';
    }
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } }
      ];
    }
    if (user_id) {
      whereClause.user_id = user_id;
    }

    const offset = (page - 1) * limit;
    
    const announcements = await Announcement.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'user_fullname', 'user_role']
        },
        {
          model: AnnouncementImage,
          as: 'images',
          attributes: ['id', 'image_url', 'display_order'],
          order: [['display_order', 'ASC']]
        }
      ],
      order: [
        ['publish_date', 'DESC'],
        ['created_at', 'DESC']
      ],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    const totalPages = Math.ceil(announcements.count / limit);
    
    res.status(200).json({
      success: true,
      count: announcements.count,
      totalPages,
      currentPage: parseInt(page),
      data: announcements.rows
    });
  } catch (error) {
    console.error('Error getting announcements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve announcements',
      error: error.message
    });
  }
};

// Get active announcements (for dashboard, etc.)
export const getActiveAnnouncements = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const announcements = await Announcement.findAll({
      where: {
        is_active: true,
        publish_date: {
          [Op.lte]: new Date()
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
      ],
      limit: parseInt(limit)
    });
    
    res.status(200).json({
      success: true,
      count: announcements.length,
      data: announcements
    });
  } catch (error) {
    console.error('Error getting active announcements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve active announcements',
      error: error.message
    });
  }
};

// Get announcement by ID
export const getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const announcement = await Announcement.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'user_fullname', 'user_role']
        },
        {
          model: AnnouncementImage,
          as: 'images',
          attributes: ['id', 'image_url', 'display_order'],
          order: [['display_order', 'ASC']]
        }
      ]
    });
    
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: announcement
    });
  } catch (error) {
    console.error('Error getting announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve announcement',
      error: error.message
    });
  }
};

// Create a new announcement
export const createAnnouncement = async (req, res) => {
  try {
    const { 
      title, 
      content, 
      publish_date = new Date(),
      is_active = true
    } = req.body;
    
    // Basic validation
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }
    
    // Get the current user's ID from the authenticated request
    const user_id = req.user.id;
    
    // Create the announcement
    const newAnnouncement = await Announcement.create({
      title,
      content,
      image_url: null,
      publish_date,
      is_active,
      user_id
    });
    
    // Handle multiple image uploads from Cloudinary
    if (req.files && req.files.length > 0) {
      const imagePromises = req.files.map((file, index) => {
        return AnnouncementImage.create({
          announcement_id: newAnnouncement.id,
          image_url: file.path, // Cloudinary URL
          display_order: index
        });
      });
      
      await Promise.all(imagePromises);
      
      // Set the first image as the main image
      if (req.files.length > 0) {
        await newAnnouncement.update({ image_url: req.files[0].path });
      }
    }
    
    // Get the complete announcement with creator information and images
    const announcement = await Announcement.findByPk(newAnnouncement.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'user_fullname', 'user_role']
        },
        {
          model: AnnouncementImage,
          as: 'images',
          attributes: ['id', 'image_url', 'display_order']
        }
      ]
    });
    
    // Send push notification
    if (is_active) {
      let currentUser = req.user;
      if (!currentUser.user_role || !currentUser.user_fullname) {
        const userData = await User.findByPk(user_id, {
          attributes: ['id', 'user_fullname', 'user_role']
        });
        currentUser = userData.dataValues;
      }
      
      const creatorName = announcement.creator ? announcement.creator.user_fullname : currentUser.user_fullname || 'Administrator';
      
      const notificationData = {
        title: announcement.title,
        body: `${creatorName} has posted a new announcement`,
        announcementId: announcement.id,
        type: 'announcement',
        is_active: announcement.is_active,
        icon: announcement.image_url || '/icons/icon-192x192.png'
      };

      if (currentUser.user_role === 'teacher') {
        sendPushNotificationToClass(notificationData, user_id).catch(err => {
          console.error('Error sending push notification to class:', err);
        });
      } else {
        sendPushNotificationToAll(notificationData).catch(err => {
          console.error('Error sending push notification:', err);
        });
      }
    }
    
    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: announcement
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create announcement',
      error: error.message
    });
  }
};

// Update an announcement
export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      content, 
      publish_date,
      is_active,
      removed_image_ids = []
    } = req.body;
    
    // Find the announcement with its images
    const announcement = await Announcement.findByPk(id, {
      include: [
        {
          model: AnnouncementImage,
          as: 'images'
        }
      ]
    });
    
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }
    
    // Check if the user is the creator or has admin privileges
    if (announcement.user_id !== req.user.id && req.user.user_role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this announcement'
      });
    }
    
    // Process removed images
    let imageIdsToRemove = [];
    if (typeof removed_image_ids === 'string') {
      imageIdsToRemove = removed_image_ids
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id));
    } else if (Array.isArray(removed_image_ids)) {
      imageIdsToRemove = removed_image_ids.map(id => parseInt(id)).filter(id => !isNaN(id));
    }
    
    if (imageIdsToRemove.length > 0) {
      // Find images to delete
      const imagesToDelete = announcement.images.filter(img => imageIdsToRemove.includes(img.id));
      
      // Delete images from Cloudinary
      for (const image of imagesToDelete) {
        try {
          await deleteImageFromCloudinary(image.image_url);
        } catch (error) {
          console.warn(`Could not delete image from Cloudinary ${image.image_url}:`, error);
        }
      }
      
      // Delete images from the database
      await AnnouncementImage.destroy({
        where: {
          id: imageIdsToRemove,
          announcement_id: id
        }
      });
    }
    
    // Add new images if uploaded
    if (req.files && req.files.length > 0) {
      // Get the current highest display_order
      const maxOrderImage = await AnnouncementImage.findOne({
        where: { announcement_id: id },
        order: [['display_order', 'DESC']]
      });
      
      const startOrder = maxOrderImage ? maxOrderImage.display_order + 1 : 0;
      
      // Add new images
      const imagePromises = req.files.map((file, index) => {
        return AnnouncementImage.create({
          announcement_id: id,
          image_url: file.path, // Cloudinary URL
          display_order: startOrder + index
        });
      });
      
      await Promise.all(imagePromises);
    }
    
    // Update announcement details
    await announcement.update({
      title: title || announcement.title,
      content: content || announcement.content,
      publish_date: publish_date || announcement.publish_date,
      is_active: is_active === undefined ? announcement.is_active : is_active
    });
    
    // Get the updated announcement with creator information and images
    const updatedAnnouncement = await Announcement.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'user_fullname', 'user_role']
        },
        {
          model: AnnouncementImage,
          as: 'images',
          attributes: ['id', 'image_url', 'display_order'],
          order: [['display_order', 'ASC']]
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      message: 'Announcement updated successfully',
      data: updatedAnnouncement
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update announcement',
      error: error.message
    });
  }
};

// Delete an announcement
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the announcement with its images
    const announcement = await Announcement.findByPk(id, {
      include: [
        {
          model: AnnouncementImage,
          as: 'images'
        }
      ]
    });
    
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }
    
    // Check if the user is the creator or has admin privileges
    if (announcement.user_id !== req.user.id && req.user.user_role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this announcement'
      });
    }
    
    // Delete images from Cloudinary
    if (announcement.images && announcement.images.length > 0) {
      for (const image of announcement.images) {
        try {
          await deleteImageFromCloudinary(image.image_url);
        } catch (error) {
          console.warn(`Could not delete image from Cloudinary ${image.image_url}:`, error);
        }
      }
    }
    
    // Also handle the legacy image_url if it exists
    if (announcement.image_url) {
      try {
        await deleteImageFromCloudinary(announcement.image_url);
      } catch (error) {
        console.warn(`Could not delete legacy image from Cloudinary ${announcement.image_url}:`, error);
      }
    }
    
    // Delete the announcement (this will cascade to images)
    await announcement.destroy();
    
    res.status(200).json({
      success: true,
      message: 'Announcement successfully removed',
      data: { id }
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete announcement',
      error: error.message
    });
  }
};

// Toggle announcement active status
export const toggleAnnouncementStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    const announcement = await Announcement.findByPk(id);
    
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }
    
    // Check if the user is the creator or has admin privileges
    if (announcement.user_id !== req.user.id && req.user.user_role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this announcement'
      });
    }
    
    // Toggle the active status
    await announcement.update({ is_active: !announcement.is_active });
    
    res.status(200).json({
      success: true,
      message: `Announcement ${announcement.is_active ? 'activated' : 'deactivated'} successfully`,
      data: { id, is_active: announcement.is_active }
    });
  } catch (error) {
    console.error('Error toggling announcement status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle announcement status',
      error: error.message
    });
  }
};

// Get announcements by creator
export const getAnnouncementsByCreator = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10, page = 1 } = req.query;
    
    // Verify user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const offset = (page - 1) * limit;
    
    const announcements = await Announcement.findAndCountAll({
      where: { user_id: userId },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'user_fullname', 'user_role']
        },
        {
          model: AnnouncementImage,
          as: 'images',
          attributes: ['id', 'image_url', 'display_order'],
          order: [['display_order', 'ASC']]
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    const totalPages = Math.ceil(announcements.count / limit);
    
    res.status(200).json({
      success: true,
      count: announcements.count,
      totalPages,
      currentPage: parseInt(page),
      data: announcements.rows
    });
  } catch (error) {
    console.error('Error getting user announcements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user announcements',
      error: error.message
    });
  }
};

// Get public announcement by ID
export const getPublicAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const announcement = await Announcement.findOne({
      where: {
        id,
        is_active: true
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'user_fullname', 'user_role']
        },
        {
          model: AnnouncementImage,
          as: 'images',
          attributes: ['id', 'image_url', 'display_order'],
          order: [['display_order', 'ASC']]
        }
      ]
    });
    
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found or not active'
      });
    }
    
    res.status(200).json({
      success: true,
      data: announcement
    });
  } catch (error) {
    console.error('Error getting public announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve announcement',
      error: error.message
    });
  }
};

// Export all controllers
export default {
  getAllAnnouncements,
  getActiveAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementStatus,
  getAnnouncementsByCreator,
  getPublicAnnouncementById
};