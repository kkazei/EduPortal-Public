import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, User, LogIn } from 'lucide-react';
import { format } from 'date-fns';

const AnnouncementCard = ({ 
  announcement, 
  isAuthenticated, 
  onImageClick, 
  getFullImageUrl 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6"
    >
      {/* Banner/Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 sm:p-8 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 opacity-10">
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M160 0H40C17.9086 0 0 17.9086 0 40V160C0 182.091 17.9086 200 40 200H160C182.091 200 200 182.091 200 160V40C200 17.9086 182.091 0 160 0Z" fill="white"/>
          </svg>
        </div>
        
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">{announcement.title}</h1>
          <div className="flex flex-wrap items-center text-sm sm:text-base text-blue-100 gap-4">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1.5" />
              <span>
                {announcement.publish_date ? 
                  format(new Date(announcement.publish_date), 'MMMM d, yyyy') : 
                  'Unknown date'}
              </span>
            </div>
            <div className="flex items-center">
              <User className="h-4 w-4 mr-1.5" />
              <span>{announcement.creator?.user_fullname || 'Unknown'}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6 sm:p-8">
        {/* Images */}
        {announcement.images && announcement.images.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {announcement.images.map((image, index) => (
              <motion.div 
                key={image.id} 
                className="relative rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                <img 
                  src={getFullImageUrl(image.image_url)}
                  alt="" 
                  className="w-full h-48 sm:h-56 object-cover cursor-pointer"
                  onClick={() => onImageClick(image.image_url, index)}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                  }}
                />
              </motion.div>
            ))}
          </div>
        )}
        
        {/* Content */}
        <div className="prose prose-lg max-w-none">
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
            {announcement.content}
          </p>
        </div>
        
        {/* Footer */}
        <div className="mt-10 pt-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center">
            <span className="font-medium mr-2">Published by:</span>
            <span>{announcement.creator?.user_fullname || 'Unknown'}</span>
          </div>
          
          {!isAuthenticated && (
            <Link 
              to="/student-login" 
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <LogIn className="h-4 w-4 mr-2" /> 
              Login to Comment
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AnnouncementCard;