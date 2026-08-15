import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, User, Mail, GraduationCap, Send } from "lucide-react";
import { useAdminStore } from "../../store/adminStore";

const CreateTeacher = ({ isOpen, onClose, onTeacherCreated }) => {
  const [formData, setFormData] = useState({
    user_fullname: "",
    user_email: "",
    teacher_title: "Teacher I"
  });
  const [success, setSuccess] = useState(false);

  // Use admin store
  const { createTeacher, isLoading, error, message, clearMessages } = useAdminStore();

  const teacherTitles = [
    "Teacher I",
    "Teacher II", 
    "Teacher III",
    "Master Teacher I",
    "Master Teacher II",
    "Master Teacher III",
    "Master Teacher IV"
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    try {
      await createTeacher(formData);
      setSuccess(true);
      setTimeout(() => {
        onTeacherCreated?.();
        handleClose();
      }, 2000);
    } catch (error) {
      // Error is already handled in the store
    }
  };

  const handleClose = () => {
    setFormData({
      user_fullname: "",
      user_email: "",
      teacher_title: "Teacher I"
    });
    clearMessages();
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Create Teacher Account</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Teacher Account Created!
            </h3>
            <p className="text-gray-600 mb-4">
              An activation email has been sent to <strong>{formData.user_email}</strong>
            </p>
            <p className="text-sm text-gray-500">
              The teacher will receive instructions to set up their password and activate their account.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="user_fullname"
                  value={formData.user_fullname}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter teacher's full name"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  name="user_email"
                  value={formData.user_email}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="teacher@school.edu"
                  required
                />
              </div>
            </div>

            {/* Teacher Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teacher Title *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <GraduationCap className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  name="teacher_title"
                  value={formData.teacher_title}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {teacherTitles.map((title) => (
                    <option key={title} value={title}>
                      {title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="text-blue-800 text-sm">
                <strong>Note:</strong> An activation email will be sent to the teacher's email address with instructions to set up their password and activate their account.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating Account...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Create Teacher & Send Activation Email
                </>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default CreateTeacher;