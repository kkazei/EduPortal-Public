import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSchoolYearStore } from '../../store/schoolYearStore';
import { useAdminStore } from '../../store/adminStore';
import toast from 'react-hot-toast';
import { X, Check, Edit } from 'lucide-react';

const EditClass = ({ isOpen, onClose, classData, onSuccess }) => {
  const { updateClass, fetchTeachers, teachers, isLoading, clearMessages } = useAdminStore();
  
  const [formData, setFormData] = useState({
    grade_level: '',
    section: '',
    teacher_id: ''
  });
  const { selected } = useSchoolYearStore();
  
  const [formError, setFormError] = useState({});
  const [submitting, setSubmitting] = useState(false);
  
  const gradeLevels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
  
  // Update form data when classData changes
  useEffect(() => {
    if (classData && isOpen) {
      setFormData({
        grade_level: classData.grade_level || '',
        section: classData.section || '',
        teacher_id: classData.adviser_id || ''
      });
      setFormError({});
    }
  }, [classData, isOpen]);
  
  // Fetch teachers when modal opens
  useEffect(() => {
    if (isOpen) {
      const loadTeachers = async () => {
        try {
          await fetchTeachers();
        } catch (error) {
          console.error('Error fetching teachers:', error);
        }
      };
      
      loadTeachers();
    }
  }, [fetchTeachers, isOpen]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing in a field
    if (formError[name]) {
      setFormError(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  const validateForm = () => {
    const errors = {};
    if (!formData.grade_level.trim()) errors.grade_level = 'Grade level is required';
    if (!formData.section.trim()) errors.section = 'Section is required';
    // No manual edit of school year in this modal; it is shown read-only
    
    return errors;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (submitting) return; // Prevent multiple submissions
    
    clearMessages?.();
    
    // Validate form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormError(errors);
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Prepare data for update
      const updateData = {
        grade_level: formData.grade_level,
        section: formData.section,
        teacher_id: formData.teacher_id || null
      };
      
      await updateClass(classData.id, updateData);
      toast.success("Class updated successfully!");
      
      // Reset form
      setFormData({
        grade_level: '',
        section: '',
        teacher_id: ''
      });
      setFormError({});
      
      // Call success callback and close modal
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Update error:', error);
      toast.error(error.response?.data?.message || "Failed to update class");
    } finally {
      setSubmitting(false);
    }
  };
  
  const removeTeacher = () => {
    setFormData(prev => ({
      ...prev,
      teacher_id: ''
    }));
  };
  
  const handleClose = () => {
    if (submitting) return; // Don't allow closing while submitting
    
    // Reset form when closing
    setFormData({
      grade_level: '',
      section: '',
      teacher_id: ''
    });
    setFormError({});
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
            if (e.target === e.currentTarget && !submitting) handleClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with Gradient */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-10">
                <Edit className="h-32 w-32" />
              </div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-white bg-opacity-20 p-2 rounded-lg mr-3">
                    <Edit className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold">Edit Class</h2>
                </div>
                <button
                  onClick={handleClose}
                  disabled={submitting}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1 transition-colors disabled:opacity-50"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
        
        {/* Modal Body */}
        <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
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
                disabled={submitting}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  formError.grade_level ? 'border-red-500 bg-red-50' : 'border-gray-300'
                } ${submitting ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'bg-white'}`}
              >
                <option value="">Select a grade level</option>
                {gradeLevels.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
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
                disabled={submitting}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  formError.section ? 'border-red-500 bg-red-50' : 'border-gray-300'
                } ${submitting ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'bg-white'}`}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                School Year
              </label>
              <div className="w-full px-4 py-2.5 border rounded-lg bg-gray-50 font-medium text-gray-700 border-gray-300">
                {classData?.school_year || selected || '—'}
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="teacher_id" className="block text-sm font-medium text-gray-700">
                  Assign Teacher (Optional)
                </label>
                {formData.teacher_id && !submitting && (
                  <button
                    type="button"
                    onClick={removeTeacher}
                    className="text-xs text-red-500 hover:text-red-700 transition-colors font-medium"
                  >
                    Remove teacher
                  </button>
                )}
              </div>
              <select
                id="teacher_id"
                name="teacher_id"
                value={formData.teacher_id}
                onChange={handleChange}
                disabled={submitting}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors border-gray-300 ${
                  submitting ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'bg-white'
                }`}
              >
                <option value="">Select a teacher (optional)</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.user_fullname} ({teacher.user_email})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: submitting ? 1 : 1.02 }}
                whileTap={{ scale: submitting ? 1 : 0.98 }}
                type="submit"
                disabled={submitting}
                className={`inline-flex items-center px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 border border-transparent rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all ${
                  submitting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
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

export default EditClass;