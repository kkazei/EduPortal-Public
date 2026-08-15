import { React, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // Add this import
import { useAnnouncementStore } from "../../store/announcementStore";
import { useAuthStore } from "../../store/authStore";
import { RotateCcw, Search, Trash2, AlertCircle, CheckSquare, Square, Bell, Calendar, Archive, User, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

const AnnouncementArchivePage = () => {
  const navigate = useNavigate(); // Add this line
  const { 
    announcements, // Change to use main announcements array
    fetchAnnouncements, // Use the main fetch function instead
    toggleAnnouncementStatus,
    deleteAnnouncement,
    isLoading, 
    error, 
    message,
    clearMessages,
    pagination // Use pagination from the store if available
  } = useAnnouncementStore();
  
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);
  const [processingIds, setProcessingIds] = useState([]);
  const [selectedAnnouncements, setSelectedAnnouncements] = useState([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'updated_at', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);

  // Check permissions - only teachers and admins should access this page
  const canManageAnnouncements = user && (user.user_role === 'teacher' || user.user_role === 'admin');

  // Fetch inactive announcements when component mounts or filters change
  useEffect(() => {
    if (canManageAnnouncements) {
      fetchAnnouncements({
        search: searchTerm,
        page: currentPage,
        limit: 5,
        is_active: false // Only get inactive announcements
      }).catch(error => {
        console.error("Failed to fetch archived announcements:", error);
        toast.error("Failed to load archived announcements");
      });
    }
  }, [fetchAnnouncements, searchTerm, currentPage, canManageAnnouncements]);

  // Update filtered announcements when announcements change
  useEffect(() => {
    setFilteredAnnouncements(announcements || []);
  }, [announcements]);

  // Show success/error messages
  useEffect(() => {
    if (message) {
      toast.success(message);
      clearMessages();
    }
    if (error) {
      toast.error(error);
      clearMessages();
    }
  }, [message, error, clearMessages]);

  // Clear selection when filtered announcements change
  useEffect(() => {
    setSelectedAnnouncements([]);
  }, [filteredAnnouncements]);

  // Handle restore announcement
  const handleRestore = async (announcementId) => {
    try {
      // Add ID to processing list to disable button
      setProcessingIds(prev => [...prev, announcementId]);
      
      await toggleAnnouncementStatus(announcementId);
      
      // After restoring, refresh the list of archived announcements
      fetchAnnouncements({
        search: searchTerm,
        page: currentPage,
        limit: 5,
        is_active: false
      });
      
      // Update the UI immediately by removing the restored announcement from selected list
      setSelectedAnnouncements(prev => prev.filter(id => id !== announcementId));
      
      toast.success("Announcement restored successfully");
    } catch (err) {
      console.error("Restore failed:", err);
      toast.error("Failed to restore announcement");
    } finally {
      // Remove ID from processing list
      setProcessingIds(prev => prev.filter(id => id !== announcementId));
    }
  };

  // Handle permanent delete
  const handlePermanentDelete = async (announcementId) => {
    try {
      // Add ID to processing list to disable button
      setProcessingIds(prev => [...prev, announcementId]);
      
      await deleteAnnouncement(announcementId);
      
      // After deleting, refresh the list of archived announcements
      fetchAnnouncements({
        search: searchTerm,
        page: currentPage,
        limit: 5,
        is_active: false
      });
      
      // Update the UI immediately by removing the deleted announcement from selected list
      setSelectedAnnouncements(prev => prev.filter(id => id !== announcementId));
      
      toast.success("Announcement permanently deleted");
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Failed to permanently delete announcement");
    } finally {
      // Remove ID from processing list
      setProcessingIds(prev => prev.filter(id => id !== announcementId));
    }
  };

  // Batch operations
  const handleBatchOperation = async (operation) => {
    setShowConfirmDialog(false);
    
    if (selectedAnnouncements.length === 0) {
      return toast.error("No announcements selected");
    }

    // Create a copy to avoid issues with state updates during processing
    const announcementsToBatch = [...selectedAnnouncements];
    
    try {
      setProcessingIds(prev => [...prev, ...announcementsToBatch]);
      
      let successCount = 0;
      let failCount = 0;

      // Process announcements sequentially to avoid overwhelming the server
      for (const announcementId of announcementsToBatch) {
        try {
          if (operation === 'restore') {
            await toggleAnnouncementStatus(announcementId);
          } else if (operation === 'delete') {
            await deleteAnnouncement(announcementId);
          }
          successCount++;
        } catch (err) {
          console.error(`Failed to ${operation} announcement ${announcementId}:`, err);
          failCount++;
        }
      }

      // After batch operation, refresh the list
      await fetchAnnouncements({
        search: searchTerm,
        page: currentPage,
        limit: 5,
        is_active: false
      });
      
      // Show success message with details
      if (successCount > 0) {
        toast.success(`Successfully ${operation === 'restore' ? 'restored' : 'deleted'} ${successCount} announcement${successCount !== 1 ? 's' : ''}`);
      }
      
      if (failCount > 0) {
        toast.error(`Failed to ${operation === 'restore' ? 'restore' : 'delete'} ${failCount} announcement${failCount !== 1 ? 's' : ''}`);
      }

      // Clear selected announcements
      setSelectedAnnouncements([]);
      
    } catch (err) {
      console.error(`Batch ${operation} failed:`, err);
      toast.error(`Batch ${operation} operation failed`);
    } finally {
      setProcessingIds([]);
    }
  };

  // Helper functions
  const toggleSelection = (announcementId) => {
    setSelectedAnnouncements(prev => 
      prev.includes(announcementId)
        ? prev.filter(id => id !== announcementId)
        : [...prev, announcementId]
    );
  };

  const toggleAllSelection = () => {
    if (selectedAnnouncements.length === filteredAnnouncements.length) {
      // If all are selected, clear selection
      setSelectedAnnouncements([]);
    } else {
      // Otherwise, select all
      setSelectedAnnouncements(filteredAnnouncements.map(announcement => announcement.id));
    }
  };

  const requestConfirmation = (action) => {
    setConfirmAction(action);
    setShowConfirmDialog(true);
  };

  // Handle page change for pagination
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  // Format date with time
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Truncate content for display
  const truncateContent = (content, maxLength = 100) => {
    if (!content) return "";
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  // Render access denied if user doesn't have permission
  if (!canManageAnnouncements) {
    return (
      <div className="p-4 pt-20 sm:pt-24 sm:p-8 w-full max-w-7xl mx-auto">
        <div className="text-center p-8 bg-red-50 rounded-2xl border border-red-200">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-700">Access Denied</h2>
          <p className="mt-2 text-red-600">
            You don't have permission to access the announcement archive.
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 pt-20 sm:pt-24 sm:p-8 w-full max-w-7xl mx-auto"
    >
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden mb-8">
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
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Announcement Archive</h1>
            <p className="text-blue-100">Manage deleted announcements and restoration</p>
          </div>
        </div>
      </div>

      {/* Search and filter section */}
      <div className="bg-white rounded-2xl shadow-md mb-6 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-grow relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => requestConfirmation('restore')}
              disabled={selectedAnnouncements.length === 0 || processingIds.length > 0}
              className={`inline-flex items-center px-4 py-3 ${
                selectedAnnouncements.length === 0 || processingIds.length > 0
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-green-600 hover:bg-green-700"
              } text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
            >
              {processingIds.length > 0 && processingIds.some(id => selectedAnnouncements.includes(id)) ? (
                <>
                  <span className="animate-spin h-4 w-4 mr-2 border-t-2 border-white rounded-full"></span>
                  Processing...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restore Selected
                </>
              )}
            </button>

            <button
              onClick={() => requestConfirmation('delete')}
              disabled={selectedAnnouncements.length === 0 || processingIds.length > 0}
              className={`inline-flex items-center px-4 py-3 ${
                selectedAnnouncements.length === 0 || processingIds.length > 0
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-red-600 hover:bg-red-700"
              } text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
            >
              {processingIds.length > 0 && processingIds.some(id => selectedAnnouncements.includes(id)) ? (
                <>
                  <span className="animate-spin h-4 w-4 mr-2 border-t-2 border-white rounded-full"></span>
                  Processing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Permanently
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Announcements Table */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="ml-3 text-gray-600">Loading archived announcements...</span>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="text-center py-20">
            <Archive className="h-16 w-16 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-xl">No archived announcements found</p>
            <p className="text-gray-400 mt-2">Deleted announcements will appear here</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <div className="flex items-center">
                        <button 
                          className="mr-2 focus:outline-none" 
                          onClick={toggleAllSelection}
                        >
                          {selectedAnnouncements.length === filteredAnnouncements.length ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-500" />
                          )}
                        </button>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Select All
                        </span>
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('title')}
                    >
                      Title {getSortIndicator('title')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Content
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('creator.user_fullname')}
                    >
                      Author {getSortIndicator('creator.user_fullname')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('updated_at')}
                    >
                      Deleted Date {getSortIndicator('updated_at')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAnnouncements.map((announcement) => (
                    <tr key={announcement.id} className={`hover:bg-gray-50 ${
                      selectedAnnouncements.includes(announcement.id) ? 'bg-blue-50' : ''
                    }`}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <button 
                          className="focus:outline-none" 
                          onClick={() => toggleSelection(announcement.id)}
                          disabled={processingIds.includes(announcement.id)}
                        >
                          {selectedAnnouncements.includes(announcement.id) ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-500" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Bell className="h-4 w-4 mr-2 text-blue-500" />
                          <div className="text-sm font-medium text-gray-900">
                            {announcement.title}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 max-w-xs">
                          {truncateContent(announcement.content)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1 text-gray-400" />
                          {announcement.creator?.user_fullname || "Unknown"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          {formatDateTime(announcement.updated_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleRestore(announcement.id)}
                            disabled={processingIds.includes(announcement.id)}
                            className={`p-1.5 rounded-lg ${
                              processingIds.includes(announcement.id)
                                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                : "bg-green-100 text-green-600 hover:bg-green-200"
                            } focus:outline-none focus:ring-2 focus:ring-green-500`}
                            title="Restore announcement"
                          >
                            {processingIds.includes(announcement.id) ? (
                              <div className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full"></div>
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </button>
                          
                          <button
                            onClick={() => handlePermanentDelete(announcement.id)}
                            disabled={processingIds.includes(announcement.id)}
                            className={`p-1.5 rounded-lg ${
                              processingIds.includes(announcement.id)
                                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                : "bg-red-100 text-red-600 hover:bg-red-200"
                            } focus:outline-none focus:ring-2 focus:ring-red-500`}
                            title="Delete permanently"
                          >
                            {processingIds.includes(announcement.id) ? (
                              <div className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Action Bar with Pagination */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-center">
                <div className="mb-4 sm:mb-0 text-sm text-gray-700">
                  {selectedAnnouncements.length === 0 ? (
                    <span>No announcements selected</span>
                  ) : (
                    <span>Selected <strong>{selectedAnnouncements.length}</strong> of <strong>{filteredAnnouncements.length}</strong> announcements</span>
                  )}
                </div>

                {/* Add pagination if available from the store */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className={`px-3 py-1 rounded ${
                        currentPage === 1
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-white text-blue-600 hover:bg-blue-50 border border-gray-200"
                      }`}
                    >
                      Previous
                    </button>
                    
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        // Show only nearby pages if there are too many
                        if (pagination.totalPages <= 5) return true;
                        return page === 1 || 
                          page === pagination.totalPages || 
                          Math.abs(page - currentPage) <= 1;
                      })
                      .map((page, index, array) => {
                        // Add ellipsis for skipped pages
                        if (index > 0 && page - array[index - 1] > 1) {
                          return (
                            <React.Fragment key={`ellipsis-${page}`}>
                              <span className="px-2 text-gray-500">...</span>
                              <button
                                key={page}
                                onClick={() => handlePageChange(page)}
                                className={`px-3 py-1 rounded ${
                                  currentPage === page
                                    ? "bg-blue-600 text-white"
                                    : "bg-white text-blue-600 hover:bg-blue-50 border border-gray-200"
                                }`}
                              >
                                {page}
                              </button>
                            </React.Fragment>
                          );
                        }
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-1 rounded ${
                              currentPage === page
                                ? "bg-blue-600 text-white"
                                : "bg-white text-blue-600 hover:bg-blue-50 border border-gray-200"
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    
                    <button
                      onClick={() => handlePageChange(Math.min(pagination.totalPages, currentPage + 1))}
                      disabled={currentPage === pagination.totalPages}
                      className={`px-3 py-1 rounded ${
                        currentPage === pagination.totalPages
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-white text-blue-600 hover:bg-blue-50 border border-gray-200"
                      }`}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Confirm Dialog */}
      <AnimatePresence>
        {showConfirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowConfirmDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center mb-4">
                <AlertCircle className="h-6 w-6 text-amber-500 mr-2" />
                <h3 className="text-xl font-medium text-gray-900">
                  {confirmAction === 'delete' ? 'Permanently Delete Announcements?' : 'Restore Announcements?'}
                </h3>
              </div>
              
              <p className="text-gray-600 mb-4">
                {confirmAction === 'delete' 
                  ? `Are you sure you want to permanently delete ${selectedAnnouncements.length} selected announcement${selectedAnnouncements.length !== 1 ? 's' : ''}? This action cannot be undone.`
                  : `Are you sure you want to restore ${selectedAnnouncements.length} selected announcement${selectedAnnouncements.length !== 1 ? 's' : ''}?`
                }
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleBatchOperation(confirmAction)}
                  className={`px-4 py-2 rounded-lg text-white transition-colors ${
                    confirmAction === 'delete' 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {confirmAction === 'delete' ? 'Delete' : 'Restore'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AnnouncementArchivePage;