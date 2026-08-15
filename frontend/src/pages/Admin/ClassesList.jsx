import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminStore } from '../../store/adminStore';
import CreateClass from '../../components/Modals/CreateClass';
import EditClass from '../../components/Modals/EditClass';
import toast from 'react-hot-toast';
import { School, Plus, Search, ArrowLeft, User, Edit } from 'lucide-react';
import { motion } from 'framer-motion';

const ClassesList = () => {
  const navigate = useNavigate();
  const { 
    fetchClasses, 
    classes, 
    isLoading,
    archiveClass,
    fetchArchivedClasses,
    restoreClass,
    deleteClassPermanent
  } = useAdminStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [archivedClasses, setArchivedClasses] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchClasses();
        const archived = await fetchArchivedClasses();
        setArchivedClasses(archived || []);
      } catch (error) {
        toast.error("Failed to load data");
        console.error(error);
      }
    };
    
    loadData();
  }, [fetchClasses]);
  
  const listToFilter = showArchived ? archivedClasses : classes;
  const filteredClasses = listToFilter.filter(classItem => 
    classItem.grade_level.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classItem.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
    classItem.school_year.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (classItem.adviser_name && classItem.adviser_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const openEditModal = (classItem) => {
    setSelectedClass(classItem);
    setShowEditModal(true);
  };

  // Handle successful class creation
  const handleClassSuccess = async () => {
    // Refresh class data
    try {
      await fetchClasses();
    } catch (error) {
      console.error('Error refreshing class data:', error);
    }
  };

  // Handle successful class update
  const handleEditSuccess = async () => {
    // Refresh class data
    try {
      await fetchClasses();
      const archived = await fetchArchivedClasses();
      setArchivedClasses(archived || []);
    } catch (error) {
      console.error('Error refreshing class data:', error);
    }
  };

  const handleArchive = async (classId) => {
    try {
      await archiveClass(classId);
      toast.success('Class archived');
      await fetchClasses();
      const archived = await fetchArchivedClasses();
      setArchivedClasses(archived || []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to archive class');
    }
  };

  const handleRestore = async (classId) => {
    try {
      await restoreClass(classId);
      toast.success('Class restored');
      await fetchClasses();
      const archived = await fetchArchivedClasses();
      setArchivedClasses(archived || []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to restore class');
    }
  };

  const handlePermanentDelete = async (classId) => {
    try {
      if (!confirm('This will permanently delete the class and ALL related data (students, grades, attendance records) from the database. This action CANNOT be undone. Continue?')) return;
      await deleteClassPermanent(classId);
      toast.success('Class permanently deleted');
      const archived = await fetchArchivedClasses();
      setArchivedClasses(archived || []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete class');
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
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden mb-8">
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
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Class Management</h1>
            <p className="text-purple-100">Manage class sections and teacher assignments</p>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center bg-white bg-opacity-20 hover:bg-opacity-30 text-white py-2 px-4 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span>Create Class</span>
          </button>
        </div>
      </div>
      
      {/* Search and Filter section */}
      <div className="bg-white rounded-2xl shadow-md mb-6 p-6">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={`Search ${showArchived ? 'archived' : 'active'} classes...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowArchived(false)}
              className={`px-4 py-2 rounded-lg border ${!showArchived ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300'}`}
            >
              Active
            </button>
            <button
              onClick={() => setShowArchived(true)}
              className={`px-4 py-2 rounded-lg border ${showArchived ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300'}`}
            >
              Archived
            </button>
          </div>
        </div>
      </div>
      
      {/* Classes List section */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            <span className="ml-3 text-gray-600">Loading classes...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {filteredClasses.length === 0 ? (
              <div className="text-center py-12">
                <School className="h-16 w-16 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-lg">No classes found</p>
                <p className="text-gray-400 mt-1 mb-4">
                  {searchTerm ? `No matches for "${searchTerm}"` : 'Create a class to get started'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    <span>Create First Class</span>
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
                        <th className="px-6 py-3">Grade Level</th>
                        <th className="px-6 py-3">Section</th>
                        <th className="px-6 py-3">School Year</th>
                        <th className="px-6 py-3">Teacher</th>
                        <th className="px-6 py-3">Students</th>
                        <th className="px-6 py-3 text-right">Status</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClasses.map((classItem) => (
                        <tr 
                          key={classItem.id} 
                          className="bg-white border-b hover:bg-gray-50"
                        >
                          <td className="px-6 py-4 font-medium text-gray-900">
                            {classItem.grade_level}
                          </td>
                          <td className="px-6 py-4">
                            {classItem.section}
                          </td>
                          <td className="px-6 py-4">
                            {classItem.school_year}
                          </td>
                          <td className="px-6 py-4">
                            {classItem.adviser_name ? (
                              <div className="flex items-center">
                                <User className="h-4 w-4 text-green-600 mr-1" />
                                <span>{classItem.adviser_name}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">Not assigned</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {classItem.student_count || 0}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span 
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                classItem.is_active 
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {classItem.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-3">
                              {!showArchived ? (
                                <>
                                  <button
                                    onClick={() => openEditModal(classItem)}
                                    className="text-blue-600 hover:text-blue-900"
                                    title="Edit"
                                  >
                                    <Edit className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() => handleArchive(classItem.id)}
                                    className="text-gray-700 hover:text-gray-900 border border-gray-300 px-3 py-1 rounded"
                                  >
                                    Archive
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleRestore(classItem.id)}
                                    className="text-green-700 hover:text-green-900 border border-green-300 px-3 py-1 rounded"
                                  >
                                    Restore
                                  </button>
                                  <button
                                    onClick={() => handlePermanentDelete(classItem.id)}
                                    className="text-red-700 hover:text-red-900 border border-red-300 px-3 py-1 rounded"
                                  >
                                    Delete Permanently
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile view - Cards */}
                <div className="md:hidden space-y-4 p-4">
                  {filteredClasses.map((classItem) => (
                    <div 
                      key={classItem.id} 
                      className="bg-white border rounded-lg p-4 shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-gray-900">{classItem.grade_level} - {classItem.section}</h3>
                          <p className="text-gray-500 text-sm">{classItem.school_year}</p>
                        </div>
                        <span 
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            classItem.is_active 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {classItem.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-100 text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Teacher:</span>
                          <span className="font-medium">
                            {classItem.adviser_name || 'Not assigned'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Students:</span>
                          <span className="font-medium">{classItem.student_count || 0}</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-2 flex justify-end gap-2">
                        {!showArchived ? (
                          <>
                            <button
                              onClick={() => openEditModal(classItem)}
                              className="flex items-center text-blue-600 hover:text-blue-900"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleArchive(classItem.id)}
                              className="flex items-center text-gray-700 hover:text-gray-900 border border-gray-300 px-2 py-1 rounded"
                            >
                              Archive
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleRestore(classItem.id)}
                              className="flex items-center text-green-700 hover:text-green-900 border border-green-300 px-2 py-1 rounded"
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => handlePermanentDelete(classItem.id)}
                              className="flex items-center text-red-700 hover:text-red-900 border border-red-300 px-2 py-1 rounded"
                            >
                              Delete Permanently
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateClass
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleClassSuccess}
      />

      <EditClass
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        classData={selectedClass}
        onSuccess={handleEditSuccess}
      />
    </motion.div>
  );
};

export default ClassesList;