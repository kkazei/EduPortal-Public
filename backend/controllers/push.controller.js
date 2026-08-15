import webpush from 'web-push';
import { Op } from 'sequelize';
import PushSubscription from '../models/pushSubscription.model.js';
import User from '../models/user.model.js';
import Student from '../models/student.model.js';
import Class from '../models/class.model.js';
import dotenv from 'dotenv';

dotenv.config();

// Configure web-push with your VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (!vapidPublicKey || !vapidPrivateKey) {
  console.error('VAPID keys are not set. Push notifications will not work!');
}

// Use a test email if not in production
webpush.setVapidDetails(
  'mailto:eduportal.sses@gmail.com', // Update with your contact email
  vapidPublicKey,
  vapidPrivateKey
);

// Subscribe to push notifications
export const subscribe = async (req, res) => {
  try {
    console.log('Push subscription request received:', req.body);
    const { subscription } = req.body;
    
    if (!subscription || !subscription.endpoint) {
      console.error('Invalid subscription data:', subscription);
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription data'
      });
    }

    // Extract the keys from the subscription object
    const { endpoint, keys } = subscription;
    
    if (!keys || !keys.p256dh || !keys.auth) {
      console.error('Missing required subscription keys');
      return res.status(400).json({
        success: false,
        message: 'Missing required subscription keys'
      });
    }

    // Associate subscription with user if authenticated
    const userId = req.user ? req.user.id : null;
    
    console.log('Creating or updating subscription for endpoint:', endpoint);

    // Create or update subscription in database
    const [pushSubscription, created] = await PushSubscription.findOrCreate({
      where: { endpoint },
      defaults: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_id: userId
      }
    });

    // If found but not created, update the keys
    if (!created) {
      console.log('Updating existing subscription');
      await pushSubscription.update({
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_id: userId
      });
    } else {
      console.log('Created new subscription');
    }

    res.status(201).json({
      success: true,
      message: 'Push subscription saved successfully'
    });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save push subscription',
      error: error.message
    });
  }
};

// Unsubscribe from push notifications
export const unsubscribe = async (req, res) => {
  try {
    console.log('Push unsubscription request received:', req.body);
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Endpoint is required'
      });
    }

    // Delete subscription from database
    console.log('Deleting subscription with endpoint:', endpoint);
    const deleted = await PushSubscription.destroy({
      where: { endpoint }
    });

    if (deleted) {
      console.log('Successfully deleted subscription');
      res.status(200).json({
        success: true,
        message: 'Push subscription removed successfully'
      });
    } else {
      console.log('No subscription found to delete');
      res.status(404).json({
        success: false,
        message: 'Push subscription not found'
      });
    }
  } catch (error) {
    console.error('Error removing push subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove push subscription',
      error: error.message
    });
  }
};

// Check if subscription is still valid
export const checkSubscription = async (req, res) => {
  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Endpoint is required'
      });
    }

    // Check if subscription exists in database
    const subscription = await PushSubscription.findOne({ 
      where: { endpoint } 
    });
    
    if (subscription) {
      res.json({
        success: true,
        isValid: true,
        message: 'Subscription is valid'
      });
    } else {
      res.json({
        success: true,
        isValid: false,
        message: 'Subscription not found'
      });
    }
    
  } catch (error) {
    console.error('Error checking subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check subscription',
      error: error.message
    });
  }
};

// Send push notification to specific class students only
export const sendPushNotificationToClass = async (notification, adviserId) => {
  try {
    console.log('Attempting to send push notification to class students for adviser:', adviserId);
    
    // First, get the class that this adviser teaches
    const adviserClass = await Class.findOne({
      where: { adviser_id: adviserId }
    });
    
    if (!adviserClass) {
      console.log('No class found for this adviser');
      return false;
    }
    
    console.log(`Found class: ${adviserClass.class_name} (ID: ${adviserClass.id})`);
    
    // Get all students in this class
    const classStudents = await Student.findAll({
      where: { class_id: adviserClass.id },
      attributes: ['user_id']
    });
    
    if (!classStudents || classStudents.length === 0) {
      console.log('No students found in this class');
      return false;
    }
    
    const studentUserIds = classStudents.map(student => student.user_id);
    console.log(`Found ${studentUserIds.length} students in class:`, studentUserIds);
    
    // Get push subscriptions for these students only
    const subscriptions = await PushSubscription.findAll({
      where: { 
        user_id: {
          [Op.in]: studentUserIds
        },
        is_active: true
      }
    });
    
    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for students in this class');
      return false;
    }

    console.log(`Found ${subscriptions.length} subscription(s) for adviser's class`);
    
    // Send notification to each subscription
    const notificationPromises = subscriptions.map(async (subscription) => {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth
        }
      };

      try {
        console.log(`Sending notification to class student: ${subscription.endpoint.substring(0, 30)}...`);
        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(notification)
        );
        console.log('Push notification sent successfully');
      } catch (error) {
        console.error(`Failed to send notification:`, error);
        
        if (error.statusCode === 404 || error.statusCode === 410) {
          console.log(`Removing invalid subscription`);
          await PushSubscription.destroy({ where: { id: subscription.id } });
        }
      }
    });

    await Promise.all(notificationPromises);
    return true;
  } catch (error) {
    console.error('Error sending push notifications to class:', error);
    return false;
  }
};

// Send push notification to all subscribers (keep this for admin announcements)
export const sendPushNotificationToAll = async (notification) => {
  try {
    console.log('Attempting to send push notification to all subscribers');
    
    // Get all active subscriptions
    const subscriptions = await PushSubscription.findAll();
    
    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found');
      return;
    }

    console.log(`Found ${subscriptions.length} subscription(s) to notify`);
    
    // Send notification to each subscription
    const notificationPromises = subscriptions.map(async (subscription) => {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth
        }
      };

      try {
        console.log(`Sending notification to subscription: ${subscription.endpoint.substring(0, 30)}...`);
        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(notification)
        );
        console.log('Push notification sent successfully');
      } catch (error) {
        console.error(`Failed to send notification:`, error);
        
        // If subscription is no longer valid, remove it
        if (error.statusCode === 404 || error.statusCode === 410) {
          console.log(`Removing invalid subscription`);
          await PushSubscription.destroy({ where: { id: subscription.id } });
        }
      }
    });

    await Promise.all(notificationPromises);
    return true;
  } catch (error) {
    console.error('Error sending push notifications:', error);
    return false;
  }
};

export default {
  subscribe,
  unsubscribe,
  checkSubscription,
  sendPushNotificationToAll,
  sendPushNotificationToClass // Add this new function
};