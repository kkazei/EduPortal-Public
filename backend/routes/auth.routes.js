import express from "express";
import { 
  logout, 
  //signup, 
  login, 
  checkAuth, 
  studentLogin, 
  adminLogin,
  superadminLogin,
  changePassword, // Import the changePassword function
  updateFirstTimePassword, // Import the new function
  initiateFirstTimeSetup,
  resendFirstTimeEmailCode,
  verifyFirstTimeEmail,
  initiateVerifyAccountEmail,
  resendVerifyAccountEmail,
  confirmVerifyAccountEmail,
  initiateEmailChange,
  resendEmailChangeCode,
  verifyEmailChange,
  forgotPassword, // Import the forgotPassword function
  resetPassword, // Import the resetPassword function
  activateAccount // Import the activateAccount function
} from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";
import {
  authLoginLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  verificationLimiter,
} from "../middleware/rateLimit.js";

const router = express.Router();

// router.post("/signup", signup); 

router.post("/login", authLoginLimiter, login);

router.post('/student-login', authLoginLimiter, studentLogin); 

router.post("/admin-login", authLoginLimiter, adminLogin);
router.post("/superadmin-login", authLoginLimiter, superadminLogin);

router.post("/logout", logout);

router.get("/check-auth", verifyToken, checkAuth);

// Add the route for changing password - protected by verifyToken middleware
router.post("/change-password", verifyToken, changePassword);

// Add the route for first-time password update - protected by verifyToken middleware
router.post("/update-first-time-password", verifyToken, updateFirstTimePassword);

// New student first-time setup routes
router.post("/first-time/initiate", verifyToken, verificationLimiter, initiateFirstTimeSetup);
router.post("/first-time/resend", verifyToken, verificationLimiter, resendFirstTimeEmailCode);
router.post("/first-time/verify", verifyToken, verificationLimiter, verifyFirstTimeEmail);

// Verify current email for legacy unverified users
router.post('/email/verify-account/initiate', verifyToken, verificationLimiter, initiateVerifyAccountEmail);
router.post('/email/verify-account/resend', verifyToken, verificationLimiter, resendVerifyAccountEmail);
router.post('/email/verify-account/confirm', verifyToken, verificationLimiter, confirmVerifyAccountEmail);

// Email change routes
router.post('/email/change-initiate', verifyToken, verificationLimiter, initiateEmailChange);
router.post('/email/resend', verifyToken, verificationLimiter, resendEmailChangeCode);
router.post('/email/verify', verifyToken, verificationLimiter, verifyEmailChange);

// Add the route for forgot password
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);

// Add the route for password reset
router.post('/reset-password/:token', resetPasswordLimiter, resetPassword);

// Add this route
router.post('/activate-account/:token', activateAccount);



export default router;