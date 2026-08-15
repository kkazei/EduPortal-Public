import express from 'express';
import {
  getAllAnnouncements,
  getActiveAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementStatus,
  getAnnouncementsByCreator,
  getPublicAnnouncementById
} from '../controllers/announcement.controller.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { isTeacher } from '../middleware/roleCheck.js';
import { uploadAnnouncementImages, handleUploadError } from '../middleware/fileUpload.js';

const router = express.Router();

// Public routes
router.get('/active', getActiveAnnouncements);
router.get('/public/:id', getPublicAnnouncementById);
router.get('/user/:userId', getAnnouncementsByCreator);
router.get('/:id', getAnnouncementById);
router.get('/', getAllAnnouncements);

/**
 * @route   POST /api/announcements
 * @desc    Create a new announcement
 * @access  Private (Teachers & Admins only)
 */
router.post('/', verifyToken, isTeacher, uploadAnnouncementImages, handleUploadError, createAnnouncement);

/**
 * @route   PUT /api/announcements/:id
 * @desc    Update an existing announcement
 * @access  Private (Creator, Teachers & Admins only)
 */
router.put('/:id', verifyToken, uploadAnnouncementImages, handleUploadError, updateAnnouncement);

/**
 * @route   DELETE /api/announcements/:id
 * @desc    Delete (or soft delete) an announcement
 * @access  Private (Creator, Teachers & Admins only)
 */
router.delete('/:id', verifyToken, deleteAnnouncement);

/**
 * @route   PATCH /api/announcements/:id/toggle
 * @desc    Toggle the active status of an announcement
 * @access  Private (Creator, Teachers & Admins only)
 */
router.patch('/:id/toggle', verifyToken, toggleAnnouncementStatus);

export default router;