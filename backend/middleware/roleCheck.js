// Role-based middleware for protecting routes

/**
 * Middleware to check if the user is an admin
 */
export const isAdmin = (req, res, next) => {
  try {
    // Check if user exists and has admin role
    if (!req.user) {
      return res.status(403).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }
    
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required"
      });
    }
    
    next();
  } catch (error) {
    console.error("Error in admin role check:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error during authorization check" 
    });
  }
};

/**
 * Middleware to check if the user is a teacher
 */
export const isTeacher = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }
    
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Teacher privileges required"
      });
    }
    
    next();
  } catch (error) {
    console.error("Error in teacher role check:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error during authorization check" 
    });
  }
};

/**
 * Middleware to check if user is a student
 */
export const isStudent = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }
    
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Student privileges required"
      });
    }
    
    next();
  } catch (error) {
    console.error("Error in student role check:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error during authorization check" 
    });
  }
};

/**
 * Middleware to check if the user is either teacher or admin
 */
export const isTeacherOrAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }
    
    // Remove the call to getUserRole and check req.user.role directly
    if (req.user.role !== 'teacher' && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ 
        success: false, 
        message: "Teacher or admin access required" 
      });
    }
    
    next();
  } catch (error) {
    console.error("Error in teacher/admin role check:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error during authorization check"
    });
  }
};

  // Superadmin only
  export const isSuperAdmin = (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(403).json({ success: false, message: 'Authentication required' });
      }
      if (req.user.role !== 'superadmin') {
        return res.status(403).json({ success: false, message: 'Access denied. Superadmin privileges required' });
      }
      next();
    } catch (error) {
      console.error('Error in superadmin role check:', error);
      res.status(500).json({ success: false, message: 'Server error during authorization check' });
    }
  };

export default {
  isAdmin,
  isTeacher,
  isTeacherOrAdmin,
  isStudent,
  isSuperAdmin,
};