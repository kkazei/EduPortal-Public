import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNotificationStore } from '../store/notificationStore';

const NotificationToggle = ({ variant = 'teacher' }) => {
  const {
    isSubscribed,
    notificationPermission,
    isLoading,
    serviceWorkerSupported,
    initializeNotifications,
    subscribeToNotifications,
    unsubscribeFromNotifications,
  } = useNotificationStore();

  const [hasInitialized, setHasInitialized] = useState(false);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      if (!hasInitialized) {
        await initializeNotifications();
        setHasInitialized(true);
      }
    };
    init();
  }, [initializeNotifications, hasInitialized]);

  const handleToggle = async () => {
    if (isLoading) return;

    if (isSubscribed) {
      await unsubscribeFromNotifications();
    } else {
      await subscribeToNotifications();
    }
  };

  // Don't show if not supported or denied
  if (!serviceWorkerSupported || notificationPermission === 'denied' || notificationPermission === 'unsupported') {
    return null;
  }

  // Show loading state
  if (isLoading && !hasInitialized) {
    return (
      <div className="w-11 h-6 bg-gray-300 rounded-full animate-pulse" />
    );
  }

  // Different styles based on variant
  const getToggleClasses = () => {
    if (variant === 'teacher') {
      // For teacher dashboard (blue background)
      return {
        background: isSubscribed ? 'bg-white bg-opacity-30' : 'bg-white bg-opacity-20',
        toggle: 'bg-white'
      };
    } else {
      // For student dashboard (white background)
      return {
        background: isSubscribed ? 'bg-blue-500' : 'bg-gray-300',
        toggle: 'bg-white'
      };
    }
  };

  const styles = getToggleClasses();

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={handleToggle}
      disabled={isLoading}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        styles.background
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <motion.span
        animate={{ x: isSubscribed ? 20 : 4 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`inline-block h-4 w-4 rounded-full ${styles.toggle} shadow-lg`}
      />
    </motion.button>
  );
};

export default NotificationToggle;