import express from 'express';
import { subscribe, unsubscribe, checkSubscription } from '../controllers/push.controller.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

/**
 * @route   POST /api/push/subscribe
 * @desc    Subscribe to push notifications
 * @access  Private
 */
router.post('/subscribe', verifyToken, subscribe);

/**
 * @route   POST /api/push/unsubscribe
 * @desc    Unsubscribe from push notifications
 * @access  Public
 */
router.post('/unsubscribe', unsubscribe);

/**
 * @route   POST /api/push/check-subscription
 * @desc    Check if subscription is still valid
 * @access  Public
 */
router.post('/check-subscription', checkSubscription);

/**
 * @route   GET /api/push/status
 * @desc    Get notification status
 * @access  Public
 */
router.get('/status', (req, res) => {
  res.json({ 
    supported: true, 
    message: 'Push notifications are supported' 
  });
});

export default router;