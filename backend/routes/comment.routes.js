import express from 'express';
import {
  getCommentsByAnnouncement,
  createComment,
  updateComment,
  deleteComment,
  getRepliesByComment,
  getCommentStats
} from '../controllers/comment.controller.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

/**
 * @route   GET /api/comments/announcement/:announcementId
 * @desc    Get all comments for a specific announcement
 * @access  Public (everyone can view comments)
 */
router.get('/announcement/:announcementId', getCommentsByAnnouncement);

/**
 * @route   GET /api/comments/announcement/:announcementId/stats
 * @desc    Get comment statistics for an announcement
 * @access  Public (everyone can view stats)
 */
router.get('/announcement/:announcementId/stats', getCommentStats);

/**
 * @route   GET /api/comments/:commentId/replies
 * @desc    Get replies for a specific comment
 * @access  Public (everyone can view replies)
 */
router.get('/:commentId/replies', getRepliesByComment);

// Protected routes (require authentication)
router.use(verifyToken);

/**
 * @route   POST /api/comments/announcement/:announcementId
 * @desc    Create a new comment or reply to an announcement
 * @access  Private (Students, Teachers & Admins)
 */
router.post('/announcement/:announcementId', createComment);

/**
 * @route   PUT /api/comments/:commentId
 * @desc    Update an existing comment
 * @access  Private (Comment owner or Admin)
 */
router.put('/:commentId', updateComment);

/**
 * @route   DELETE /api/comments/:commentId
 * @desc    Delete a comment and all its nested replies
 * @access  Private (Comment owner or Admin)
 */
router.delete('/:commentId', deleteComment);

export default router;