import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle } from 'lucide-react';

const AddStudentModal = ({ 
  isOpen, 
  onClose, 
  formData, 
  onChange, 
  onSubmit, 
  classes, 
  isLoading 
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="teacher-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="teacher-modal-panel sm:max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="teacher-modal-header">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Add New Student</h2>
                <p className="mt-1 text-sm text-gray-500">Enter the learner details and assign a class.</p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="teacher-modal-body">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* LRN */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    LRN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="lrn"
                    value={formData.lrn}
                    onChange={onChange}
                    placeholder="12-digit Learner Reference Number"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    maxLength="12"
                    pattern="[0-9]{12}"
                    title="LRN must be 12 digits"
                  />
                </div>
                
                {/* Class */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="class_id"
                    value={formData.class_id}
                    onChange={onChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Class</option>
                    {classes.map(classItem => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.grade_level} - {classItem.section}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={onChange}
                    placeholder="First Name"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                {/* Middle Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    name="middle_name"
                    value={formData.middle_name}
                    onChange={onChange}
                    placeholder="Middle Name (optional)"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={onChange}
                    placeholder="Last Name"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                {/* Birthdate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Birthdate <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="birthdate"
                    value={formData.birthdate}
                    onChange={onChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                {/* Age - Read-only, calculated automatically */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age <span className="text-gray-500">(Auto-calculated)</span>
                  </label>
                  <input
                    type="text"
                    name="age"
                    value={formData.age}
                    readOnly
                    className="block w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-700 cursor-not-allowed"
                  />
                </div>
                
                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="sex"
                    value={formData.sex}
                    onChange={onChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-5 border-t border-gray-200 pt-5">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Contact Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      name="contact_number"
                      value={formData.contact_number}
                      onChange={onChange}
                      placeholder="Contact Number"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={onChange}
                      placeholder="Email Address"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      If not provided, an email will be auto-generated using the LRN
                    </p>
                  </div>
                  
                  {/* Address */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={onChange}
                      placeholder="Full Address"
                      rows="2"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    ></textarea>
                  </div>
                </div>
              </div>
              
              </div>
              <div className="teacher-modal-footer">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-white transition-colors hover:bg-blue-700 disabled:opacity-70 sm:w-auto"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Add Student
                    </>
                  )}
                </button>
              </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddStudentModal;
