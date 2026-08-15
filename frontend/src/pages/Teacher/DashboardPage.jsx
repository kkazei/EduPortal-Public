import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, Users, Bell, Eye, X, Plus, Calendar, Search, MoreHorizontal, Info } from 'lucide-react';
import { useClassStore } from '../../store/classStore';
import { useAuthStore } from '../../store/authStore';
import { useAnnouncementStore } from '../../store/announcementStore';
import { useStudentStore } from '../../store/studentStore';
import { useSchoolYearStore } from '../../store/schoolYearStore';
import NotificationToggle from '../../components/NotificationToggle';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    classes, 
    fetchClasses, 
    createClass, 
    isLoading, 
    error, 
    message,
    clearMessages 
  } = useClassStore();
  const { selected, fetchYears } = useSchoolYearStore();
  
  const { 
    announcements, 
    fetchAnnouncements, 
    pagination 
  } = useAnnouncementStore();
  const { getClassStudents } = useStudentStore();

  // Track accurate student count by fetching live lists per class
  const [myStudentsCount, setMyStudentsCount] = useState(0);
  const [isCountingStudents, setIsCountingStudents] = useState(false);

  // State for the create class modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    grade_level: '',
    section: ''
  });
  
  // State for search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Get current date in a formatted string
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Get user's display name
  const displayName = user?.user_fullname || user?.username || "User";
  
  // Check if user is adviser of the class
  const isAdviserOfClass = (classItem) => {
    return classItem.adviser_id === user?.id;
  };

  // Filter classes to only show classes where user is adviser
  const myClasses = classes.filter(classItem => isAdviserOfClass(classItem));

  // Filter announcements to only show those created by the current user
  const myAnnouncements = announcements.filter(announcement => 
    announcement.user_id === user?.id || announcement.created_by === user?.id
  );

  // Get only active announcements created by the current user
  const myActiveAnnouncements = myAnnouncements.filter(announcement => announcement.is_active);

  // Recompute student total by fetching class students like in ClassStudentsPage
  useEffect(() => {
    const classIds = myClasses.map(c => c.id);
    if (classIds.length === 0) {
      setMyStudentsCount(0);
      return;
    }
    let cancelled = false;
    const loadCounts = async () => {
      try {
        setIsCountingStudents(true);
        const lists = await Promise.all(classIds.map(id => getClassStudents(id).catch(() => [])));
        if (cancelled) return;
        const total = lists.reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);
        setMyStudentsCount(total);
      } finally {
        if (!cancelled) setIsCountingStudents(false);
      }
    };
    loadCounts();
    return () => { cancelled = true; };
  }, [myClasses.map(c => c.id).join(','), getClassStudents]);

  // Fetch classes and announcements on component mount
  useEffect(() => {
    // Ensure school years are loaded and then fetch classes for selected year
    (async () => {
      await fetchYears();
      await fetchClasses(selected || undefined);
    })();
    // Fetch announcements created by the current user only
    fetchAnnouncements({ 
      is_active: true,
      user_id: user?.id // Add user_id filter to only fetch user's announcements
    });
  }, [fetchClasses, fetchAnnouncements, fetchYears, user?.id]);

  // Refetch classes when the selected school year changes
  useEffect(() => {
    if (selected) {
      fetchClasses(selected).catch(() => {});
    }
  }, [selected]);

  // Show toast messages for error/success
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearMessages();
    }
    if (message) {
      toast.success(message);
      clearMessages();
    }
  }, [error, message, clearMessages]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createClass({ ...formData, school_year: selected });
      setIsModalOpen(false);
      setFormData({
        grade_level: '',
        section: ''
      });
    } catch (err) {
      // Error is handled by the store and displayed via toast
    }
  };

  // Handle modal close
  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Handle clicking the View button
  const handleViewClass = (classId) => {
    navigate(`/class/${classId}/students`);
  };
  
  // Filter classes based on search query (only from user's classes)
  const filteredClasses = myClasses.filter(classItem => 
    classItem.grade_level.toLowerCase().includes(searchQuery.toLowerCase()) ||
    classItem.section.toLowerCase().includes(searchQuery.toLowerCase()) ||
    classItem.school_year.includes(searchQuery)
  );

  // Get recent announcements max 3 (only user's announcements)
  const recentAnnouncements = myActiveAnnouncements
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 pt-20 sm:pt-24 sm:p-8 w-full max-w-7xl mx-auto"
    >
      {/* Unified Hero Section: Welcome + Recent Announcements */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-8 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10 pointer-events-none select-none">
            <svg width="260" height="260" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M160 0H40C17.9086 0 0 17.9086 0 40V160C0 182.091 17.9086 200 40 200H160C182.091 200 200 182.091 200 160V40C200 17.9086 182.091 0 160 0Z" fill="white"/>
            </svg>
          </div>
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Left Column: Welcome */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 mr-3 text-blue-200" />
                  <p className="text-blue-100 font-medium">{currentDate}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-blue-100 text-sm">Enable Notifications</span>
                  <NotificationToggle variant="teacher" />
                </div>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3 break-words">Welcome back, {displayName}!</h1>
              <p className="text-blue-100 text-base max-w-xl leading-relaxed">
                You have <span className="font-bold text-white">{myClasses.length}</span> classes you advise, with a total of <span className="font-bold text-white">{isCountingStudents ? '—' : myStudentsCount}</span> students.
              </p>
            </div>
            {/* Right Column: Announcements */}
            <div className="w-full lg:w-96 bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-semibold tracking-wide uppercase">Recent Announcements</h2>
                <button
                  onClick={() => navigate('/announcement')}
                  className="text-amber-300 hover:text-amber-200 text-xs font-medium transition-colors"
                >
                  View All
                </button>
              </div>
              <div className="space-y-3 text-xs flex-1">
                {recentAnnouncements.length === 0 ? (
                  <p className="text-blue-100">No announcements yet</p>
                ) : (
                  recentAnnouncements.map((announcement) => (
                    <div key={announcement.id} className="border-l-4 border-amber-300/80 pl-3 py-1">
                      <h3 className="font-medium text-white line-clamp-1">{announcement.title}</h3>
                      <p className="text-blue-100 text-[11px] leading-tight">
                        {new Date(announcement.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <motion.div 
          whileHover={{ y: -5, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
          className="bg-white p-6 rounded-2xl shadow-md border-b-4 border-blue-500"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 font-medium text-sm mb-1">My Classes</p>
              <h3 className="text-3xl font-bold text-gray-800">{myClasses.length}</h3>
            </div>
            <div className="bg-blue-100 p-3 rounded-xl">
              <Book className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="text-blue-600 text-sm font-medium flex items-center hover:text-blue-800"
            >
              <Plus className="h-4 w-4 mr-1" /> Add New Class
            </button>
          </div>
        </motion.div>
        
        <motion.div 
          whileHover={{ y: -5, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
          className="bg-white p-6 rounded-2xl shadow-md border-b-4 border-green-500"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 font-medium text-sm mb-1">My Students</p>
              <h3 className="text-3xl font-bold text-gray-800">
                {isCountingStudents ? '—' : myStudentsCount}
              </h3>
            </div>
            <div className="bg-green-100 p-3 rounded-xl">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              From {myClasses.length} classes
            </p>
          </div>
        </motion.div>
        
        <motion.div 
          whileHover={{ y: -5, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
          className="bg-white p-6 rounded-2xl shadow-md border-b-4 border-amber-500"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 font-medium text-sm mb-1">My Announcements</p>
              <h3 className="text-3xl font-bold text-gray-800">
                {/* Only count active announcements created by current user */}
                {myActiveAnnouncements.length}
              </h3>
            </div>
            <div className="bg-amber-100 p-3 rounded-xl">
              <Bell className="h-6 w-6 text-amber-600" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button 
              onClick={() => navigate('/announcement')}
              className="text-amber-600 text-sm font-medium flex items-center hover:text-amber-800"
            >
              <Plus className="h-4 w-4 mr-1" /> Create Announcement
            </button>
          </div>
        </motion.div>
      </div>
      
      {/* Class List Section */}
      <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
          <h2 className="text-2xl font-bold text-gray-800">My Classes</h2>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative flex-grow sm:max-w-xs">
              <input
                type="text"
                placeholder="Search classes..."
                className="w-full px-4 py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Class
            </button>
          </div>
        </div>
        
        {/* Mobile Class List - Card view for mobile */}
        <div className="grid grid-cols-1 sm:hidden gap-4 mb-4">
          {isLoading ? (
            <div className="text-center py-10">
              <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading classes...</p>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">
                {searchQuery ? "No classes match your search." : "No classes found. Create your first class!"}
              </p>
            </div>
          ) : (
            filteredClasses.map((classItem) => (
              <motion.div 
                key={classItem.id}
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-xl shadow-sm p-4 border border-gray-100"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-800 text-lg">{classItem.grade_level} - {classItem.section}</h3>
                    <p className="text-gray-500 text-sm">S.Y. {classItem.school_year}</p>
                  </div>
                  <span className="bg-blue-100 text-blue-800 text-xs py-1 px-3 rounded-full font-medium">
                    {Math.max(0, classItem.student_count || 0)} students
                  </span>
                </div>
                <p className="text-gray-500 text-sm mb-3">Adviser: {classItem.adviser_name}</p>
                <div className="flex justify-end">
                  <button 
                    onClick={() => handleViewClass(classItem.id)}
                    className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-300 flex items-center text-sm"
                  >
                    <Eye className="h-4 w-4 mr-1" /> View Class
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
        
        {/* Desktop Class List - Table view for desktop */}
        <div className="hidden sm:block overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-10">
              <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading classes...</p>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">
                {searchQuery ? "No classes match your search." : "No classes found. Create your first class!"}
              </p>
            </div>
          ) : (
            <table className="min-w-full bg-white rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50">
                  <th className="py-3 px-6 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b">School Year</th>
                  <th className="py-3 px-6 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b">Grade Level</th>
                  <th className="py-3 px-6 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b">Section</th>
                  <th className="py-3 px-6 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b">Adviser</th>
                  <th className="py-3 px-6 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b">Students</th>
                  <th className="py-3 px-6 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClasses.map((classItem, index) => (
                  <motion.tr 
                    key={classItem.id} 
                    className="hover:bg-gray-50"
                    whileHover={{ backgroundColor: "rgba(249, 250, 251, 1)" }}
                  >
                    <td className="py-4 px-6 border-b">{classItem.school_year}</td>
                    <td className="py-4 px-6 border-b">{classItem.grade_level}</td>
                    <td className="py-4 px-6 border-b">{classItem.section}</td>
                    <td className="py-4 px-6 border-b">{classItem.adviser_name}</td>
                    <td className="py-4 px-6 border-b">
                      <span className="bg-blue-100 text-blue-800 text-xs py-1 px-3 rounded-full">
                        {classItem.student_count || 0}
                      </span>
                    </td>
                    <td className="py-4 px-6 border-b">
                      <div className="flex justify-center space-x-2">
                        <button 
                          onClick={() => handleViewClass(classItem.id)}
                          className="bg-blue-600 text-white py-1 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-300 flex items-center text-sm"
                        >
                          <Eye className="h-4 w-4 mr-1" /> View
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      {/* Create Class Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Create New Class</h2>
                <button 
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2" htmlFor="grade_level">
                    Grade Level
                  </label>
                  <select
                    id="grade_level"
                    name="grade_level"
                    value={formData.grade_level}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Grade Level</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(grade => (
                      <option key={grade} value={`Grade ${grade}`}>Grade {grade}</option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-2" htmlFor="section">
                    Section
                  </label>
                  <input
                    type="text"
                    id="section"
                    name="section"
                    value={formData.section}
                    onChange={handleChange}
                    placeholder="e.g. Section A"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block text-gray-700 font-medium mb-2" htmlFor="school_year">
                    School Year
                  </label>
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50">
                    {selected || '—'}
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" /> Create Class
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DashboardPage;