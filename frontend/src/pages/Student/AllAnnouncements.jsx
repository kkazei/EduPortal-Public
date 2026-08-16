import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Bell, Calendar, Eye, Search, Loader } from 'lucide-react';
import { format } from 'date-fns';
import { useAnnouncementStore } from '../../store/announcementStore';
import { useStudentStore } from '../../store/studentStore';
import { useAuthStore } from '../../store/authStore';

const AllAnnouncements = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { currentStudent, fetchStudentByUserId } = useStudentStore();
  const { 
    announcements,
    isLoading,
    fetchAdviserAnnouncements
  } = useAnnouncementStore();

  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (searchParams.get('focus') === 'search') {
      searchInputRef.current?.focus();
    }
  }, [searchParams]);

  useEffect(() => {
    const loadStudentAndAnnouncements = async () => {
      try {
        if (user?.id) {
          console.log('AllAnnouncements - Loading student data for user:', user.id);
          
          // First fetch the student data
          const studentData = await fetchStudentByUserId(user.id);
          
          // Then fetch announcements from adviser only
          if (studentData?.class?.adviser?.id) {
            console.log('AllAnnouncements - Fetching announcements from adviser:', studentData.class.adviser.id);
            await fetchAdviserAnnouncements(studentData.class.adviser.id, {
              limit: 50
            });
          } else {
            console.log('AllAnnouncements - No adviser found for student');
          }
        }
      } catch (error) {
        console.error('Error loading student and announcements:', error);
      }
    };

    loadStudentAndAnnouncements();
  }, [user, fetchStudentByUserId, fetchAdviserAnnouncements]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return format(date, 'MMMM d, yyyy');
  };

  // Filter announcements based on search only (now filtering adviser announcements)
  const filteredAnnouncements = announcements.filter(announcement => 
    announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    announcement.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAnnouncementClick = (announcement) => {
    console.log('Navigating to public announcement:', announcement.id);
    // Navigate to the public announcement page (same as in the modal)
    window.open(`/announcement/${announcement.id}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center mb-4 space-y-3 sm:space-y-0">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                console.log('Back button clicked - navigating to /student-dashboard');
                navigate('/student-dashboard');
              }}
              className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all mr-0 sm:mr-4 text-sm sm:text-base w-fit"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </motion.button>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 flex items-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3 shadow-md">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
              </div>
              Class Announcements
            </h1>
          </div>
          <p className="text-gray-600 text-base sm:text-lg">
            {currentStudent?.class?.adviser?.user_fullname 
              ? `Browse all announcements from your class adviser, ${currentStudent.class.adviser.user_fullname}.`
              : 'Browse all announcements from your class adviser.'
            }
          </p>
          {currentStudent?.class && (
            <p className="text-blue-600 text-sm sm:text-base font-medium mt-2">
              {currentStudent.class.class_name}
            </p>
          )}
        </motion.div>

        {/* Search Only */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search class announcements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
            />
          </div>
        </motion.div>

        {/* Announcements Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {isLoading ? (
            <div className="flex flex-col justify-center items-center py-20">
              <Loader className="w-10 h-10 text-blue-500 animate-spin mb-3" />
              <span className="text-gray-600 font-medium text-sm sm:text-base">Loading announcements...</span>
            </div>
          ) : filteredAnnouncements.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredAnnouncements.map((announcement, index) => (
                <motion.div
                  key={announcement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all overflow-hidden cursor-pointer"
                  onClick={() => handleAnnouncementClick(announcement)}
                >
                  <div className="p-4 sm:p-6">
                    {/* Header */}
                    <div className="mb-3 sm:mb-4">
                      <h3 className="font-bold text-base sm:text-lg text-gray-800 mb-2 line-clamp-2">
                        {announcement.title}
                      </h3>
                      <div className="flex items-center text-gray-500 text-xs sm:text-sm">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                        <span>{formatDate(announcement.created_at)}</span>
                      </div>
                    </div>

                    {/* Content Preview */}
                    <div className="mb-4">
                      <p className="text-gray-600 text-xs sm:text-sm line-clamp-3">
                        {announcement.content}
                      </p>
                    </div>

                    {/* Creator Info */}
                    <div className="mb-3 text-xs text-blue-600">
                      By: {announcement.creator?.user_fullname || 'Class Adviser'}
                    </div>

                    {/* View Button */}
                    <div className="flex justify-end">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent card click
                          handleAnnouncementClick(announcement);
                        }}
                        className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-xs sm:text-sm font-medium shadow-md hover:shadow-lg"
                      >
                        <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        Announcement
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">No Class Announcements Found</h3>
              <p className="text-gray-500 text-sm sm:text-base px-4">
                {searchTerm 
                  ? 'Try adjusting your search criteria.'
                  : currentStudent?.class?.adviser?.user_fullname
                    ? `Your class adviser, ${currentStudent.class.adviser.user_fullname}, hasn't posted any announcements yet.`
                    : 'No announcements are available from your class adviser at the moment.'
                }
              </p>
            </div>
          )}
        </motion.div>

        {/* Results Count */}
        {!isLoading && filteredAnnouncements.length > 0 && (
          <div className="mt-6 sm:mt-8 text-center text-gray-600 text-sm sm:text-base">
            Showing {filteredAnnouncements.length} announcement{filteredAnnouncements.length !== 1 ? 's' : ''} from your class adviser
          </div>
        )}
      </div>
    </div>
  );
};

export default AllAnnouncements;
