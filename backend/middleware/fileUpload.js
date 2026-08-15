import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { upload } from '../config/cloudinary.js';

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/announcements';
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with timestamp and original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'announcement-' + uniqueSuffix + ext);
  }
});

// Filter for image files
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Create both single and multiple upload middlewares
const uploadMiddleware = {
  single: multer({ 
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
  }).single('image'),
  
  multiple: multer({ 
    storage,
    fileFilter,
    limits: { 
      fileSize: 5 * 1024 * 1024, // 5MB limit per file
      files: 10 // Maximum 10 files
    }
  }).array('images', 10)  // 'images' field can have up to 10 files
};

// Export the Cloudinary upload middleware
export const uploadAnnouncementImages = upload.array('images', 10); // Allow up to 10 images

// Error handling middleware for multer
export const handleUploadError = (err, req, res, next) => {
  if (err) {
    console.error('Upload error:', err);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB per image.'
      });
    }
    
    if (err.message === 'Only image files are allowed!') {
      return res.status(400).json({
        success: false,
        message: 'Only image files are allowed!'
      });
    }
    
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload error'
    });
  }
  next();
};

export default uploadMiddleware;