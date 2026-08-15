import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Dropdown Component
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.trigger - Element that triggers the dropdown
 * @param {Array<{label: string, icon?: React.ReactNode, onClick: Function, className?: string, disabled?: boolean}>} props.items - Dropdown items
 * @param {string} props.align - Dropdown alignment (left, right)
 * @param {string} props.width - Dropdown width
 * @param {string} props.className - Additional CSS classes for the dropdown
 */
const Dropdown = ({ 
  trigger, 
  items = [], 
  align = 'right',
  width = 'w-48',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);
  
  // Handle item click
  const handleItemClick = (onClick, disabled) => {
    if (disabled) return;
    
    setIsOpen(false);
    if (typeof onClick === 'function') {
      onClick();
    }
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger element */}
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      
      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className={`absolute z-50 mt-2 ${width} rounded-xl shadow-xl bg-white ring-1 ring-black ring-opacity-5 focus:outline-none ${
              align === 'left' ? 'left-0' : 'right-0'
            } ${className}`}
          >
            <div className="py-1" role="menu" aria-orientation="vertical">
              {items.map((item, index) => (
                <div
                  key={index}
                  onClick={() => handleItemClick(item.onClick, item.disabled)}
                  className={`px-4 py-2 text-sm flex items-center ${
                    item.disabled
                      ? 'text-gray-300 cursor-not-allowed'
                      : `${
                          item.className || 'text-gray-700'
                        } hover:bg-gray-100 cursor-pointer`
                  } transition-colors`}
                  role="menuitem"
                >
                  {item.icon && (
                    <span className="flex-shrink-0">{item.icon}</span>
                  )}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dropdown;