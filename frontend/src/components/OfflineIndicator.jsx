import React from 'react';
import { useAuthStore } from '../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';

export default function OfflineIndicator() {
  const { isOnline } = useAuthStore();
  
  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-xl shadow-lg z-50 flex items-center gap-3"
        >
          <WifiOff className="h-5 w-5" />
          <div className="text-sm font-medium">
            <div>You are offline</div>
            <div className="text-xs text-white/80">Some features are read-only. Changes will sync when online.</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}