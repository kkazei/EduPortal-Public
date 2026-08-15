import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminStore } from '../../store/adminStore';
import { useClassStore } from '../../store/classStore';
import { useSchoolYearStore } from '../../store/schoolYearStore';
import toast from 'react-hot-toast';
import { X, School, AlertTriangle, CheckCircle } from 'lucide-react';

const CreateClass = ({ isOpen, onClose, onSuccess }) => {
  const { createClass, fetchTeachers, teachers, isLoading, error, clearMessages } = useAdminStore();
  const { classes, fetchClasses } = useClassStore();
  const { selected, fetchYears } = useSchoolYearStore();
  
  const [formData, setFormData] = useState({
    grade_level: '',
    section: '',
    teacher_id: ''
  });
  
  const [formError, setFormError] = useState({});
  const [duplicateWarning, setDuplicateWarning] = useState('');
  
  // Grade levels from 1 to 6
  const gradeLevels = [
    { value: 'Grade 1', label: 'Grade 1' },
    { value: 'Grade 2', label: 'Grade 2' },
    { value: 'Grade 3', label: 'Grade 3' },
    { value: 'Grade 4', label: 'Grade 4' },
    { value: 'Grade 5', label: 'Grade 5' },
    { value: 'Grade 6', label: 'Grade 6' }
  ];
  
  // Fetch teachers and classes when modal opens
  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        try {
          // Ensure years are loaded so selected is available
          await Promise.all([fetchYears(), fetchTeachers(), fetchClasses()]);
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      };
      loadData();
    }
  }, [fetchTeachers, fetchClasses, fetchYears, isOpen]);
  
  // Check for duplicates when grade_level, section, or school_year changes
  useEffect(() => {
    checkForDuplicates();
  }, [formData.grade_level, formData.section, selected, classes]);
  
  const checkForDuplicates = () => {
    if (!formData.grade_level || !formData.section || !selected) {
      setDuplicateWarning('');
      return;
    }
    
    const isDuplicate = classes.some(cls => 
      cls.grade_level.toLowerCase() === formData.grade_level.toLowerCase() &&
      cls.section.toLowerCase() === formData.section.toLowerCase() &&
      cls.school_year === selected
    );
    
    if (isDuplicate) {
  setDuplicateWarning(`A class "${formData.grade_level} - ${formData.section}" already exists for school year ${selected}`);
    } else {
      setDuplicateWarning('');
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing in a field
    if (formError[name]) {
      setFormError(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  const validateForm = () => {
    const errors = {};
  if (!formData.grade_level.trim()) errors.grade_level = 'Grade level is required';
  if (!formData.section.trim()) errors.section = 'Section is required';
  if (!selected) errors.school_year = 'School year is required';
    
    // Check for duplicates
    if (duplicateWarning) {
      errors.duplicate = 'This class combination already exists';
    }
    
    return errors;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages?.();
    
    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormError(errors);
      if (duplicateWarning) {
        toast.error('Cannot create duplicate class');
      }
      return;
    }
    
    // Double-check for duplicates before submitting
    const isDuplicate = classes.some(cls => 
      cls.grade_level.toLowerCase() === formData.grade_level.toLowerCase() &&
      cls.section.toLowerCase() === formData.section.toLowerCase() &&
      cls.school_year === selected
    );
    
    if (isDuplicate) {
      toast.error('This class already exists');
      return;
    }
    
    // Create class
    try {
      const classData = {
        grade_level: formData.grade_level,
        section: formData.section,
        school_year: selected, // ensure active/selected year is used
        teacher_id: formData.teacher_id || null
      };
      
      await createClass(classData);
      toast.success("Class created successfully!");
      
      // Reset form
      setFormData({
        grade_level: '',
        section: '',
        teacher_id: ''
      });
      setFormError({});
      setDuplicateWarning('');
      
      // Call success callback and close modal
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to create class";
      toast.error(errorMessage);
      
      // Handle duplicate error from backend
      if (errorMessage.toLowerCase().includes('duplicate') || 
          errorMessage.toLowerCase().includes('already exists')) {
        setDuplicateWarning(errorMessage);
      }
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setFormData({
      grade_level: '',
      section: '',
      teacher_id: ''
    });
    setFormError({});
    setDuplicateWarning('');
    clearMessages?.();
    onClose();
  };

  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with Gradient */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-10">
                <School className="h-32 w-32" />
              </div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-white bg-opacity-20 p-2 rounded-lg mr-3">
                    <School className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold">Create New Class</h2>
                </div>
                <button
                  onClick={handleClose}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
        
        {/* Modal Body */}
        <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-lg"
            >
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Duplicate Warning */}
          {duplicateWarning && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6 rounded-lg"
            >
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-orange-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-orange-700">{duplicateWarning}</p>
                </div>
              </div>
            </motion.div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="grade_level" className="block text-sm font-medium text-gray-700 mb-1">
                Grade Level <span className="text-red-500">*</span>
              </label>
              <select
                id="grade_level"
                name="grade_level"
                value={formData.grade_level}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                  formError.grade_level ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="">Select a grade level</option>
                {gradeLevels.map((grade) => (
                  <option key={grade.value} value={grade.value}>
                    {grade.label}
                  </option>
                ))}
              </select>
              {formError.grade_level && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-1 text-sm text-red-600"
                >
                  {formError.grade_level}
                </motion.p>
              )}
            </div>
            
            <div>
              <label htmlFor="section" className="block text-sm font-medium text-gray-700 mb-1">
                Section <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="section"
                name="section"
                value={formData.section}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                  formError.section ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="e.g., A, B, Maalaga, Malasakit"
              />
              {formError.section && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-1 text-sm text-red-600"
                >
                  {formError.section}
                </motion.p>
              )}
            </div>
            
            <div>
              <label htmlFor="school_year" className="block text-sm font-medium text-gray-700 mb-1">
                School Year <span className="text-red-500">*</span>
              </label>
              <div className={`w-full px-4 py-2.5 border rounded-lg bg-gray-50 font-medium text-gray-700 ${formError.school_year ? 'border-red-500' : 'border-gray-300'}`}>
                {selected || '—'}
              </div>
              {formError.school_year && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-1 text-sm text-red-600"
                >
                  {formError.school_year}
                </motion.p>
              )}
            </div>
            
            <div>
              <label htmlFor="teacher_id" className="block text-sm font-medium text-gray-700 mb-1">
                Assign Teacher (Optional)
              </label>
              <select
                id="teacher_id"
                name="teacher_id"
                value={formData.teacher_id}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
              >
                <option value="">Select a teacher (optional)</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.user_fullname} ({teacher.user_email})
                  </option>
                ))}
              </select>
            </div>

            {/* Preview of class being created */}
            {formData.grade_level && formData.section && selected && !duplicateWarning && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg"
              >
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-purple-600 mr-2" />
                  <p className="text-sm text-purple-800">
                    <span className="font-semibold">Creating:</span> {formData.grade_level} - {formData.section} ({selected})
                  </p>
                </div>
              </motion.div>
            )}
            
            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading || duplicateWarning}
                className={`px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 border border-transparent rounded-lg hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all ${
                  isLoading || duplicateWarning ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </span>
                ) : duplicateWarning ? 'Cannot Create Duplicate' : 'Create Class'
                }
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreateClass;