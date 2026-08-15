import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  Book, AlertCircle, Search, Plus, X, Loader, 
  School, Filter, Check, MoreHorizontal, User,
  Trash2, ArrowLeft, ArrowRight, MoveHorizontal, GripVertical,
  PlusCircle, Trash // Add these two icons
} from 'lucide-react';

// Import stores
import { useSubjectStore } from '../../store/subjectStore';
import { useClassStore } from '../../store/classStore';
import { useAuthStore } from '../../store/authStore';

const DraggableSubject = ({ subject, onDragStart, onDragEnd, isDragging, onButtonClick, buttonIcon, buttonColor, dragIndicator = true }) => {
  const dragControls = useDragControls();
  
  return (
    <motion.div
      drag="x"
      dragControls={dragControls}
      onDragStart={() => onDragStart && onDragStart(subject.id)}
      onDragEnd={(e, info) => onDragEnd && onDragEnd(subject.id, info)}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.1}
      dragMomentum={false}
      whileDrag={{ scale: 1.05, boxShadow: "0 5px 10px rgba(0, 0, 0, 0.1)" }}
      className={`flex justify-between items-center p-4 rounded-xl border ${
        isDragging === subject.id ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 hover:bg-gray-100 border-gray-100'
      } transition-colors`}
    >
      <div>
        <div className="font-medium">
          {subject.subject_name}
        </div>
        {/* Removed subject code, description, and teacher info */}
      </div>
      <div className="flex items-center">
        {dragIndicator && (
          <div 
            onPointerDown={(e) => dragControls.start(e)}
            className="cursor-grab p-2 text-gray-400 hover:text-gray-600 touch-none"
          >
            <GripVertical className="h-5 w-5" />
          </div>
        )}
        {onButtonClick && (
          <button
            onClick={() => onButtonClick(subject)}
            className={`p-2 text-${buttonColor}-600 hover:bg-${buttonColor}-50 rounded-full transition-colors ml-2`}
            title={buttonColor === 'red' ? "Remove from class" : "Add to class"}
          >
            {buttonIcon}
          </button>
        )}
      </div>
    </motion.div>
  );
};

const ClassSubjectPage = () => {
  // Access stores
  const { user } = useAuthStore();
  const { 
    subjects, fetchSubjectsByGradeLevel, isLoading: subjectsLoading 
  } = useSubjectStore();
  
  const { 
    classes, fetchClasses, fetchClassById, 
    addSubjectToClass, removeSubjectFromClass, isLoading: classesLoading 
  } = useClassStore();

  const navigate = useNavigate();

  // Check if user is admin - add this
  useEffect(() => {
    if (user && user.user_role !== 'admin') {
      toast.error("Access denied. Admin privileges required.");
      navigate('/admin/dashboard');
    }
  }, [user, navigate]);

  // Component state
  const [selectedClass, setSelectedClass] = useState(null);
  const [gradeLevel, setGradeLevel] = useState('Grade 1');
  const [searchTerm, setSearchTerm] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [subjectToRemove, setSubjectToRemove] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [draggedSubject, setDraggedSubject] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showAddAllModal, setShowAddAllModal] = useState(false);
  const [showRemoveAllModal, setShowRemoveAllModal] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Grade levels
  const gradeLevels = [
    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'
  ];

  // Load classes when component mounts
  useEffect(() => {
    const loadClasses = async () => {
      try {
        await fetchClasses();
      } catch (error) {
        toast.error("Failed to load classes");
      }
    };
    
    loadClasses();
  }, [fetchClasses]);

  // Load subjects based on grade level
  useEffect(() => {
    const loadSubjects = async () => {
      if (gradeLevel) {
        try {
          await fetchSubjectsByGradeLevel(gradeLevel);
        } catch (error) {
          toast.error("Failed to load subjects");
        }
      }
    };
    
    loadSubjects();
  }, [fetchSubjectsByGradeLevel, gradeLevel]);

  // Update available subjects when a class is selected
  useEffect(() => {
    if (selectedClass && subjects.length > 0) {
      // Make sure we have the subjects property as an array
      const classSubjects = Array.isArray(selectedClass.subjects) ? selectedClass.subjects : [];
      const classSubjectIds = classSubjects.map(subject => subject.id);
      
      // Filter available subjects based on grade level and not already assigned
      const available = subjects.filter(subject => 
        subject.grade_level === selectedClass.grade_level && 
        !classSubjectIds.includes(subject.id)
      );
      
      setAvailableSubjects(available);
      setAssignedSubjects(classSubjects);
    }
  }, [selectedClass, subjects]);

  // Handle class selection
  const handleClassSelect = async (classId) => {
    setIsRefreshing(true);
    try {
      const classData = await fetchClassById(classId);
      
      if (!classData) {
        toast.error("Failed to load class details");
        return;
      }
      
      // Set the selected class with its grade level
      setSelectedClass(classData);
      setGradeLevel(classData.grade_level);
      
      // Update assigned subjects immediately
      if (Array.isArray(classData.subjects)) {
        setAssignedSubjects(classData.subjects);
      } else {
        // If subjects is not an array, set to empty array
        setAssignedSubjects([]);
        console.warn("No subjects found in class data or not in array format");
      }
    } catch (error) {
      console.error("Error fetching class details:", error);
      toast.error("Failed to load class details");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle drag start
  const handleDragStart = (subjectId) => {
    setDraggedSubject(subjectId);
    setIsDragging(true);
  };

  // Handle drag end for available subjects
  const handleAvailableDragEnd = async (subjectId, info) => {
    // If dragged right far enough, add to assigned subjects
    if (info.offset.x > 100 && !isRefreshing) {
      await handleAddSubject(subjectId);
    }
    setDraggedSubject(null);
    setIsDragging(false);
  };

  // Handle drag end for assigned subjects
  const handleAssignedDragEnd = async (subjectId, info) => {
    // If dragged left far enough, remove from assigned subjects
    if (info.offset.x < -100 && !isRefreshing) {
      const subject = assignedSubjects.find(s => s.id === subjectId);
      if (subject) {
        confirmRemoveSubject(subject);
      }
    }
    setDraggedSubject(null);
    setIsDragging(false);
  };

  // Handle grade level change
  const handleGradeLevelChange = (e) => {
    setGradeLevel(e.target.value);
  };

  // Filter classes by search term
  const filteredClasses = classes.filter(cls => 
    cls.grade_level?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.section?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.adviser?.user_fullname?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter available subjects by search term
  const filteredAvailableSubjects = availableSubjects.filter(subject =>
    subject.subject_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subject.subject_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle adding a subject to the class
  const handleAddSubject = async (subjectId) => {
    if (!selectedClass) return;
    
    try {
      // Show loading state
      setIsRefreshing(true);
      
      // Call API to add subject
      await addSubjectToClass(selectedClass.id, subjectId);
      
      // Refresh class details to update assigned subjects
      const updatedClass = await fetchClassById(selectedClass.id);
      setSelectedClass(updatedClass);
      
      // Make sure to update the assigned subjects
      if (Array.isArray(updatedClass.subjects)) {
        setAssignedSubjects(updatedClass.subjects);
        
        // Update available subjects
        const updatedSubjectIds = updatedClass.subjects.map(s => s.id);
        setAvailableSubjects(subjects.filter(subject => 
          subject.grade_level === updatedClass.grade_level && 
          !updatedSubjectIds.includes(subject.id)
        ));
      }
      
      toast.success("Subject added to class successfully");
    } catch (error) {
      console.error("Error adding subject:", error);
      toast.error(error.response?.data?.message || "Failed to add subject to class");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle removing a subject from the class
  const handleRemoveSubject = async () => {
    if (!selectedClass || !subjectToRemove) return;
    
    try {
      // Show loading state
      setIsRefreshing(true);
      
      // Call API to remove subject
      await removeSubjectFromClass(selectedClass.id, subjectToRemove.id);
      
      // Refresh class details to update assigned subjects
      const updatedClass = await fetchClassById(selectedClass.id);
      setSelectedClass(updatedClass);
      
      // Make sure to update the assigned subjects
      if (Array.isArray(updatedClass.subjects)) {
        setAssignedSubjects(updatedClass.subjects);
        
        // Update available subjects
        const updatedSubjectIds = updatedClass.subjects.map(s => s.id);
        setAvailableSubjects(subjects.filter(subject => 
          subject.grade_level === updatedClass.grade_level && 
          !updatedSubjectIds.includes(subject.id)
        ));
      }
      
      toast.success("Subject removed from class successfully");
      setShowConfirmModal(false);
      setSubjectToRemove(null);
    } catch (error) {
      console.error("Error removing subject:", error);
      toast.error(error.response?.data?.message || "Failed to remove subject from class");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Confirm subject removal
  const confirmRemoveSubject = (subject) => {
    setSubjectToRemove(subject);
    setShowConfirmModal(true);
  };

  // Handle adding all available subjects to the class
  const handleAddAllSubjects = async () => {
    if (!selectedClass || bulkActionLoading || filteredAvailableSubjects.length === 0) return;
    
    setShowAddAllModal(false);
    setBulkActionLoading(true);
    
    try {
      // Use Promise.all to handle multiple requests concurrently
      await Promise.all(
        filteredAvailableSubjects.map(subject => 
          addSubjectToClass(selectedClass.id, subject.id)
        )
      );
      
      // Refresh class details
      const updatedClass = await fetchClassById(selectedClass.id);
      setSelectedClass(updatedClass);
      
      // Update assigned subjects
      if (Array.isArray(updatedClass.subjects)) {
        setAssignedSubjects(updatedClass.subjects);
        
        // Update available subjects
        const updatedSubjectIds = updatedClass.subjects.map(s => s.id);
        setAvailableSubjects(subjects.filter(subject => 
          subject.grade_level === updatedClass.grade_level && 
          !updatedSubjectIds.includes(subject.id)
        ));
      }
      
      toast.success("All subjects added successfully");
    } catch (error) {
      console.error("Error adding all subjects:", error);
      toast.error("Failed to add all subjects");
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Handle removing all subjects from the class
  const handleRemoveAllSubjects = async () => {
    if (!selectedClass || bulkActionLoading || assignedSubjects.length === 0) return;
    
    setShowRemoveAllModal(false);
    setBulkActionLoading(true);
    
    try {
      // Use Promise.all to handle multiple requests concurrently
      await Promise.all(
        assignedSubjects.map(subject => 
          removeSubjectFromClass(selectedClass.id, subject.id)
        )
      );
      
      // Refresh class details
      const updatedClass = await fetchClassById(selectedClass.id);
      setSelectedClass(updatedClass);
      
      // Update assigned subjects (should be empty now)
      setAssignedSubjects([]);
      
      // Update available subjects
      setAvailableSubjects(subjects.filter(subject => 
        subject.grade_level === updatedClass.grade_level
      ));
      
      toast.success("All subjects removed successfully");
    } catch (error) {
      console.error("Error removing all subjects:", error);
      toast.error("Failed to remove all subjects");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const isLoading = subjectsLoading || classesLoading || isRefreshing;

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
        
        {/* Add back button - visible on all devices but more important for mobile */}
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
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Class Subject Management</h1>
            <p className="text-blue-100">Assign and manage subjects for each class</p>
          </div>
          
          {selectedClass && (
            <div className="bg-white bg-opacity-20 py-1 px-3 rounded-full text-sm">
              <span className="font-medium">Tip:</span> Drag subjects left/right to assign or remove
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Class Selection Panel */}
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <School className="w-5 h-5 mr-2 text-blue-500" />
              Classes
            </h2>
          </div>

          {/* Search & Filter */}
          <div className="mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search classes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Classes List */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {isLoading && !filteredClasses.length ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                <span className="ml-3 text-gray-600">Loading classes...</span>
              </div>
            ) : filteredClasses.length > 0 ? (
              filteredClasses.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => handleClassSelect(cls.id)}
                  className={`w-full text-left p-4 rounded-xl transition-colors ${
                    selectedClass?.id === cls.id
                      ? "bg-blue-50 border-blue-200 border-2"
                      : "bg-gray-50 hover:bg-gray-100 border border-gray-100"
                  }`}
                >
                  <div className="font-medium text-lg">
                    {cls.grade_level} - {cls.section}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center mt-1">
                    <User className="h-4 w-4 mr-1" />
                    {cls.adviser_name || "No adviser assigned"}
                  </div>
                  <div className="text-xs text-gray-400 mt-2 bg-gray-100 inline-block px-2 py-1 rounded-full">
                    {selectedClass?.id === cls.id 
                      ? `${assignedSubjects.length} subjects assigned` 
                      : cls.subjects?.length > 0
                        ? `${cls.subjects.length} subjects assigned`
                        : "Click to view subjects"}
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-lg">No classes found</p>
                <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        </div>

        {/* Middle Panel - Available Subjects */}
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <Book className="w-5 h-5 mr-2 text-blue-500" />
              Available Subjects
            </h2>

            <div className="flex items-center gap-3">
              {/* Add All Subjects Button */}
              {selectedClass && filteredAvailableSubjects.length > 0 && (
                <button
                  onClick={() => setShowAddAllModal(true)}
                  disabled={bulkActionLoading || isLoading}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center hover:bg-blue-200 transition-colors"
                >
                  <PlusCircle className="w-3 h-3 mr-1" />
                  Add All
                </button>
              )}

              {/* Grade Level Selector */}
              <div className="max-w-xs">
                <select
                  value={gradeLevel}
                  onChange={handleGradeLevelChange}
                  className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  disabled={!!selectedClass}
                >
                  {gradeLevels.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {!selectedClass ? (
            <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
              <School className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-lg">Please select a class first</p>
              <p className="text-sm text-gray-400 mt-1">Choose a class from the left panel</p>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="ml-3 text-gray-600">Loading subjects...</span>
            </div>
          ) : filteredAvailableSubjects.length > 0 ? (
            <div className={`space-y-3 max-h-[400px] overflow-y-auto ${isDragging ? 'p-2 bg-blue-50 rounded-xl' : ''}`}>
              {filteredAvailableSubjects.map((subject) => (
                <DraggableSubject
                  key={subject.id}
                  subject={subject}
                  onDragStart={handleDragStart}
                  onDragEnd={handleAvailableDragEnd}
                  isDragging={draggedSubject}
                  onButtonClick={() => handleAddSubject(subject.id)}
                  buttonIcon={
                    isLoading ? (
                      <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    ) : (
                      <ArrowRight className="h-5 w-5" />
                    )
                  }
                  buttonColor="blue"
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-lg">No available subjects</p>
              <p className="text-sm text-gray-400 mt-1">All subjects are already assigned or none available for this grade level</p>
            </div>
          )}
        </div>

        {/* Right Panel - Assigned Subjects */}
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <Check className="w-5 h-5 mr-2 text-green-500" />
              Assigned Subjects
            </h2>
            
            <div className="flex items-center gap-2">
              {/* Remove All Button */}
              {selectedClass && assignedSubjects.length > 0 && (
                <button
                  onClick={() => setShowRemoveAllModal(true)}
                  disabled={bulkActionLoading || isLoading}
                  className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded flex items-center hover:bg-red-200 transition-colors"
                >
                  <Trash className="w-3 h-3 mr-1" />
                  Remove All
                </button>
              )}

              {/* Subject count badge */}
              {selectedClass && (
                <div className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  {assignedSubjects.length} subjects
                </div>
              )}
            </div>
          </div>

          {!selectedClass ? (
            <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
              <School className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-lg">Please select a class first</p>
              <p className="text-sm text-gray-400 mt-1">Choose a class from the left panel</p>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="ml-3 text-gray-600">Loading subjects...</span>
            </div>
          ) : assignedSubjects.length > 0 ? (
            <div className={`space-y-3 max-h-[400px] overflow-y-auto ${isDragging ? 'p-2 bg-green-50 rounded-xl' : ''}`}>
              {assignedSubjects.map((subject) => (
                <DraggableSubject
                  key={subject.id}
                  subject={subject}
                  onDragStart={handleDragStart}
                  onDragEnd={handleAssignedDragEnd}
                  isDragging={draggedSubject}
                  onButtonClick={confirmRemoveSubject}
                  buttonIcon={
                    isLoading ? (
                      <div className="animate-spin w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full"></div>
                    ) : (
                      <ArrowLeft className="h-5 w-5" />
                    )
                  }
                  buttonColor="red"
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-lg">No subjects assigned yet</p>
              <p className="text-sm text-gray-400 mt-1">Drag subjects from the middle panel or use the arrow buttons</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowConfirmModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-red-600 mb-2">Remove Subject</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to remove <span className="font-medium">{subjectToRemove?.subject_name}</span> from this class?
                This might affect student grades associated with this subject.
              </p>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemoveSubject}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Removing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" /> Remove
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add All Subjects Confirmation Modal */}
      <AnimatePresence>
        {showAddAllModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddAllModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-blue-600 mb-2">Add All Subjects</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to add all {filteredAvailableSubjects.length} available subjects to 
                <span className="font-medium"> {selectedClass?.grade_level} - {selectedClass?.section}</span>?
              </p>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddAllModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddAllSubjects}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center"
                  disabled={bulkActionLoading}
                >
                  {bulkActionLoading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="h-4 w-4 mr-2" /> Add All
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Remove All Subjects Confirmation Modal */}
      <AnimatePresence>
        {showRemoveAllModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowRemoveAllModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-red-600 mb-2">Remove All Subjects</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to remove all {assignedSubjects.length} subjects from 
                <span className="font-medium"> {selectedClass?.grade_level} - {selectedClass?.section}</span>? 
                This may affect student grades and records.
              </p>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowRemoveAllModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemoveAllSubjects}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center"
                  disabled={bulkActionLoading}
                >
                  {bulkActionLoading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Removing...
                    </>
                  ) : (
                    <>
                      <Trash className="h-4 w-4 mr-2" /> Remove All
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

export default ClassSubjectPage;