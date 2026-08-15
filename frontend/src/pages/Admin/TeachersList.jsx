import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminStore } from '../../store/adminStore';
import CreateTeacher from '../../components/Modals/CreateTeacher';
import toast from 'react-hot-toast';
import { UserCheck, Plus, Search, Trash2, ArrowLeft, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TeachersList = () => {
  const navigate = useNavigate();
  const { 
    fetchTeachers, 
    deleteTeacher, 
    teachers, 
    isLoading 
  } = useAdminStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  useEffect(() => {
    const loadTeachers = async () => {
      try {
        await fetchTeachers();
      } catch (error) {
        toast.error("Failed to load teachers");
      }
    };
    
    loadTeachers();
  }, [fetchTeachers]);
  
  const filteredTeachers = teachers.filter(teacher => 
    teacher.user_fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.user_email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleDeleteConfirm = (teacherId) => {
    setConfirmDelete(teacherId);
  };
  
  const handleDeleteCancel = () => {
    setConfirmDelete(null);
  };
  
  const handleDelete = async (teacherId) => {
    try {
      await deleteTeacher(teacherId);
      toast.success("Teacher deleted successfully");
      setConfirmDelete(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete teacher");
    }
  };

  // Handle successful teacher creation
  const handleTeacherSuccess = async () => {
    // Refresh teacher data
    try {
      await fetchTeachers();
    } catch (error) {
      console.error('Error refreshing teacher data:', error);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 pt-20 sm:pt-24 sm:p-8 w-full max-w-7xl mx-auto"
    >
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-green-600 to-green-800 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M160 0H40C17.9086 0 0 17.9086 0 40V160C0 182.091 17.9086 200 40 200H160C182.091 200 200 182.091 200 160V40C200 17.9086 182.091 0 160 0Z" fill="white"/>
          </svg>
        </div>
        
        {/* Back button - visible on all devices */}
        <div className="mb-4">
          <button 
            onClick={() => navigate('/admin/dashboard')}
            className="inline-flex items-center text-white bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg px-3 py-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span>Back to Dashboard</span>
          </button>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Teacher Management</h1>
            <p className="text-green-100">Manage teachers accounts and assignments</p>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center bg-white bg-opacity-20 hover:bg-opacity-30 text-white py-2 px-4 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span>Add Teacher</span>
          </button>
        </div>
      </div>
      
      {/* Search section */}
      <div className="bg-white rounded-2xl shadow-md mb-6 p-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search teachers by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
      </div>
      
      {/* Teachers List section */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full"></div>
            <span className="ml-3 text-gray-600">Loading teachers...</span>
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="text-center py-20">
            <UserCheck className="h-16 w-16 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-xl">No teachers found</p>
            <p className="text-gray-400 mt-1 mb-4">
              {searchTerm ? `No matches for "${searchTerm}"` : 'Add a teacher to get started'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span>Add First Teacher</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop view - Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-700 uppercase">
                  <tr>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Created On</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeachers.map((teacher) => (
                    <tr 
                      key={teacher.id} 
                      className="bg-white border-b hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {teacher.user_fullname}
                      </td>
                      <td className="px-6 py-4">
                        {teacher.user_email}
                      </td>
                      <td className="px-6 py-4">
                        {new Date(teacher.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {confirmDelete === teacher.id ? (
                          <div className="flex justify-end items-center gap-2">
                            <span className="text-sm text-gray-600 mr-2">Confirm?</span>
                            <button
                              onClick={() => handleDelete(teacher.id)}
                              className="text-white bg-red-600 hover:bg-red-700 py-1 px-3 rounded text-xs"
                            >
                              Yes
                            </button>
                            <button
                              onClick={handleDeleteCancel}
                              className="text-gray-600 bg-gray-200 hover:bg-gray-300 py-1 px-3 rounded text-xs"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDeleteConfirm(teacher.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Mobile view - Cards */}
            <div className="md:hidden space-y-4 p-4">
              {filteredTeachers.map((teacher) => (
                <div 
                  key={teacher.id}
                  className="bg-white border rounded-lg p-4 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900">{teacher.user_fullname}</h3>
                      <p className="text-gray-500 text-sm">{teacher.user_email}</p>
                    </div>
                    
                    {confirmDelete === teacher.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(teacher.id)}
                          className="text-white bg-red-600 hover:bg-red-700 py-1 px-3 rounded text-xs"
                        >
                          Yes
                        </button>
                        <button
                          onClick={handleDeleteCancel}
                          className="text-gray-600 bg-gray-200 hover:bg-gray-300 py-1 px-3 rounded text-xs"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDeleteConfirm(teacher.id)}
                        className="text-red-600 hover:text-red-900 p-1"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-2">
                    Created on {new Date(teacher.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create Teacher Modal */}
      <CreateTeacher
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleTeacherSuccess}
      />
    </motion.div>
  );
};

export default TeachersList;