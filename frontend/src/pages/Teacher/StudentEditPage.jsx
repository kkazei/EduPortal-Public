import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Save, Loader, X, User, School, Mail, Phone, MapPin, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useStudentStore } from '../../store/studentStore';
import { useClassStore } from '../../store/classStore';

// Add this utility function at the top of your component for calculating age
const calculateAge = (birthdate) => {
  if (!birthdate) return '';
  const today = new Date();
  const birthdateObj = new Date(birthdate);
  let age = today.getFullYear() - birthdateObj.getFullYear();
  const monthDiff = today.getMonth() - birthdateObj.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdateObj.getDate())) {
    age--;
  }
  
  return age;
};

const StudentEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Stores
  const { 
    fetchStudentById, 
    updateStudent, 
    currentStudent, 
    isLoading, 
    error,
    message,
    clearMessages,
    clearCurrentStudent
  } = useStudentStore();
  
  const { classes, fetchClasses } = useClassStore();
  
  // Form state
  const [formData, setFormData] = useState({
    lrn: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    age: '',
    sex: '',
    birthdate: '',
    address: '',
    contact_number: '',
    email: '',
    class_id: '',
    status: 'Active'
  });
  
  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch student and classes data
  useEffect(() => {
    const loadData = async () => {
      try {
        const studentData = await fetchStudentById(id);
        
        // Format the birthdate for the date input (YYYY-MM-DD)
        const birthdate = studentData.birthdate ? 
          new Date(studentData.birthdate).toISOString().split('T')[0] : '';
        
        setFormData({
          lrn: studentData.lrn || '',
          first_name: studentData.first_name || '',
          middle_name: studentData.middle_name || '',
          last_name: studentData.last_name || '',
          age: studentData.age || '',
          sex: studentData.sex || '',
          birthdate: birthdate,
          address: studentData.address || '',
          contact_number: studentData.contact_number || '',
          email: studentData.email || '',
          class_id: studentData.class_id ? String(studentData.class_id) : '',
          status: studentData.status || 'Active'
        });
        
        fetchClasses();
      } catch (err) {
        toast.error("Failed to load student data");
        navigate('/students');
      }
    };
    
    loadData();
    
    // Cleanup function
    return () => {
      clearCurrentStudent();
    };
  }, [id, fetchStudentById, fetchClasses, navigate, clearCurrentStudent]);
  
  // Handle toast notifications
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearMessages();
    }
    if (message) {
      toast.success(message);
      clearMessages();
    }
  }, [error, message, clearMessages]);
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'birthdate') {
      // When birthdate changes, automatically calculate and update age
      const calculatedAge = calculateAge(value);
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        age: calculatedAge.toString()
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await updateStudent(id, formData);
      toast.success("Student updated successfully");
      // Go to that class's students list
      const classId = formData.class_id || (currentStudent?.class_id ? String(currentStudent.class_id) : null);
      if (classId) {
        navigate(`/class/${classId}/students`);
      } else {
        navigate('/students'); // fallback
      }
    } catch (err) {
      console.error("Error updating student:", err);
      // Error toast is displayed from the store effect
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleBack = () => {
    navigate(-1);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 pt-20 sm:pt-24 sm:p-8 w-full max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="bg-blue-700 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M160 0H40C17.9086 0 0 17.9086 0 40V160C0 182.091 17.9086 200 40 200H160C182.091 200 200 182.091 200 160V40C200 17.9086 182.091 0 160 0Z" fill="white"/>
          </svg>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <button 
              onClick={handleBack}
              className="flex items-center text-blue-100 hover:text-white mb-2 transition-colors"
            >
              <ChevronLeft size={20} className="mr-1" />
              <span>Back</span>
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Edit Student</h1>
            <p className="text-blue-100">Update student information</p>
          </div>
        </div>
      </div>
      
      {/* Loading state */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="ml-3 text-gray-600">Loading student data...</span>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-md p-6 sm:p-8">
          {/* Student form */}
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Personal Information Section */}
              <div className="md:col-span-2">
                <div className="flex items-center mb-4">
                  <User className="h-5 w-5 text-blue-600 mr-2" />
                  <h2 className="text-xl font-bold text-gray-800">Personal Information</h2>
                </div>
                <div className="h-1 w-full bg-blue-500 rounded-full mb-6"></div>
              </div>

              {/* LRN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LRN <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="lrn"
                    value={formData.lrn}
                    onChange={handleChange}
                    placeholder="12-digit Learner Reference Number"
                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 focus:ring-blue-500 focus:border-blue-500 cursor-not-allowed"
                    required
                    maxLength="12"
                    pattern="[0-9]{12}"
                    title="LRN must be 12 digits"
                    readOnly
                    disabled
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">LRN cannot be changed once created</p>
              </div>
              
              {/* Class */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    name="class_id"
                    value={formData.class_id}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 appearance-none"
                    required
                  >
                    <option value="">Select Class</option>
                    {classes.map(classItem => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.grade_level} - {classItem.section}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <School className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder="First Name"
                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
              
              {/* Middle Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Middle Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="middle_name"
                    value={formData.middle_name}
                    onChange={handleChange}
                    placeholder="Middle Name (optional)"
                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
              
              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder="Last Name"
                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
              
              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    name="sex"
                    value={formData.sex}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 appearance-none"
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Birthdate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Birthdate <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    name="birthdate"
                    value={formData.birthdate}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
              
              {/* Age */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="age"
                    value={formData.age}
                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                    readOnly
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">Age is automatically calculated from birthdate</p>
              </div>
              
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 appearance-none"
                    required
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Transferred">Transferred</option>
                    <option value="Graduated">Graduated</option>
                  </select>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <AlertCircle className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Contact Information Section */}
              <div className="md:col-span-2 mt-4">
                <div className="flex items-center mb-4">
                  <Phone className="h-5 w-5 text-blue-600 mr-2" />
                  <h2 className="text-xl font-bold text-gray-800">Contact Information</h2>
                </div>
                <div className="h-1 w-full bg-blue-500 rounded-full mb-6"></div>
              </div>
              
              {/* Contact Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    name="contact_number"
                    value={formData.contact_number}
                    onChange={handleChange}
                    placeholder="Contact Number"
                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
              
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-700">
                    {formData.email || 'Not provided'}
                  </div>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">Email cannot be changed here</p>
              </div>
              
              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <div className="relative">
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Full Address"
                    rows="3"
                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  ></textarea>
                  <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 border-t border-gray-200 pt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleBack}
                className="w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
              >
                <X className="h-5 w-5 mr-2" />
                Cancel
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader className="h-5 w-5 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Save Changes
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </div>
      )}
    </motion.div>
  );
};

export default StudentEditPage;
