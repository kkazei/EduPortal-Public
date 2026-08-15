import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Edit, PlusCircle, Loader } from 'lucide-react';

const AnnouncementFormModal = ({
  isOpen,
  onClose,
  isEditing,
  formData,
  onChange,
  onSubmit,
  onImageSelect,
  imagePreviews,
  onRemoveImage
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  if (!isOpen) return null;
  
  // Modified handler for form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Call the parent's onSubmit function and wait for it to complete
      await onSubmit(e);
      // Close the modal after successful submission
      onClose();
    } catch (error) {
      // If there was an error, don't close the modal
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            {isEditing ? 'Edit Announcement' : 'Create Announcement'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          <form id="announcement-modal-form" onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2" htmlFor="title-modal">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title-modal"
                placeholder="Enter announcement title"
                className="w-full px-3 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                value={formData.title}
                onChange={(e) => onChange({ ...formData, title: e.target.value })}
                required
                disabled={isSubmitting}
              />
            </div>
            
            <div className="mb-5">
              <label className="block text-gray-700 font-medium mb-2" htmlFor="content-modal">
                Content <span className="text-red-500">*</span>
              </label>
              <textarea
                id="content-modal"
                placeholder="Enter announcement details"
                rows={4}
                className="w-full px-3 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                value={formData.content}
                onChange={(e) => onChange({ ...formData, content: e.target.value })}
                required
                disabled={isSubmitting}
              ></textarea>
            </div>
            
            {/* Image upload section */}
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2">
                Image Attachment (Optional)
              </label>
              <div 
                className={`border-2 border-dashed border-gray-300 rounded-lg p-4 ${!isSubmitting ? 'cursor-pointer hover:border-blue-400' : 'opacity-70'} transition-colors`}
                onClick={() => !isSubmitting && document.getElementById('modal-announcement-image').click()}
              >
                <input
                  type="file"
                  id="modal-announcement-image"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={onImageSelect}
                  disabled={isSubmitting}
                />
                
                {imagePreviews.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img 
                          src={preview} 
                          alt="Preview" 
                          className="w-full h-32 object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveImage(index);
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600"
                          disabled={isSubmitting}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Upload className="mx-auto h-10 w-10 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600 font-medium">Tap to upload images</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB each</p>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
        
        {/* Modal Footer - Fixed at bottom */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="announcement-modal-form"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center relative"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader className="h-5 w-5 mr-2 animate-spin" /> 
                  {isEditing ? 'Updating...' : 'Posting...'}
                </>
              ) : isEditing ? (
                <>
                  <Edit className="h-5 w-5 mr-2" /> Update
                </>
              ) : (
                <>
                  <PlusCircle className="h-5 w-5 mr-2" /> Post
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AnnouncementFormModal;