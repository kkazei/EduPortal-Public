import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  Book, AlertCircle, Search, Plus, X, Check,
  Edit, Trash2, Filter, ChevronDown, BookOpen, Tag,
  CheckCircle, User, GraduationCap, ArrowLeft
} from 'lucide-react';

// Import stores
import { useSubjectStore } from '../../store/subjectStore';
import { useAuthStore } from '../../store/authStore';

const SubjectManagementPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    subjects, filteredSubjects, fetchSubjects, filterSubjects,
    createSubject, updateSubject, deleteSubject,
    isLoading, error, message, clearMessages
  } = useSubjectStore();

  // Component state
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCriteria, setFilterCriteria] = useState({
    grade_level: ''
    // Removed is_core from here
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentSubject, setCurrentSubject] = useState(null);
  const [formData, setFormData] = useState({
    subject_code: '',
    subject_name: '',
    description: '',
    grade_level: 'Grade 1'
    // Removed is_core from here
  });

  // Grade levels
  const gradeLevels = [
    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'
  ];

  // Check if user is admin
  useEffect(() => {
    if (user && user.user_role !== 'admin') {
      toast.error("Access denied. Admin privileges required.");
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Load subjects when component mounts
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        await fetchSubjects();
      } catch (error) {
        console.error("Error loading subjects:", error);
      }
    };
    
    loadSubjects();
  }, [fetchSubjects]);

  // Filter subjects based on search term
  useEffect(() => {
    const criteria = { ...filterCriteria };
    
    if (searchTerm) {
      // Search in name and code
      criteria.name = searchTerm;
    }
    
    filterSubjects(criteria);
  }, [searchTerm, filterCriteria, filterSubjects]);

  // Show toast messages when needed
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

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, checked, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    
    setFilterCriteria(prev => {
      const newFilters = {
        ...prev,
        [name]: value
      };
      
      // Apply filters immediately
      filterSubjects(newFilters);
      return newFilters;
    });
  };

  // Reset filters
  const resetFilters = () => {
    setFilterCriteria({
      grade_level: ''
      // Removed is_core
    });
    
    setSearchTerm('');
    filterSubjects({});
  };

  // Open create modal
  const openCreateModal = () => {
    setFormData({
      subject_code: '',
      subject_name: '',
      description: '',
      grade_level: 'Grade 1'
      // Removed is_core
    });
    setShowCreateModal(true);
  };

  // Open edit modal
  const openEditModal = (subject) => {
    setCurrentSubject(subject);
    setFormData({
      subject_code: subject.subject_code,
      subject_name: subject.subject_name,
      description: subject.description || '',
      grade_level: subject.grade_level
      // Removed is_core
    });
    setShowEditModal(true);
  };

  // Open delete modal
  const openDeleteModal = (subject) => {
    setCurrentSubject(subject);
    setShowDeleteModal(true);
  };

  // Handle create subject
  const handleCreateSubject = async (e) => {
    e.preventDefault();
    
    try {
      await createSubject(formData);
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creating subject:", error);
    }
  };

  // Handle update subject
  const handleUpdateSubject = async (e) => {
    e.preventDefault();
    
    try {
      await updateSubject(currentSubject.id, formData);
      setShowEditModal(false);
    } catch (error) {
      console.error("Error updating subject:", error);
    }
  };

  // Handle delete subject
  const handleDeleteSubject = async () => {
    try {
      await deleteSubject(currentSubject.id);
      setShowDeleteModal(false);
    } catch (error) {
      console.error("Error deleting subject:", error);
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

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Subject Management</h1>
            <p className="text-blue-100">Create, update, and manage school subjects</p>
          </div>
          
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-white hover:bg-blue-50 text-blue-700 font-medium rounded-lg flex items-center transition-colors shadow-sm"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Subject
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-md mb-6 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-grow relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by subject name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              <ChevronDown className={`h-4 w-4 ml-2 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {Object.values(filterCriteria).some(val => val !== '') && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center px-4 py-3 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Filter options */}
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grade Level
              </label>
              <select
                name="grade_level"
                value={filterCriteria.grade_level}
                onChange={handleFilterChange}
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">All Grade Levels</option>
                {gradeLevels.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>
          </motion.div>
        )}
      </div>

      {/* Subjects List */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="ml-3 text-gray-600">Loading subjects...</span>
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="text-center py-20">
            <Book className="h-16 w-16 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-xl">No subjects found</p>
            <p className="text-gray-400 mt-2">Try adjusting your search or filters</p>
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg inline-flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Subject
            </button>
          </div>
        ) : (
          <>
            {/* Desktop view */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grade Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSubjects.map((subject) => (
                    <tr key={subject.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        {subject.subject_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {subject.subject_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {subject.grade_level}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {subject.description || 'No description available'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => openEditModal(subject)}
                            className="p-1.5 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            title="Edit subject"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(subject)}
                            className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                            title="Delete subject"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Mobile view */}
            <div className="md:hidden">
              {filteredSubjects.map((subject) => (
                <div key={subject.id} className="border-b border-gray-200 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium text-gray-900">{subject.subject_name}</h3>
                      <p className="text-sm text-blue-600">{subject.subject_code}</p>
                    </div>
                    {/* Removed core/elective badge */}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-1 text-sm mb-3">
                    <div className="flex items-center">
                      <GraduationCap className="h-4 w-4 text-gray-400 mr-1" />
                      <span>{subject.grade_level}</span>
                    </div>
                    
                    {subject.description && (
                      <div className="col-span-2 text-gray-500 mt-1 text-sm">
                        {subject.description.length > 100 
                          ? subject.description.substring(0, 100) + '...' 
                          : subject.description}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openEditModal(subject)}
                      className="px-3 py-1.5 bg-blue-100 text-blue-600 rounded-lg flex items-center hover:bg-blue-200 transition-colors"
                    >
                      <Edit className="h-3.5 w-3.5 mr-1" />
                      <span className="text-sm">Edit</span>
                    </button>
                    <button
                      onClick={() => openDeleteModal(subject)}
                      className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg flex items-center hover:bg-red-200 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      <span className="text-sm">Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create Subject Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
                  Add New Subject
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>
              
              <form onSubmit={handleCreateSubject} className="space-y-4">
                <div>
                  <label htmlFor="subject_code" className="block text-sm font-medium text-gray-700 mb-1">
                    Subject Code*
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Tag className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="subject_code"
                      name="subject_code"
                      value={formData.subject_code}
                      onChange={handleInputChange}
                      placeholder="e.g. MATH6"
                      required
                      className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="subject_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Subject Name*
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Book className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="subject_name"
                      name="subject_name"
                      value={formData.subject_name}
                      onChange={handleInputChange}
                      placeholder="e.g. Mathematics"
                      required
                      className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="grade_level" className="block text-sm font-medium text-gray-700 mb-1">
                    Grade Level*
                  </label>
                  <select
                    id="grade_level"
                    name="grade_level"
                    value={formData.grade_level}
                    onChange={handleInputChange}
                    required
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {gradeLevels.map(grade => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter subject description"
                    rows={3}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center"
                  >
                    {isLoading ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" /> Create
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Subject Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <Edit className="h-5 w-5 mr-2 text-blue-600" />
                  Edit Subject
                </h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>
              
              <form onSubmit={handleUpdateSubject} className="space-y-4">
                <div>
                  <label htmlFor="edit_subject_code" className="block text-sm font-medium text-gray-700 mb-1">
                    Subject Code*
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Tag className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="edit_subject_code"
                      name="subject_code"
                      value={formData.subject_code}
                      onChange={handleInputChange}
                      required
                      className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="edit_subject_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Subject Name*
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Book className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="edit_subject_name"
                      name="subject_name"
                      value={formData.subject_name}
                      onChange={handleInputChange}
                      required
                      className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="edit_grade_level" className="block text-sm font-medium text-gray-700 mb-1">
                    Grade Level*
                  </label>
                  <select
                    id="edit_grade_level"
                    name="grade_level"
                    value={formData.grade_level}
                    onChange={handleInputChange}
                    required
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    {gradeLevels.map(grade => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="edit_description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="edit_description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center"
                  >
                    {isLoading ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" /> Update
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center mb-4">
                <AlertCircle className="h-6 w-6 text-red-600 mr-2" />
                <h3 className="text-xl font-medium text-gray-900">Delete Subject</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <span className="font-medium">{currentSubject?.subject_name}</span> ({currentSubject?.subject_code})? 
                This action may affect classes and student records associated with this subject.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteSubject}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center"
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SubjectManagementPage;