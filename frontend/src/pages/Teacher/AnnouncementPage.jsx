import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, Calendar, User, Bell, Edit, MoreHorizontal, XCircle, Search, Archive, Upload, X, Share2, ExternalLink, ArrowLeft } from 'lucide-react';
import { useAnnouncementStore } from '../../store/announcementStore';
import { useAuthStore } from '../../store/authStore';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import Dropdown from '../../components/Dropdown';
import AnnouncementFormModal from '../../components/Modals/AnnouncementFormModal';

const AnnouncementPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isTeacherOrAdmin = user && (user.user_role === 'teacher' || user.user_role === 'admin');
  
  // Add new state for modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Get announcement data and methods from the announcement store
  const { 
    announcements, 
    isLoading, 
    error,
    message,
    fetchAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    toggleAnnouncementStatus,
    clearMessages,
    pagination,
    getFullImageUrl  // Include this utility function from the store
  } = useAnnouncementStore();

  // Local state
  const [newAnnouncement, setNewAnnouncement] = useState({ 
    title: '', 
    content: ''
  });
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [imagesToRemove, setImagesToRemove] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAnnouncementId, setCurrentAnnouncementId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedAnnouncements, setExpandedAnnouncements] = useState({});
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImage, setViewerImage] = useState('');
  // Remove the showOnlyMyAnnouncements state since we're always showing user's announcements
  const skipInitialFetchRef = useRef(false);

  // Handle file selection for multiple images
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate files (size, type, etc.)
    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 5MB`);
        return false;
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      
      return true;
    });
    
    // Limit to 10 images total
    if (selectedImages.length + validFiles.length > 10) {
      toast.error('You can upload a maximum of 10 images');
      return;
    }
    
    // Add valid files to state
    setSelectedImages(prev => [...prev, ...validFiles]);
    
    // Create preview URLs
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  // Remove a selected image
  const removeImage = (index) => {
    setSelectedImages(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
    
    setImagePreviews(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index]); // Clean up the URL
      updated.splice(index, 1);
      return updated;
    });
  };

  // Remove an existing image (when editing)
  const removeExistingImage = (imageId) => {
    setImagesToRemove(prev => [...prev, imageId]);
  };

  // Fetch announcements on component mount and when filters change
  useEffect(() => {
    // Skip fetch if it was just triggered by the button click
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      return;
    }
    
    const filters = {
      search: searchQuery,
      page: currentPage,
      is_active: true,
      limit: 5
    };
    
    // Always filter by user ID since we only show user's announcements
    if (user) {
      filters.user_id = user.id;
    }
    
    fetchAnnouncements(filters).catch(error => {
      console.error("Failed to fetch announcements:", error);
      toast.error("Failed to load announcements");
    });
  }, [fetchAnnouncements, searchQuery, currentPage, user]);
  
  // Handle toast notifications
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
  
  // Clean up image preview URLs when component unmounts
  useEffect(() => {
    return () => {
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  // Handle form submission for creating/editing announcements
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const formData = new FormData();
      formData.append('title', newAnnouncement.title);
      formData.append('content', newAnnouncement.content);
      
      // Add new images
      selectedImages.forEach(image => {
        formData.append('images', image);
      });
      
      // When editing, add image IDs to remove
      if (isEditing && imagesToRemove.length > 0) {
        formData.append('removed_image_ids', imagesToRemove.join(','));
      }
      
      if (isEditing && currentAnnouncementId) {
        await updateAnnouncement(currentAnnouncementId, formData);
      } else {
        await createAnnouncement(formData);
      }
      
      // Reset state after successful submission
      setNewAnnouncement({ title: '', content: '' });
      setSelectedImages([]);
      
      // Clean up preview URLs
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
      setImagePreviews([]);
      
      setImagesToRemove([]);
      setIsModalOpen(false);
      setIsEditing(false);
    } catch (error) {
      console.error('Error submitting announcement:', error);
      toast.error(error.response?.data?.message || 'Failed to submit announcement');
    }
  };

  // Open the modal function
  const openAnnouncementModal = (editing = false, announcement = null) => {
    if (editing && announcement) {
      setNewAnnouncement({
        title: announcement.title,
        content: announcement.content
      });
      setCurrentAnnouncementId(announcement.id);
      setIsEditing(true);
      
      // Set image preview if announcement has an image
      if (announcement.images && announcement.images.length > 0) {
        const previews = announcement.images.map(img => getFullImageUrl(img.image_url));
        setImagePreviews(previews);
      } else {
        setImagePreviews([]);
      }
    } else {
      // For new announcement
      setNewAnnouncement({ title: '', content: '' });
      setIsEditing(false);
      setSelectedImages([]);
      setImagePreviews([]);
    }
    
    setIsModalOpen(true);
  };
  
  // Close modal function
  const closeAnnouncementModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setNewAnnouncement({ title: '', content: '' });
    setSelectedImages([]);
    setImagePreviews([]);
  };
  
  // Modify the handleEdit function
  const handleEdit = (announcement) => {
    openAnnouncementModal(true, announcement);
  };
  
  // Handle toggling announcement status (archive)
  const handleToggleStatus = async (announcementId) => {
    try {
      await toggleAnnouncementStatus(announcementId);
      
      // After toggling status, immediately refresh the announcements list
      // to remove archived announcements from the UI
      await fetchAnnouncements({
        search: searchQuery,
        page: currentPage,
        limit: 5,
        is_active: true,
        user_id: user?.id // Always include user_id filter
      });
      
      toast.success("Announcement archived successfully");
    } catch (error) {
      console.error("Failed to archive announcement:", error);
      toast.error("Failed to archive announcement");
    }
  };

  // Add this function in your component
  const shareAnnouncement = (announcementId) => {
    const shareUrl = `${window.location.origin}/announcement/${announcementId}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => toast.success('Announcement link copied! Ready to share.'))
      .catch(() => toast.error('Failed to copy link'));
  };

  // Add this function to toggle expanded state
  const toggleAnnouncementExpansion = (id) => {
    setExpandedAnnouncements(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Add this function to open the image viewer
  const openImageViewer = (imageUrl) => {
    setViewerImage(getFullImageUrl(imageUrl));
    setViewerOpen(true);
  };

  // Add this function to close the image viewer
  const closeImageViewer = () => {
    setViewerOpen(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 pt-20 sm:pt-24 sm:p-8 w-full max-w-7xl mx-auto"
    >
      {/* Header section with page title and create button */}
      <div className="bg-blue-700 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M160 0H40C17.9086 0 0 17.9086 0 40V160C0 182.091 17.9086 200 40 200H160C182.091 200 200 182.091 200 160V40C200 17.9086 182.091 0 160 0Z" fill="white"/>
          </svg>
        </div>

        {/* Add back button for mobile */}
        <div className="mb-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center text-white bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg px-3 py-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span>Back to Dashboard</span>
          </button>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">My Announcements</h1>
            <p className="text-blue-100">Manage your announcements and important updates</p>
          </div>
          
          {isTeacherOrAdmin && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => openAnnouncementModal()}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration:300 flex items-center shadow-md relative z-10"
            >
              <PlusCircle className="h-5 w-5 mr-2" />
              Create Announcement
            </motion.button>
          )}
        </div>
      </div>
      
      {/* Search bar */}
      <div className="bg-white p-4 rounded-2xl shadow-md mb-6">
        <div className="relative flex-grow">
          <input
            type="text"
            placeholder="Search your announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <Search className="h-4 w-4 text-gray-500" />
          </div>
        </div>
      </div>
      
      {/* Remove the filter options section entirely since we only show user's announcements */}
      
      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="ml-2 text-gray-600">Loading announcements...</span>
        </div>
      )}
      
      {/* Announcement Feed */}
      <div className="space-y-6">
        {!isLoading && announcements.length === 0 ? (
          <div className="text-center p-10 bg-white rounded-2xl shadow-md">
            <Bell className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No announcements found</p>
            {searchQuery ? (
              <p className="text-gray-500 mt-1">Try adjusting your search criteria</p>
            ) : (
              <p className="text-gray-500 mt-1">Create your first announcement to get started</p>
            )}
          </div>
        ) : (
          announcements.map((announcement) => (
            <motion.div 
              key={announcement.id} 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className={`bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow ${
                !announcement.is_active ? 'opacity-75' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-bold text-gray-800">
                  {announcement.title}
                </h3>
                
                {isTeacherOrAdmin && (announcement.creator?.id === user?.id || user?.user_role === 'admin') && (
                  <div className="relative flex items-center">
                    <Dropdown
                      trigger={
                        <button className="p-1.5 hover:bg-gray-100 rounded-full">
                          <MoreHorizontal className="h-5 w-5 text-gray-500" />
                        </button>
                      }
                      items={[
                        {
                          label: 'Edit',
                          icon: <Edit className="h-4 w-4 mr-2" />,
                          onClick: () => handleEdit(announcement)
                        },
                        {
                          label: 'Share Link',
                          icon: <Share2 className="h-4 w-4 mr-2" />,
                          onClick: () => shareAnnouncement(announcement.id)
                        },
                        {
                          label: 'Archive',
                          icon: <Archive className="h-4 w-4 mr-2" />,
                          onClick: () => handleToggleStatus(announcement.id)
                        }
                      ]}
                    />
                    <a 
                      href={`/announcement/${announcement.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 hover:bg-gray-100 rounded-full text-blue-600"
                      title="Open public view"
                    >
                      <ExternalLink className="h-5 w-5" />
                    </a>
                  </div>
                )}
              </div>
              
              {/* Display images with a fixed height container */}
              {announcement.images && announcement.images.length > 0 && (
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 my-4 ${
                  !expandedAnnouncements[announcement.id] ? 'max-h-48 overflow-hidden' : ''
                }`}>
                  {announcement.images.map((image) => (
                    <div key={image.id} className="relative">
                      <img 
                        src={getFullImageUrl(image.image_url)}
                        alt="" 
                        className="rounded-lg w-full h-48 object-cover cursor-pointer"
                        onClick={() => openImageViewer(image.image_url)}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
              
              {/* Content with fixed height unless expanded */}
              <div className={`relative ${!expandedAnnouncements[announcement.id] ? 'max-h-24 overflow-hidden' : ''}`}>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {announcement.content}
                </p>
                
              </div>
              
              {/* Show more/less button */}
              <button
                onClick={() => toggleAnnouncementExpansion(announcement.id)}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
              >
                {expandedAnnouncements[announcement.id] ? (
                  <>Show less</>
                ) : (
                  <>Show more</>
                )}
              </button>
              
              {/* Footer section remains the same */}
              <div className="flex flex-wrap items-center justify-between text-gray-500 text-sm gap-4 mt-4 pt-4 border-t border-gray-100">
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-blue-500" />
                    <span>
                      {announcement.publish_date ? 
                        format(new Date(announcement.publish_date), 'MMM d, yyyy') : 
                        'Unknown date'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1 text-blue-500" />
                    <span>{announcement.creator?.user_fullname || 'Unknown'}</span>
                  </div>
                </div>
                
                {!announcement.is_active && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Inactive
                  </span>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
      
      {/* Pagination */}
      {!isLoading && pagination && pagination.count > 0 && (
        <div className="flex justify-center mt-8">
          <nav aria-label="Announcements pagination" className="flex flex-wrap items-center gap-2">
            {/* Previous button */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage <= 1}
              aria-label="Go to previous page"
              className={`px-4 py-2 rounded-lg transition ${
                currentPage <= 1 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-white text-blue-600 hover:bg-blue-50 border border-gray-200 hover:shadow'
              }`}
            >
              Previous
            </button>
            
            {/* Calculate pages dynamically based on actual items */}
            {(() => {
              // Calculate actual pages based on real item count
              const itemsPerPage = 5;
              const totalItems = pagination.count || 0;
              const totalPages = Math.ceil(totalItems / itemsPerPage);
              
              // Return all pagination buttons
              if (totalPages <= 5) {
                // Simple case: show all page buttons
                return Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={`page-${i+1}`}
                    onClick={() => setCurrentPage(i+1)}
                    aria-label={`Go to page ${i+1}`}
                    aria-current={currentPage === i+1 ? "page" : undefined}
                    className={`hidden sm:block px-4 py-2 rounded-lg transition ${
                      currentPage === i+1 
                        ? 'bg-blue-600 text-white font-medium' 
                        : 'bg-white text-blue-600 hover:bg-blue-50 border border-gray-200 hover:shadow'
                    }`}
                  >
                    {i+1}
                  </button>
                ));
              } else {
                // Complex case: show first, last, and pages around current
                const pageButtons = [];
                
                // First page
                pageButtons.push(
                  <button
                    key="page-1"
                    onClick={() => setCurrentPage(1)}
                    aria-label="Go to page 1"
                    aria-current={currentPage === 1 ? "page" : undefined}
                    className={`hidden sm:block px-4 py-2 rounded-lg transition ${
                      currentPage === 1 
                        ? 'bg-blue-600 text-white font-medium' 
                        : 'bg-white text-blue-600 hover:bg-blue-50 border border-gray-200 hover:shadow'
                    }`}
                  >
                    1
                  </button>
                );
                
                // Left ellipsis if needed
                if (currentPage > 3) {
                  pageButtons.push(
                    <span key="left-ellipsis" className="hidden sm:block px-2 py-2 text-gray-500">...</span>
                  );
                }
                
                // Middle pages
                const startPage = Math.max(2, currentPage - 1);
                const endPage = Math.min(totalPages - 1, currentPage + 1);
                
                for (let i = startPage; i <= endPage; i++) {
                  if (i > 1 && i < totalPages) {
                    pageButtons.push(
                      <button
                        key={`page-${i}`}
                        onClick={() => setCurrentPage(i)}
                        aria-label={`Go to page ${i}`}
                        aria-current={currentPage === i ? "page" : undefined}
                        className={`hidden sm:block px-4 py-2 rounded-lg transition ${
                          currentPage === i 
                            ? 'bg-blue-600 text-white font-medium' 
                            : 'bg-white text-blue-600 hover:bg-blue-50 border border-gray-200 hover:shadow'
                        }`}
                      >
                        {i}
                      </button>
                    );
                  }
                }
                
                // Right ellipsis if needed
                if (currentPage < totalPages - 2) {
                  pageButtons.push(
                    <span key="right-ellipsis" className="hidden sm:block px-2 py-2 text-gray-500">...</span>
                  );
                }
                
                // Last page
                if (totalPages > 1) {
                  pageButtons.push(
                    <button
                      key={`page-${totalPages}`}
                      onClick={() => setCurrentPage(totalPages)}
                      aria-label={`Go to page ${totalPages}`}
                      aria-current={currentPage === totalPages ? "page" : undefined}
                      className={`hidden sm:block px-4 py-2 rounded-lg transition ${
                        currentPage === totalPages 
                          ? 'bg-blue-600 text-white font-medium' 
                          : 'bg-white text-blue-600 hover:bg-blue-50 border border-gray-200 hover:shadow'
                      }`}
                    >
                      {totalPages}
                    </button>
                  );
                }
                
                // Mobile view
                pageButtons.push(
                  <span key="mobile-indicator" className="sm:hidden px-4 py-2 bg-white border border-gray-200 rounded-lg">
                    Page {currentPage} of {totalPages}
                  </span>
                );
                
                return pageButtons;
              }
            })()}
            
            {/* Next button */}
            <button
              onClick={() => {
                // Calculate actual total pages
                const itemsPerPage = 5;
                const totalItems = pagination.count || 0;
                const totalPages = Math.ceil(totalItems / itemsPerPage);
                setCurrentPage(prev => Math.min(prev + 1, totalPages));
              }}
              disabled={currentPage >= Math.ceil((pagination.count || 0) / 5)}
              aria-label="Go to next page"
              className={`px-4 py-2 rounded-lg transition ${
                currentPage >= Math.ceil((pagination.count || 0) / 5)
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-white text-blue-600 hover:bg-blue-50 border border-gray-200 hover:shadow'
              }`}
            >
              Next
            </button>
          </nav>
        </div>
      )}
      
      {/* Modal Form for All Devices */}
      <AnimatePresence>
        <AnnouncementFormModal
          isOpen={isModalOpen}
          onClose={closeAnnouncementModal}
          isEditing={isEditing}
          formData={newAnnouncement}
          onChange={setNewAnnouncement}
          onSubmit={handleSubmit}
          onImageSelect={handleImageSelect}
          imagePreviews={imagePreviews}
          onRemoveImage={removeImage}
        />
      </AnimatePresence>
      
      {viewerOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-3 sm:p-6"
          onClick={closeImageViewer}
        >
          <div className="relative max-h-full w-full max-w-5xl">
            <button 
              className="absolute right-3 top-3 rounded-full bg-white p-2 shadow-lg sm:right-4 sm:top-4"
              onClick={closeImageViewer}
            >
              <X className="h-6 w-6 text-gray-800" />
            </button>
            <img 
              src={viewerImage} 
              alt="Full size" 
              className="mx-auto max-h-[94dvh] max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AnnouncementPage;
