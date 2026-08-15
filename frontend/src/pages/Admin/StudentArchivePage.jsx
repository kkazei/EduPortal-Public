import { useEffect, useState } from "react";
import { useStudentStore } from "../../store/studentStore";
import { useAuthStore } from "../../store/authStore";
import { RotateCcw, Search, Trash2, AlertCircle, CheckSquare, Square, ArrowLeft, Check, X, User, School, Archive } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import maskStudentId from '../../utils/maskStudentId';
import { useNavigate } from "react-router-dom"; // Add this import at the top

const StudentArchivePage = () => {
  const navigate = useNavigate(); // Add this line
  const { 
    deletedStudents, 
    fetchDeletedStudents, 
    restoreStudent,
    permanentlyDeleteStudent,
    isLoading, 
    error, 
    message,
    clearMessages 
  } = useStudentStore();
  
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [processingIds, setProcessingIds] = useState([]); // Track IDs being processed
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'updated_at', direction: 'desc' });

  // Check permissions - only teachers and admins should access this page
  const canManageStudents = user && (user.user_role === 'teacher' || user.user_role === 'admin');

  useEffect(() => {
    // Fetch deleted students when component mounts
    if (canManageStudents) {
      fetchDeletedStudents();
    }
  }, [fetchDeletedStudents, canManageStudents]);

  useEffect(() => {
    // Filter and sort students based on search term and sort config
    if (deletedStudents.length > 0) {
      let filtered = deletedStudents.filter(student => 
        student.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.lrn?.includes(searchTerm)
      );

      // Apply sorting
      filtered = [...filtered].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });

      setFilteredStudents(filtered);
    } else {
      setFilteredStudents([]);
    }
  }, [deletedStudents, searchTerm, sortConfig]);

  useEffect(() => {
    // Show success/error messages
    if (message) {
      toast.success(message);
      clearMessages();
    }
    if (error) {
      toast.error(error);
      clearMessages();
    }
  }, [message, error, clearMessages]);

  useEffect(() => {
    // Clear selection when filtered students change
    setSelectedStudents([]);
  }, [filteredStudents]);

  const handleRestore = async (studentId) => {
    try {
      // Add ID to processing list to disable button
      setProcessingIds(prev => [...prev, studentId]);
      
      await restoreStudent(studentId);
      
      // Update the UI immediately by removing the restored student from selected list
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
      
      toast.success("Student restored successfully");
    } catch (err) {
      console.error("Restore failed:", err);
      toast.error("Failed to restore student");
    } finally {
      // Remove ID from processing list
      setProcessingIds(prev => prev.filter(id => id !== studentId));
    }
  };

  const handlePermanentDelete = async (studentId) => {
    try {
      // Add ID to processing list to disable button
      setProcessingIds(prev => [...prev, studentId]);
      
      await permanentlyDeleteStudent(studentId);
      
      // Update the UI immediately by removing the deleted student from selected list
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
      
      toast.success("Student permanently deleted");
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Failed to permanently delete student");
    } finally {
      // Remove ID from processing list
      setProcessingIds(prev => prev.filter(id => id !== studentId));
    }
  };

  // Batch operations
  const handleBatchOperation = async (operation) => {
    setShowConfirmDialog(false);
    
    if (selectedStudents.length === 0) {
      return toast.error("No students selected");
    }

    // Create a copy to avoid issues with state updates during processing
    const studentsToBatch = [...selectedStudents];
    
    try {
      setProcessingIds(prev => [...prev, ...studentsToBatch]);
      
      let successCount = 0;
      let failCount = 0;

      // Process students sequentially to avoid overwhelming the server
      for (const studentId of studentsToBatch) {
        try {
          if (operation === 'restore') {
            await restoreStudent(studentId);
          } else if (operation === 'delete') {
            await permanentlyDeleteStudent(studentId);
          }
          successCount++;
        } catch (err) {
          console.error(`Failed to ${operation} student ${studentId}:`, err);
          failCount++;
        }
      }

      // Show success message with details
      if (successCount > 0) {
        toast.success(`Successfully ${operation === 'restore' ? 'restored' : 'deleted'} ${successCount} student${successCount !== 1 ? 's' : ''}`);
      }
      
      if (failCount > 0) {
        toast.error(`Failed to ${operation === 'restore' ? 'restore' : 'delete'} ${failCount} student${failCount !== 1 ? 's' : ''}`);
      }

      // Clear selected students
      setSelectedStudents([]);
      
    } catch (err) {
      console.error(`Batch ${operation} failed:`, err);
      toast.error(`Batch ${operation} operation failed`);
    } finally {
      setProcessingIds([]);
    }
  };

  const toggleSelection = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleAllSelection = () => {
    if (selectedStudents.length === filteredStudents.length) {
      // If all are selected, clear selection
      setSelectedStudents([]);
    } else {
      // Otherwise, select all
      setSelectedStudents(filteredStudents.map(student => student.id));
    }
  };

  const requestConfirmation = (action) => {
    setConfirmAction(action);
    setShowConfirmDialog(true);
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

  // Render access denied if user doesn't have permission
  if (!canManageStudents) {
    return (
      <div className="p-4 pt-20 sm:pt-24 sm:p-8 w-full max-w-7xl mx-auto">
        <div className="text-center p-8 bg-red-50 rounded-2xl border border-red-200">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-700">Access Denied</h2>
          <p className="mt-2 text-red-600">
            You don't have permission to access the student archive.
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
            onClick={() => navigate('/admin/dashboard')}
            className="inline-flex items-center text-white bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg px-3 py-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span>Back to Dashboard</span>
          </button>
        </div>

        {/* Existing header content */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Student Archive</h1>
            <p className="text-blue-100">Manage deleted student records and restoration</p>
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
              placeholder="Search by name or LRN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => requestConfirmation('restore')}
              disabled={selectedStudents.length === 0 || processingIds.length > 0}
              className={`inline-flex items-center px-4 py-3 ${
                selectedStudents.length === 0 || processingIds.length > 0
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-green-600 hover:bg-green-700"
              } text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
            >
              {processingIds.length > 0 && processingIds.some(id => selectedStudents.includes(id)) ? (
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
              disabled={selectedStudents.length === 0 || processingIds.length > 0}
              className={`inline-flex items-center px-4 py-3 ${
                selectedStudents.length === 0 || processingIds.length > 0
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-red-600 hover:bg-red-700"
              } text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
            >
              {processingIds.length > 0 && processingIds.some(id => selectedStudents.includes(id)) ? (
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

      {/* Students Table - Mobile-friendly version */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="ml-3 text-gray-600">Loading archived students...</span>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-20">
            <Archive className="h-16 w-16 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-xl">No archived students found</p>
            <p className="text-gray-400 mt-2">Deleted student records will appear here</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View - Hidden on mobile */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <div className="flex items-center">
                        <button 
                          className="mr-2 focus:outline-none" 
                          onClick={toggleAllSelection}
                        >
                          {selectedStudents.length === filteredStudents.length ? (
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
                      onClick={() => handleSort('lrn')}
                    >
                      LRN {getSortIndicator('lrn')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('last_name')}
                    >
                      Student Name {getSortIndicator('last_name')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Class
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
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className={`hover:bg-gray-50 ${
                      selectedStudents.includes(student.id) ? 'bg-blue-50' : ''
                    }`}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <button 
                          className="focus:outline-none" 
                          onClick={() => toggleSelection(student.id)}
                          disabled={processingIds.includes(student.id)}
                        >
                          {selectedStudents.includes(student.id) ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-500" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {maskStudentId(student.lrn)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {student.first_name} {student.middle_name ? student.middle_name + " " : ""}{student.last_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.class ? (
                          student.class.grade_level && student.class.section ? 
                            `${student.class.grade_level}-${student.class.section}` : 
                            "Class info not complete"
                        ) : (
                          "Not assigned"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(student.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleRestore(student.id)}
                            disabled={processingIds.includes(student.id)}
                            className={`p-1.5 rounded-lg ${
                              processingIds.includes(student.id)
                                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                : "bg-green-100 text-green-600 hover:bg-green-200"
                            } focus:outline-none focus:ring-2 focus:ring-green-500`}
                            title="Restore student"
                          >
                            {processingIds.includes(student.id) ? (
                              <div className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full"></div>
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </button>
                          
                          <button
                            onClick={() => handlePermanentDelete(student.id)}
                            disabled={processingIds.includes(student.id)}
                            className={`p-1.5 rounded-lg ${
                              processingIds.includes(student.id)
                                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                : "bg-red-100 text-red-600 hover:bg-red-200"
                            } focus:outline-none focus:ring-2 focus:ring-red-500`}
                            title="Delete permanently"
                          >
                            {processingIds.includes(student.id) ? (
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

            {/* Mobile Card View - Shown only on mobile devices */}
            <div className="md:hidden">
              <div className="px-4 py-3 bg-gray-50 flex items-center">
                <button 
                  className="mr-2 focus:outline-none" 
                  onClick={toggleAllSelection}
                >
                  {selectedStudents.length === filteredStudents.length ? (
                    <CheckSquare className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Square className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                <span className="text-xs font-medium text-gray-500 uppercase">
                  {selectedStudents.length === filteredStudents.length ? "Deselect All" : "Select All"}
                </span>
                
                <div className="ml-auto flex items-center">
                  <span className="text-xs text-gray-500 mr-2">
                    Sort by:
                  </span>
                  <select 
                    className="text-xs border-gray-300 rounded-md py-1" 
                    value={sortConfig.key}
                    onChange={(e) => setSortConfig({ key: e.target.value, direction: sortConfig.direction })}
                  >
                    <option value="lrn">LRN</option>
                    <option value="last_name">Name</option>
                    <option value="updated_at">Delete Date</option>
                  </select>
                  <button 
                    className="ml-1 p-1"
                    onClick={() => setSortConfig({ key: sortConfig.key, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                  >
                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <div 
                    key={student.id}
                    className={`p-4 ${selectedStudents.includes(student.id) ? 'bg-blue-50' : 'bg-white'}`}
                  >
                    <div className="flex items-start">
                      <button 
                        className="mt-1 mr-3 focus:outline-none" 
                        onClick={() => toggleSelection(student.id)}
                        disabled={processingIds.includes(student.id)}
                      >
                        {selectedStudents.includes(student.id) ? (
                          <CheckSquare className="h-6 w-6 text-blue-600" />
                        ) : (
                          <Square className="h-6 w-6 text-gray-500" />
                        )}
                      </button>
                      
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {student.first_name} {student.middle_name ? student.middle_name + " " : ""}{student.last_name}
                        </h3>
                        
                        <div className="mt-1 grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                          <div>
                            <span className="text-gray-500">LRN:</span>
                            <span className="ml-1 text-gray-900 font-medium">{maskStudentId(student.lrn)}</span>
                          </div>
                          
                          <div>
                            <span className="text-gray-500">Class:</span>
                            <span className="ml-1">
                              {student.class ? (
                                student.class.grade_level && student.class.section ? 
                                  `${student.class.grade_level}-${student.class.section}` : 
                                  "Class info not complete"
                              ) : (
                                "Not assigned"
                              )}
                            </span>
                          </div>
                          
                          <div className="col-span-2">
                            <span className="text-gray-500">Deleted:</span>
                            <span className="ml-1">{new Date(student.updated_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end mt-3 space-x-2">
                      <button
                        onClick={() => handleRestore(student.id)}
                        disabled={processingIds.includes(student.id)}
                        className={`px-3 py-2 rounded-lg flex items-center ${
                          processingIds.includes(student.id)
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-green-100 text-green-600 hover:bg-green-200"
                        }`}
                      >
                        {processingIds.includes(student.id) ? (
                          <div className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full mr-1"></div>
                        ) : (
                          <RotateCcw className="h-4 w-4 mr-1" />
                        )}
                        <span className="text-sm">Restore</span>
                      </button>
                      
                      <button
                        onClick={() => handlePermanentDelete(student.id)}
                        disabled={processingIds.includes(student.id)}
                        className={`px-3 py-2 rounded-lg flex items-center ${
                          processingIds.includes(student.id)
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-red-100 text-red-600 hover:bg-red-200"
                        }`}
                      >
                        {processingIds.includes(student.id) ? (
                          <div className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full mr-1"></div>
                        ) : (
                          <Trash2 className="h-4 w-4 mr-1" />
                        )}
                        <span className="text-sm">Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-center">
                <div className="mb-4 sm:mb-0 text-sm text-gray-700">
                  {selectedStudents.length === 0 ? (
                    <span>No students selected</span>
                  ) : (
                    <span>Selected <strong>{selectedStudents.length}</strong> of <strong>{filteredStudents.length}</strong> students</span>
                  )}
                </div>
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
                  {confirmAction === 'delete' ? 'Permanently Delete Students?' : 'Restore Students?'}
                </h3>
              </div>
              
              <p className="text-gray-600 mb-4">
                {confirmAction === 'delete' 
                  ? `Are you sure you want to permanently delete ${selectedStudents.length} selected student${selectedStudents.length !== 1 ? 's' : ''}? This action cannot be undone.`
                  : `Are you sure you want to restore ${selectedStudents.length} selected student${selectedStudents.length !== 1 ? 's' : ''}?`
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

export default StudentArchivePage;