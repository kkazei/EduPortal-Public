import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, User, ChevronLeft, ChevronRight, ExternalLink, Share2, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { format } from 'date-fns';
import { useAnnouncementStore } from '../../store/announcementStore';

const ImageGallery = ({ images, getFullImageUrl }) => {
  const [selectedImage, setSelectedImage] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  if (!images || images.length === 0) return null;

  const currentImage = images[selectedImage];

  return (
    <div className="mb-6">
      {/* Main Image */}
      <div className="relative bg-gray-100 rounded-xl overflow-hidden shadow-lg">
        <img 
          src={getFullImageUrl(currentImage.image_url)}
          alt="" 
          className={`w-full transition-transform duration-300 ${
            isZoomed ? 'scale-150 cursor-zoom-out' : 'h-64 sm:h-80 object-cover cursor-zoom-in'
          }`}
          onClick={() => setIsZoomed(!isZoomed)}
          onError={(e) => {
            e.target.onerror = null;
            e.target.style.display = 'none';
          }}
        />
        
        {/* Image Controls */}
        <div className="absolute top-4 right-4 flex space-x-2">
          <button
            onClick={() => setIsZoomed(!isZoomed)}
            className="p-2 bg-black bg-opacity-50 text-white rounded-lg hover:bg-opacity-70 transition-all"
          >
            {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
          </button>
          <a
            href={getFullImageUrl(currentImage.image_url)}
            download
            className="p-2 bg-black bg-opacity-50 text-white rounded-lg hover:bg-opacity-70 transition-all"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>

        {/* Image Counter */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
            {selectedImage + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnail Navigation */}
      {images.length > 1 && (
        <div className="flex space-x-2 mt-4 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setSelectedImage(index)}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                selectedImage === index 
                  ? 'border-blue-500 ring-2 ring-blue-200' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <img 
                src={getFullImageUrl(image.image_url)}
                alt="" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const AnnouncementModal = ({ 
  announcement, 
  isOpen, 
  onClose,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious
}) => {
  const { getFullImageUrl } = useAnnouncementStore();
  const [isSharing, setIsSharing] = useState(false);
  
  if (!announcement) return null;
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return format(date, 'MMMM d, yyyy • h:mm a');
  };

  const handleShare = async () => {
    setIsSharing(true);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: announcement.title,
          text: announcement.content.substring(0, 100) + '...',
          url: `${window.location.origin}/announcement/${announcement.id}`
        });
      } catch (error) {
        console.log('Share canceled');
      }
    } else {
      // Fallback to copying to clipboard
      const url = `${window.location.origin}/announcement/${announcement.id}`;
      await navigator.clipboard.writeText(url);
      // You could show a toast here
    }
    
    setIsSharing(false);
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="teacher-modal-overlay bg-slate-950/75"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="teacher-modal-panel sm:max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-blue-700 p-4 text-white sm:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-2 h-2 bg-blue-200 rounded-full animate-pulse"></div>
                    <span className="text-blue-100 text-sm font-medium">Active Announcement</span>
                  </div>
                  <h2 className="text-xl font-bold leading-tight sm:text-3xl">
                    {announcement.title}
                  </h2>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleShare}
                    disabled={isSharing}
                    className="p-2 bg-white bg-opacity-20 rounded-xl hover:bg-opacity-30 transition-all"
                    title="Share announcement"
                  >
                    <Share2 className={`w-5 h-5 ${isSharing ? 'animate-pulse' : ''}`} />
                  </button>
                  <button 
                    className="p-2 bg-white bg-opacity-20 rounded-xl hover:bg-opacity-30 transition-all"
                    onClick={onClose}
                    title="Close modal"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              {/* Meta Information */}
              <div className="flex flex-wrap items-center gap-4 mt-4 text-blue-100">
                <div className="flex items-center bg-white bg-opacity-20 rounded-lg px-3 py-1">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">
                    {formatDate(announcement.publish_date || announcement.created_at)}
                  </span>
                </div>
                {announcement.creator && (
                  <div className="flex items-center bg-white bg-opacity-20 rounded-lg px-3 py-1">
                    <User className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium">{announcement.creator.user_fullname}</span>
                  </div>
                )}
                {announcement.category && (
                  <div className="bg-blue-500 bg-opacity-90 rounded-lg px-3 py-1">
                    <span className="text-sm font-medium text-white">{announcement.category}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Content */}
            <div className="teacher-modal-body">
              <div>
                {/* Image Gallery */}
                <ImageGallery 
                  images={announcement.images} 
                  getFullImageUrl={getFullImageUrl}
                />
                
                {/* Text Content */}
                <div className="prose prose-lg max-w-none">
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed text-base sm:text-lg">
                    {announcement.content}
                  </div>
                </div>
                
                {/* View Full Announcement */}
                {announcement.id && (
                  <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-1">View Full Announcement</h4>
                        <p className="text-gray-600 text-sm">Open in dedicated page view</p>
                      </div>
                      <a 
                        href={`/announcement/${announcement.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" /> 
                        View Full
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer with Navigation */}
            <div className="teacher-modal-footer">
              <div className="flex items-center justify-between gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center px-4 py-2 rounded-xl transition-all font-medium ${
                    hasPrevious 
                      ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:shadow-lg' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasPrevious) onPrevious();
                  }}
                  disabled={!hasPrevious}
                >
                  <ChevronLeft className="w-5 h-5 mr-1" />
                  Previous
                </motion.button>
                
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    {[...Array(3)].map((_, i) => (
                      <div 
                        key={i}
                        className="w-2 h-2 bg-blue-400 rounded-full"
                      />
                    ))}
                  </div>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center px-4 py-2 rounded-xl transition-all font-medium ${
                    hasNext 
                      ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:shadow-lg' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasNext) onNext();
                  }}
                  disabled={!hasNext}
                >
                  Next
                  <ChevronRight className="w-5 h-5 ml-1" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AnnouncementModal;
