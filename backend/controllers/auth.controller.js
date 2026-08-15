import User from '../models/user.model.js';
import Student from '../models/student.model.js'; // Import Student model
import bcrypt from 'bcryptjs';
import { generateTokenAndSetCookie } from '../utils/generateTokenAndSetCookie.js';
import crypto from 'crypto'; // Change this line
import { sendForgotPasswordEmail, sendVerificationEmail, sendEmailChangedNotification } from '../nodemailer/emails.js'; // Change this line
import { Op } from 'sequelize'; // Add this import for the resetPassword function
import { logEvent } from '../middleware/auditLogger.js';
import jwt from 'jsonwebtoken';

//export const signup = async (req, res) => {
  //  const { user_email, user_fullname, password, user_role } = req.body;

    //try {
        //const hashedPassword = await bcrypt.hash(password, 10);
        //const newUser = await User.create({
          //  user_email,
         //   user_fullname,
         //   password: hashedPassword,
         //   user_role,
        //});

       // generateTokenAndSetCookie(res, newUser.id);
       // res.status(201).json({ success: true, user: newUser });
   // } catch (error) {
     //   res.status(500).json({ success: false, message: error.message });
    //}
//};

export const login = async (req, res) => {
    const { user_email, password } = req.body;

    try {
  const user = await User.findOne({ where: { user_email, is_deleted: false } });

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        // Add role validation - this endpoint should only be for teachers and admins
        if (user.user_role === 'student') {
            return res.status(403).json({ 
                success: false, 
                message: "Students must use the student login portal" 
            });
        }

  generateTokenAndSetCookie(res, user.id);
  try { await logEvent({ req, action: 'USER_LOGIN_SUCCESS' }); } catch (_) {}
        res.status(200).json({ 
            success: true, 
            user: {
                id: user.id,
                user_email: user.user_email,
                user_fullname: user.user_fullname,
                user_role: user.user_role,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const studentLogin = async (req, res) => {
  try {
    const { lrn, password } = req.body;
    
    // Format input as email if not already formatted
    const userEmail = lrn.includes('@') ? lrn : `${lrn}@gmail.com`;
    
    // First find the user by email
    const user = await User.findOne({ 
      where: { 
        user_email: userEmail,
        is_deleted: false
      }
    });
    
    // Check if user exists
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid LRN or password" 
      });
    }
    
    // Check if user has student role
    if (user.user_role !== 'student') {
      return res.status(403).json({ 
        success: false, 
        message: "This account does not have student privileges" 
      });
    }
    
    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid LRN or password" 
      });
    }
    
    // Try to find associated student record
    const student = await Student.findOne({ 
      where: { 
        user_id: user.id,
        is_deleted: false 
      }
    });
    
    // Generate token
    generateTokenAndSetCookie(res, user.id);
    
    // Return success with user and student info if found
    res.status(200).json({ 
      success: true,
      user: {
        id: user.id,
        user_email: user.user_email,
        user_fullname: user.user_fullname,
        user_role: user.user_role,
        is_first_login: user.is_first_login || false, // Include first login status
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      student: student || null
    });
  } catch (error) {
    console.error("Student login error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error during student login",
      error: error.message 
    });
  }
};

export const logout = (req, res) => {
    try {
        // Clear token cookie
        res.cookie("token", "", {
            httpOnly: true,
            expires: new Date(0),
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
            path: '/',
        });
      // Clear dedicated superadmin cookie as well
      res.cookie("super_token", "", {
        httpOnly: true,
        expires: new Date(0),
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/',
      });
        
    try { logEvent({ req, action: 'USER_LOGOUT' }); } catch (_) {}
    res.status(200).json({ 
            success: true, 
            message: "Logged out successfully" 
        });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error during logout" 
        });
    }
};

export const checkAuth = async (req, res) => {
    try {
      // Get the userId from middleware
      const userId = req.userId;
      
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: "Not authenticated" 
        });
      }
      
      // Fetch full user data
      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password'] } // Don't send password
      });
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: "User not found" 
        });
      }
      
      let responseData = {
        success: true,
        user: user
      };
      
      // For student users, try to include student data if it exists
      if (user.user_role === 'student') {
        try {
          // Use a simple query without any complex associations
          const student = await Student.findOne({
            where: { 
              user_id: userId,
              is_deleted: false
            },
            // Avoid complex associations that might cause issues
            attributes: ['id', 'user_id', 'lrn', 'first_name', 'last_name', 'class_id']
          });
          
          if (student) {
            responseData.student = student;
          }
        } catch (studentErr) {
          console.error("Error fetching student data:", studentErr);
          // Don't fail the entire request if student data can't be fetched
          // Just log the error and continue
        }
      }
      
      // Return user data (and student data if available)
      res.status(200).json(responseData);
      
    } catch (error) {
      console.error("Authentication check error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error checking authentication",
        error: error.message 
      });
    }
  };

  export const adminLogin = async (req, res) => {
    const { user_email, password } = req.body;
  
    try {
      // Find user by email
  const user = await User.findOne({ where: { user_email, is_deleted: false } });
  
      // Check if user exists
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid email or password" 
        });
      }
  
      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid email or password" 
        });
      }
  
      // Check if user has admin role
      if (user.user_role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          message: "Access denied. Admin privileges required." 
        });
      }
  
  // Generate auth token
      generateTokenAndSetCookie(res, user.id);
  try { await logEvent({ req, action: 'ADMIN_LOGIN_SUCCESS' }); } catch (_) {}
  
      // Return success with admin user info
      res.status(200).json({ 
        success: true, 
        user: {
          id: user.id,
          user_email: user.user_email,
          user_fullname: user.user_fullname,
          user_role: user.user_role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error during admin login",
        error: error.message 
      });
    }
  };

// Add this function to the auth controller

export const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.userId; // From auth middleware
    
    // Validate inputs
    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required"
      });
    }
    
    // Add password strength validation
    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long"
      });
    }
    
    // Check if new password is same as current password
    if (current_password === new_password) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password"
      });
    }
    
    // Find user
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    // Verify current password
    const isMatch = await bcrypt.compare(current_password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect"
      });
    }
    
    // Check if new password is same as stored password (double check)
    const isSameAsStored = await bcrypt.compare(new_password, user.password);
    if (isSameAsStored) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password"
      });
    }
    
    // Hash new password (increase rounds for better security)
    const hashedPassword = await bcrypt.hash(new_password, 12);
    
    // Update password
    await user.update({ password: hashedPassword });
    
    res.status(200).json({
      success: true,
      message: "Password changed successfully"
    });
    
  } catch (error) {
    console.error("Password change error:", error);
    res.status(500).json({
      success: false,
      message: "Error changing password",
      error: error.message
    });
  }
};

// New function for first-time password update (students only)
export const updateFirstTimePassword = async (req, res) => {
  try {
    const { new_password } = req.body;
    const userId = req.userId; // From verifyToken middleware
    
    // Validation
    if (!new_password) {
      return res.status(400).json({
        success: false,
        message: 'New password is required'
      });
    }

    // Simplified password validation - only require 6 characters minimum
    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Remove all the complex password requirements:
    /*
    const hasLowerCase = /[a-z]/.test(new_password);
    const hasUpperCase = /[A-Z]/.test(new_password);
    const hasNumbers = /\d/.test(new_password);
    const hasSpecialChar = /[@$!%*?&]/.test(new_password);

    if (!hasLowerCase || !hasUpperCase || !hasNumbers || !hasSpecialChar) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
      });
    }
    */

    // Find the user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify user is a student
    if (user.user_role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'First-time password update is only available for student accounts'
      });
    }

    // Verify user is on first login
    if (!user.is_first_login) {
      return res.status(403).json({
        success: false,
        message: 'First-time password update is not available for this account'
      });
    }

    // Check if new password is same as current password
    const isSameAsCurrent = await bcrypt.compare(new_password, user.password);
    if (isSameAsCurrent) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from your current password'
      });
    }
    
    // Hash new password with higher security
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(new_password, saltRounds);
    
    // Update user password (do NOT complete first login here anymore; email verification will finalize)
    await user.update({
      password: hashedPassword,
      updatedAt: new Date()
    });
    
    console.log(`Student ${user.user_email} (ID: ${user.id}) completed first-time password update`);
    
    res.status(200).json({
      success: true,
      message: 'Password updated successfully. Please verify your email to complete setup.'
    });
    
  } catch (error) {
    console.error('Error in updateFirstTimePassword:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating password'
    });
  }
};

// First-time setup: set password and send verification code to provided email
export const initiateFirstTimeSetup = async (req, res) => {
  try {
    const { new_password, email } = req.body;
    const userId = req.userId;

    if (!new_password || !email) {
      return res.status(400).json({ success: false, message: 'Email and new password are required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.user_role !== 'student') {
      return res.status(403).json({ success: false, message: 'First-time setup is only for student accounts' });
    }
    if (!user.is_first_login) {
      return res.status(400).json({ success: false, message: 'First-time setup already completed' });
    }

    // Ensure email is not already used by another account
    const existing = await User.findOne({ where: { user_email: email } });
    if (existing && existing.id !== user.id) {
      return res.status(409).json({ success: false, message: 'Email is already in use by another account' });
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(new_password, 12);

    // Generate a 6-digit verification code
    const code = (Math.floor(100000 + Math.random() * 900000)).toString();
    // Hash the verification code for storage
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await user.update({
      password: hashedPassword,
      pending_email: email,
      email_verification_code: codeHash,
      email_verification_expires: expires,
    });

    // Send the verification email
    await sendVerificationEmail(email, code);

    return res.status(200).json({ success: true, message: 'Verification code sent to your email. Enter the code to complete setup.' });
  } catch (error) {
    console.error('initiateFirstTimeSetup error:', error);
    return res.status(500).json({ success: false, message: 'Failed to start first-time setup' });
  }
};

export const resendFirstTimeEmailCode = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.is_first_login) return res.status(400).json({ success: false, message: 'First-time setup already completed' });
    if (!user.pending_email) return res.status(400).json({ success: false, message: 'No email to verify. Start setup first.' });

  const code = (Math.floor(100000 + Math.random() * 900000)).toString();
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000);

  await user.update({ email_verification_code: codeHash, email_verification_expires: expires });
    await sendVerificationEmail(user.pending_email, code);

    return res.status(200).json({ success: true, message: 'A new verification code has been sent.' });
  } catch (e) {
    console.error('resendFirstTimeEmailCode error:', e);
    return res.status(500).json({ success: false, message: 'Failed to resend verification code' });
  }
};

export const verifyFirstTimeEmail = async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.is_first_login) return res.status(400).json({ success: false, message: 'First-time setup already completed' });

    if (!code || !user.email_verification_code || !user.email_verification_expires) {
      return res.status(400).json({ success: false, message: 'Verification code is missing' });
    }

    if (new Date() > new Date(user.email_verification_expires)) {
      return res.status(400).json({ success: false, message: 'Verification code has expired' });
    }

    // Compare hashed code
    const providedHash = crypto.createHash('sha256').update(code).digest('hex');
    if (providedHash !== user.email_verification_code) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    // Finalize: set primary email, mark verified, clear temporary fields and complete first login
    await user.update({
      user_email: user.pending_email || user.user_email,
      pending_email: null,
      is_email_verified: true,
      email_verification_code: null,
      email_verification_expires: null,
      is_first_login: false,
      updatedAt: new Date(),
    });

    return res.status(200).json({ success: true, message: 'Email verified and setup complete' });
  } catch (e) {
    console.error('verifyFirstTimeEmail error:', e);
    return res.status(500).json({ success: false, message: 'Failed to verify email' });
  }
};

// Verify current email for legacy unverified users (not first-time setup)
export const initiateVerifyAccountEmail = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // If already verified, no need to send code
    if (user.is_email_verified) {
      return res.status(400).json({ success: false, message: 'Email is already verified' });
    }

    // Send code to the CURRENT email on file
    const destination = user.user_email;
    if (!destination) {
      return res.status(400).json({ success: false, message: 'No email on file to verify' });
    }

    const code = (Math.floor(100000 + Math.random() * 900000)).toString();
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await user.update({
      email_verification_code: codeHash,
      email_verification_expires: expires,
    });

    await sendVerificationEmail(destination, code);

    return res.status(200).json({
      success: true,
      message: 'Verification code sent to your email. Please check your Inbox and Spam/Junk folders.'
    });
  } catch (e) {
    console.error('initiateVerifyAccountEmail error:', e);
    return res.status(500).json({ success: false, message: 'Failed to send verification code' });
  }
};

export const resendVerifyAccountEmail = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.is_email_verified) {
      return res.status(400).json({ success: false, message: 'Email is already verified' });
    }

    const destination = user.user_email;
    if (!destination) {
      return res.status(400).json({ success: false, message: 'No email on file to verify' });
    }

    const code = (Math.floor(100000 + Math.random() * 900000)).toString();
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await user.update({
      email_verification_code: codeHash,
      email_verification_expires: expires,
    });

    await sendVerificationEmail(destination, code);

    return res.status(200).json({ success: true, message: 'A new verification code has been sent.' });
  } catch (e) {
    console.error('resendVerifyAccountEmail error:', e);
    return res.status(500).json({ success: false, message: 'Failed to resend verification code' });
  }
};

export const confirmVerifyAccountEmail = async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.is_email_verified) {
      return res.status(400).json({ success: false, message: 'Email is already verified' });
    }

    if (!code || !user.email_verification_code || !user.email_verification_expires) {
      return res.status(400).json({ success: false, message: 'Verification code is missing' });
    }

    if (new Date() > new Date(user.email_verification_expires)) {
      return res.status(400).json({ success: false, message: 'Verification code has expired' });
    }

    const providedHash = crypto.createHash('sha256').update(code).digest('hex');
    if (providedHash !== user.email_verification_code) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    await user.update({
      is_email_verified: true,
      email_verification_code: null,
      email_verification_expires: null,
      updatedAt: new Date(),
    });

    return res.status(200).json({ success: true, message: 'Email verified successfully' });
  } catch (e) {
    console.error('confirmVerifyAccountEmail error:', e);
    return res.status(500).json({ success: false, message: 'Failed to verify email' });
  }
};

// Email change (Account settings)
export const initiateEmailChange = async (req, res) => {
  try {
    const { new_email } = req.body;
    if (!new_email) return res.status(400).json({ success: false, message: 'New email is required' });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(new_email)) return res.status(400).json({ success: false, message: 'Invalid email format' });

    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // If same as current email
    if (user.user_email === new_email) {
      return res.status(400).json({ success: false, message: 'New email must be different from current email' });
    }

    // Ensure not used by someone else
    const existing = await User.findOne({ where: { user_email: new_email } });
    if (existing) return res.status(409).json({ success: false, message: 'Email is already in use by another account' });

  const code = (Math.floor(100000 + Math.random() * 900000)).toString();
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000);

  await user.update({ pending_email: new_email, email_verification_code: codeHash, email_verification_expires: expires });

    await sendVerificationEmail(new_email, code);

    return res.status(200).json({ success: true, message: 'Verification code sent to your new email. Please check your inbox and spam folder.' });
  } catch (e) {
    console.error('initiateEmailChange error:', e);
    return res.status(500).json({ success: false, message: 'Failed to initiate email change' });
  }
};

export const resendEmailChangeCode = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.pending_email) return res.status(400).json({ success: false, message: 'No pending email change to verify' });

  const code = (Math.floor(100000 + Math.random() * 900000)).toString();
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000);
  await user.update({ email_verification_code: codeHash, email_verification_expires: expires });
    await sendVerificationEmail(user.pending_email, code);
    return res.status(200).json({ success: true, message: 'A new verification code has been sent to your new email.' });
  } catch (e) {
    console.error('resendEmailChangeCode error:', e);
    return res.status(500).json({ success: false, message: 'Failed to resend verification code' });
  }
};

export const verifyEmailChange = async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.pending_email) return res.status(400).json({ success: false, message: 'No pending email change' });

    if (!code || !user.email_verification_code || !user.email_verification_expires) {
      return res.status(400).json({ success: false, message: 'Verification code is missing' });
    }
    if (new Date() > new Date(user.email_verification_expires)) {
      return res.status(400).json({ success: false, message: 'Verification code has expired' });
    }
    const providedHash = crypto.createHash('sha256').update(code).digest('hex');
    if (providedHash !== user.email_verification_code) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    const oldEmail = user.user_email;
    await user.update({
      user_email: user.pending_email,
      pending_email: null,
      is_email_verified: true,
      email_verification_code: null,
      email_verification_expires: null,
      // If this was forced email-only setup, clear the sentinel token
      resetPasswordToken: user.resetPasswordToken === 'REQUIRE_EMAIL_ONLY' ? null : user.resetPasswordToken,
      resetPasswordExpiry: user.resetPasswordToken === 'REQUIRE_EMAIL_ONLY' ? null : user.resetPasswordExpiry,
      updatedAt: new Date(),
    });

    // Notify old email about the change
    try {
      if (oldEmail) {
        await sendEmailChangedNotification(oldEmail, user.user_fullname, user.user_email);
      }
    } catch (notifyErr) {
      console.warn('Failed to send email change notification:', notifyErr?.message || notifyErr);
    }

    return res.status(200).json({ success: true, message: 'Email updated successfully' });
  } catch (e) {
    console.error('verifyEmailChange error:', e);
    return res.status(500).json({ success: false, message: 'Failed to verify email change' });
  }
};

// Add this function to your existing auth controller
export const forgotPassword = async (req, res) => {
  const genericMessage = "If an account with that email exists, a password reset link has been sent.";
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    // Find user by email
    const user = await User.findOne({ where: { user_email: email } });

    if (user) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Save reset token to user
      await user.update({
        resetPasswordToken: resetToken,
        resetPasswordExpiry: resetTokenExpiry
      });

      // Create the reset URL properly
      const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

      // Send email with correct parameters
      await sendForgotPasswordEmail(user.user_email, user.user_fullname, resetUrl);
    }

    res.status(200).json({
      success: true,
      message: genericMessage
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(200).json({
      success: true,
      message: genericMessage
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Find user with valid reset token
    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpiry: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token"
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user password and clear reset token
    await user.update({
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpiry: null
    });

    res.status(200).json({
      success: true,
      message: "Password reset successfully"
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to reset password"
    });
  }
};

// Add this method to your auth controller

export const activateAccount = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Simple password validation here too
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long"
      });
    }

    // Find user with valid activation token
    const user = await User.findOne({
      where: {
        resetPasswordToken: token, // Reusing this field for activation
        resetPasswordExpiry: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired activation token"
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user password, clear activation token, and set as activated
    await user.update({
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpiry: null,
      is_first_login: false // Account is now activated
    });

    res.status(200).json({
      success: true,
      message: "Account activated successfully"
    });

  } catch (error) {
    console.error('Account activation error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to activate account"
    });
  }
};

// Superadmin-only login with a dedicated cookie
export const superadminLogin = async (req, res) => {
  const { user_email, password } = req.body;
  try {
  const user = await User.findOne({ where: { user_email, is_deleted: false } });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
    if (user.user_role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Access denied. Superadmin only.' });
    }

  // Issue a separate cookie for superadmin sessions
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('super_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    try { await logEvent({ req, action: 'SUPERADMIN_LOGIN_SUCCESS' }); } catch (_) {}
    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        user_email: user.user_email,
        user_fullname: user.user_fullname,
        user_role: user.user_role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Superadmin login error:', error);
    return res.status(500).json({ success: false, message: 'Error during superadmin login' });
  }
};

export default {
    //signup,
    login,
    superadminLogin,
    studentLogin, 
    adminLogin,
    logout,
    checkAuth,
    changePassword,
    updateFirstTimePassword, // Add the new function to exports
    forgotPassword,
    resetPassword,
    activateAccount
};
