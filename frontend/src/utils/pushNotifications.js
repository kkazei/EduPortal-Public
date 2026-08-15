import axios from 'axios';

// VAPID public key from your backend
// You'll need to generate this on your server
const PUBLIC_VAPID_KEY = 'YOUR_PUBLIC_VAPID_KEY'; // Replace with your actual VAPID public key

// Helper function to convert the VAPID key to the right format
function urlBase64ToUint8Array(base64String) {
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
}

// Check if the browser supports push notifications
export function isPushNotificationSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

// Request notification permission
export async function requestNotificationPermission() {
  if (!isPushNotificationSupported()) {
    return { status: 'unsupported' };
  }

  try {
    const permission = await Notification.requestPermission();
    return { status: permission };
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return { status: 'error', error };
  }
}

// Subscribe to push notifications
export async function subscribeToPushNotifications() {
  if (!isPushNotificationSupported()) {
    console.log('Push notifications are not supported in this browser');
    return null;
  }

  try {
    // Check if permission is already granted
    if (Notification.permission !== 'granted') {
      const permission = await requestNotificationPermission();
      if (permission.status !== 'granted') {
        console.log('Notification permission was not granted');
        return null;
      }
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    // If not subscribed, create a new subscription
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
      });
    }

    // Send the subscription to our backend
    await saveSubscription(subscription);
    
    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return null;
  }
}

// Send the subscription to the backend
async function saveSubscription(subscription) {
  try {
    await axios.post('/api/push/subscribe', { subscription });
    console.log('Push subscription saved to server');
    return true;
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return false;
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPushNotifications() {
  if (!isPushNotificationSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      return true; // Already unsubscribed
    }

    // Send the unsubscribe request to the backend
    await axios.post('/api/push/unsubscribe', { endpoint: subscription.endpoint });
    
    // Unsubscribe on the browser
    await subscription.unsubscribe();
    
    console.log('Successfully unsubscribed from push notifications');
    return true;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
}