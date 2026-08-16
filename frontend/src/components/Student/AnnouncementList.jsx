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
      className="flex-shrink-0 overflow-hidden rounded-2xl border border-blue-100 bg-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-900/5"
    >
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="mb-3">
          <h3 className="mb-2 line-clamp-2 text-base font-bold text-slate-800 sm:text-lg">
            {announcement.title}
          </h3>
          <div className="flex items-center text-sm text-slate-500">
            <Calendar className="mr-2 h-4 w-4 flex-shrink-0 text-blue-500" />
            <span>{formatDate(announcement.created_at)}</span>
          </div>
        </div>
        
        {/* Content */}
        <div className="mb-3">
          <div className={`text-sm leading-relaxed text-slate-600 ${
            expanded ? '' : 'line-clamp-2'
          }`}>
            {announcement.content}
          </div>
          
          {shouldShowReadMore && (
            <button
              onClick={toggleExpand}
              className="mt-1 inline-flex items-center text-xs font-semibold text-blue-600 transition-colors hover:text-blue-800"
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
        <div className="flex items-center justify-end border-t border-slate-100 pt-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onAnnouncementClick(index)}
            className="inline-flex items-center rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-blue-900/10 transition-all hover:bg-blue-700 hover:shadow-lg"
          >
            <Eye className="w-3 h-3 mr-1.5" />
            Announcement
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

const AnnouncementsList = ({ announcements, onAnnouncementClick, onViewAll, isLoading }) => {
  return (
    <div className="flex flex-col rounded-3xl border border-blue-100 bg-white shadow-xl shadow-blue-900/5 lg:h-[620px]">
      {/* Header */}
      <div className="flex flex-shrink-0 items-start justify-between border-b border-blue-50 p-5 sm:items-center sm:p-6">
        <div>
          <h2 className="flex items-center text-xl font-bold text-slate-900 sm:text-2xl">
            <div className="mr-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 shadow-md">
              <Bell className="h-5 w-5 text-white" />
            </div>
            Recent Announcements
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Updates from your class adviser
          </p>
        </div>
        <span className="hidden rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 sm:inline-flex">
          {announcements?.length || 0} active
        </span>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-full">
            <Loader className="w-10 h-10 text-blue-500 animate-spin mb-3" />
            <span className="text-gray-600 font-medium">Loading announcements...</span>
          </div>
        ) : announcements && announcements.length > 0 ? (
          <div className="max-h-[620px] overflow-y-auto p-4 lg:h-full lg:max-h-none">
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
            <div className="mt-6 border-t border-slate-100 pt-4 text-center">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onViewAll}
                className="inline-flex items-center rounded-2xl border border-blue-100 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700 transition-all hover:border-blue-200 hover:bg-blue-100"
              >
                Announcements
                <ArrowRight className="w-4 h-4 ml-2" />
              </motion.button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center lg:h-full">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
              <AlertCircle className="h-8 w-8 text-blue-300" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-slate-700">No Announcements</h3>
            <p className="mb-4 max-w-sm leading-relaxed text-slate-500">
              There are no active announcements at the moment. Check back later for updates!
            </p>
            
            {/* View All Button in Empty State */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onViewAll}
              className="inline-flex items-center rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-900/10 transition-all hover:bg-blue-700 hover:shadow-lg"
            >
              Announcements
              <ArrowRight className="w-4 h-4 ml-2" />
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementsList;
