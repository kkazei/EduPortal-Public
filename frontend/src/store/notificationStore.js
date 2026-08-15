import { create } from "zustand";
import axios from "axios";
import { BASE_API_URL } from "./announcementStore";

const NOTIFICATION_API_URL = `${BASE_API_URL}/api/push`;

// Helper function to convert VAPID key from base64 to Uint8Array
const urlBase64ToUint8Array = (base64String) => {
  try {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (error) {
    console.error('Error converting VAPID key:', error);
    throw error;
  }
};

// Get device information
const getDeviceInfo = () => {
  const userAgent = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const browser = userAgent.includes('Chrome') ? 'Chrome' : 
                userAgent.includes('Firefox') ? 'Firefox' : 
                userAgent.includes('Safari') ? 'Safari' : 'Unknown';
  
  return { 
    type: isMobile ? 'mobile' : 'desktop', 
    browser,
    userAgent,
    timestamp: Date.now()
  };
};

// VAPID public key for push notifications
const PUBLIC_VAPID_KEY = "BNvo5WFGk6qLk3I4gzHmIfk0f5jFVYV-XAhBHxsKJWnKw7OWJO5aoV6fEQefSgcOzvu2tajHMNHL3_ppUWT30ok";

export const useNotificationStore = create((set, get) => ({
  // State
  isSubscribed: null, // null = unknown, true = subscribed, false = not subscribed
  subscription: null,
  notificationPermission: null, // null = unknown, "granted", "denied", "default"
  isLoading: false,
  error: null,
  message: null,
  lastNotification: null,
  deviceInfo: null,
  serviceWorkerSupported: 'serviceWorker' in navigator && 'PushManager' in window,
  
  // Initialize notification state
  initializeNotifications: async () => {
    set({ isLoading: true, error: null });
    
    try {
      // Get device info
      const deviceInfo = getDeviceInfo();
      set({ deviceInfo });

      if (!get().serviceWorkerSupported) {
        set({ 
          isLoading: false, 
          notificationPermission: 'unsupported',
          isSubscribed: false 
        });
        return false;
      }
      
      // Check notification permission
      const permission = Notification.permission;
      set({ notificationPermission: permission });

      // If permission is denied, no need to check further
      if (permission === 'denied') {
        set({ 
          isLoading: false, 
          isSubscribed: false 
        });
        return false;
      }

      // If permission is not granted, we're definitely not subscribed
      if (permission !== 'granted') {
        set({
          isLoading: false,
          isSubscribed: false,
          subscription: null
        });
        return false;
      }
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      
      // Give the service worker a moment to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const registration = await navigator.serviceWorker.ready;
      
      // Check for existing subscription
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        console.log('Found existing subscription:', subscription.endpoint);
        
        // We have a subscription, check if it's still valid on the server
        const isValid = await get().checkSubscriptionOnServer(subscription);
        
        if (isValid) {
          console.log('Subscription is valid on server');
          set({
            isLoading: false,
            isSubscribed: true,
            subscription: subscription
          });
          return true;
        } else {
          console.log('Subscription is invalid on server, cleaning up');
          // If subscription is invalid on server, clean it up
          try {
            await subscription.unsubscribe();
          } catch (error) {
            console.warn('Error unsubscribing invalid subscription:', error);
          }
          
          set({
            isLoading: false,
            isSubscribed: false,
            subscription: null
          });
          return false;
        }
      } else {
        console.log('No existing subscription found');
        // No subscription found
        set({
          isLoading: false,
          isSubscribed: false,
          subscription: null
        });
        return false;
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
      set({ 
        isLoading: false, 
        error: `Failed to initialize notifications: ${error.message}`,
        isSubscribed: false
      });
      return false;
    }
  },

  // Check if subscription is still valid on server
  checkSubscriptionOnServer: async (subscription) => {
    try {
      const response = await axios.post(`${NOTIFICATION_API_URL}/check-subscription`, {
        endpoint: subscription.endpoint
      });
      
      return response.status === 200 && response.data?.isValid !== false;
    } catch (error) {
      console.error('Error checking subscription on server:', error);
      // If server check fails, assume subscription might still be valid
      // to avoid unnecessary re-subscriptions
      return true;
    }
  },
  
  // Check permission status
  checkPermission: async () => {
    if (!get().serviceWorkerSupported) {
      set({ notificationPermission: 'unsupported' });
      return 'unsupported';
    }
    
    const permission = Notification.permission;
    set({ notificationPermission: permission });
    return permission;
  },
  
  // Request permission and subscribe
  subscribeToNotifications: async () => {
    set({ isLoading: true, error: null, message: null });
    
    try {
      if (!get().serviceWorkerSupported) {
        set({ 
          isLoading: false, 
          error: 'Push notifications are not supported in this browser' 
        });
        return false;
      }
      
      // Request permission if needed
      let permission = Notification.permission;
      if (permission !== 'granted') {
        permission = await Notification.requestPermission();
        set({ notificationPermission: permission });
        
        if (permission !== 'granted') {
          set({ 
            isLoading: false, 
            isSubscribed: false,
            error: permission === 'denied' ? 'Notifications are blocked' : 'Permission not granted'
          });
          return false;
        }
      }
      
      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed first
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('Found existing subscription during subscribe attempt');
        
        // Check if the existing subscription is valid on server
        const isValid = await get().checkSubscriptionOnServer(existingSubscription);
        
        if (isValid) {
          console.log('Existing subscription is valid, using it');
          // Already subscribed and valid
          set({
            isLoading: false,
            isSubscribed: true,
            subscription: existingSubscription,
            message: 'Already subscribed to notifications'
          });
          return true;
        } else {
          console.log('Existing subscription is invalid, removing it');
          // Invalid subscription, unsubscribe first
          try {
            await existingSubscription.unsubscribe();
          } catch (error) {
            console.warn('Error unsubscribing from existing subscription:', error);
          }
        }
      }
      
      console.log('Creating new subscription');
      // Create a new subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
      });
      
      // Send subscription to server with device info
      const deviceInfo = get().deviceInfo;
      await axios.post(`${NOTIFICATION_API_URL}/subscribe`, {
        subscription,
        deviceInfo: {
          ...deviceInfo,
          subscriptionTime: new Date().toISOString()
        }
      });
      
      console.log('Successfully created and registered new subscription');
      
      set({
        isLoading: false,
        notificationPermission: 'granted',
        isSubscribed: true,
        subscription,
        message: 'Successfully subscribed to notifications',
        error: null
      });

      // Show a test notification
      if (Notification.permission === 'granted') {
        new Notification('Notifications Enabled!', {
          body: `You'll now receive notifications on this ${deviceInfo?.type || 'device'}.`,
          icon: '/favicon.ico',
          badge: '/favicon.ico'
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      set({ 
        isLoading: false, 
        error: `Failed to subscribe: ${error.message}`,
        isSubscribed: false
      });
      return false;
    }
  },
  
  // Unsubscribe from notifications
  unsubscribeFromNotifications: async () => {
    set({ isLoading: true, error: null, message: null });
    
    try {
      if (!get().serviceWorkerSupported) {
        set({ isLoading: false });
        return false;
      }
      
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        console.log('Unsubscribing from:', subscription.endpoint);
        
        // Send unsubscribe request to the server first
        try {
          await axios.post(`${NOTIFICATION_API_URL}/unsubscribe`, {
            endpoint: subscription.endpoint
          });
          console.log('Successfully unsubscribed from server');
        } catch (apiError) {
          console.warn('Error unsubscribing from server, continuing anyway:', apiError);
        }
        
        // Unsubscribe locally
        await subscription.unsubscribe();
        console.log('Successfully unsubscribed locally');
      }
      
      set({
        isLoading: false,
        isSubscribed: false,
        subscription: null,
        message: 'Successfully unsubscribed from notifications',
        error: null
      });
      
      return true;
    } catch (error) {
      console.error('Error unsubscribing from notifications:', error);
      set({ 
        isLoading: false, 
        error: `Failed to unsubscribe: ${error.message}`
      });
      return false;
    }
  },
  
  // Retry after error
  retryNotification: async () => {
    set({ error: null, message: null });
    return await get().initializeNotifications();
  },
  
  // Set the last received notification
  setLastNotification: (notification) => {
    set({ lastNotification: notification });
  },
  
  // Clear any error or success messages
  clearMessages: () => {
    set({ error: null, message: null });
  },

  // Reset all state
  reset: () => set({
    isSubscribed: null,
    subscription: null,
    notificationPermission: null,
    isLoading: false,
    error: null,
    message: null,
    lastNotification: null,
    deviceInfo: null
  })
}));

// Listen for push notifications (if supported)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'PUSH_NOTIFICATION') {
      const notificationStore = useNotificationStore.getState();
      notificationStore.setLastNotification(event.data.notification);
    }
  });
}