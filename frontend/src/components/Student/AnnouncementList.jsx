import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Calendar, Eye, ChevronDown, ChevronUp, Loader, AlertCircle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

const AnnouncementItem = ({ announcement, index, onAnnouncementClick }) => {
  const [expanded, setExpanded] = useState(false);
  
  const toggleExpand = () => setExpanded(!expanded);
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return format(date, 'MMMM d, yyyy');
  };

  // Check if content is long enough to need expansion
  const shouldShowReadMore = announcement.content && announcement.content.length > 150;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="border border-gray-200 rounded-xl hover:shadow-lg transition-all bg-white overflow-hidden flex-shrink-0"
    >
      <div className="p-4">
        {/* Header */}
        <div className="mb-3">
          <h3 className="font-bold text-lg text-gray-800 mb-2 line-clamp-2">
            {announcement.title}
          </h3>
          <div className="flex items-center text-gray-500 text-sm">
            <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{formatDate(announcement.created_at)}</span>
          </div>
        </div>
        
        {/* Content */}
        <div className="mb-3">
          <div className={`text-gray-600 leading-relaxed text-sm ${
            expanded ? '' : 'line-clamp-2'
          }`}>
            {announcement.content}
          </div>
          
          {shouldShowReadMore && (
            <button
              onClick={toggleExpand}
              className="inline-flex items-center text-blue-600 text-xs mt-1 hover:text-blue-800 transition-colors font-medium"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Read more
                </>
              )}
            </button>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-gray-100">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onAnnouncementClick(index)}
            className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all text-xs font-medium shadow-md hover:shadow-lg"
          >
            <Eye className="w-3 h-3 mr-1.5" />
            View Full
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

const AnnouncementsList = ({ announcements, onAnnouncementClick, onViewAll, isLoading }) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 h-[600px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
        <h2 className="text-2xl font-bold flex items-center text-gray-800">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center mr-3 shadow-md">
            <Bell className="w-5 h-5 text-white" />
          </div>
          Recent Announcements
        </h2>
        
 
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-full">
            <Loader className="w-10 h-10 text-blue-500 animate-spin mb-3" />
            <span className="text-gray-600 font-medium">Loading announcements...</span>
          </div>
        ) : announcements && announcements.length > 0 ? (
          <div className="h-full overflow-y-auto p-4">
            <div className="space-y-3">
              {announcements.map((announcement, index) => (
                <AnnouncementItem 
                  key={announcement.id} 
                  announcement={announcement}
                  index={index}
                  onAnnouncementClick={onAnnouncementClick}
                />
              ))}
            </div>
            
            {/* View All Footer Button (alternative placement) */}
            <div className="mt-6 pt-4 border-t border-gray-100 text-center">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onViewAll}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 text-gray-700 rounded-lg transition-all text-sm font-medium border border-gray-200 hover:border-gray-300"
              >
                View All Announcements
                <ArrowRight className="w-4 h-4 ml-2" />
              </motion.button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Announcements</h3>
            <p className="text-gray-500 max-w-sm leading-relaxed mb-4">
              There are no active announcements at the moment. Check back later for updates!
            </p>
            
            {/* View All Button in Empty State */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onViewAll}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all text-sm font-medium shadow-md hover:shadow-lg"
            >
              Browse All Announcements
              <ArrowRight className="w-4 h-4 ml-2" />
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementsList;