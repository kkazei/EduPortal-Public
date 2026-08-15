import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Bell, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import ImageViewer from '../../components/PublicAnnouncementComponents/ImageViewer';
import AnnouncementHeader from '../../components/PublicAnnouncementComponents/AnnouncementHeader';
import AnnouncementCard from '../../components/PublicAnnouncementComponents/AnnouncementCard';
import CommentsSection from '../../components/PublicAnnouncementComponents/CommentsSection';
import { useAnnouncementStore } from '../../store/announcementStore';
import { useCommentStore } from '../../store/commentStore';
import { useAuthStore } from '../../store/authStore';

const PublicAnnouncement = () => {
  const { id } = useParams();
  
  // Image viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Announcement store
  const {
    currentAnnouncement: announcement,
    isLoading,
    error,
    fetchPublicAnnouncementById,
    getFullImageUrl,
    clearCurrentAnnouncement
  } = useAnnouncementStore();
  
  // Comment store
  const {
    comments,
    isLoading: commentsLoading,
    fetchCommentsByAnnouncement,
    createComment,
    createReply,
    updateComment,
    deleteComment,
    clearComments
  } = useCommentStore();
  
  // Auth store
  const { user, isAuthenticated } = useAuthStore();
  
  useEffect(() => {
    if (id) {
      fetchPublicAnnouncementById(id);
    }
    
    return () => {
      clearComments();
      clearCurrentAnnouncement();
    };
  }, [id, fetchPublicAnnouncementById, clearComments, clearCurrentAnnouncement]);
  
  useEffect(() => {
    if (announcement) {
      fetchCommentsByAnnouncement(announcement.id);
    }
  }, [announcement, fetchCommentsByAnnouncement]);
  
  // ADD THIS: Function to refresh comments with better debugging
  const handleRefreshComments = useCallback(async () => {
    if (!announcement?.id) {
      console.log('Cannot refresh comments - no announcement ID');
      return;
    }
    
    console.log('Refreshing comments for announcement:', announcement.id);
    console.log('Current comments count before refresh:', comments.length);
    
    try {
      const result = await fetchCommentsByAnnouncement(announcement.id);
      console.log('Comments refreshed successfully. New count:', result.data.length);
    } catch (error) {
      console.error('Failed to refresh comments:', error);
    }
  }, [announcement?.id, fetchCommentsByAnnouncement, comments.length]); // Add comments.length
  
  // Image viewer functions
  const openImageViewer = (imageUrl, index) => {
    if (!announcement?.images) return;
    
    const images = announcement.images.map(img => getFullImageUrl(img.image_url));
    setViewerImages(images);
    setCurrentImageIndex(index);
    setViewerOpen(true);
    document.body.style.overflow = 'hidden';
  };
  
  const closeImageViewer = () => {
    setViewerOpen(false);
    document.body.style.overflow = 'auto';
  };
  
  const goToNextImage = (e) => {
    e.stopPropagation();
    if (!viewerImages.length) return;
    setCurrentImageIndex((prev) => (prev + 1) % viewerImages.length);
  };
  
  const goToPreviousImage = (e) => {
    e.stopPropagation();
    if (!viewerImages.length) return;
    setCurrentImageIndex((prev) => (prev - 1 + viewerImages.length) % viewerImages.length);
  };
  
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => toast.success('Link copied to clipboard!'))
      .catch(() => toast.error('Failed to copy link'));
  };
  
  // Comment handlers
  const handleCreateComment = async (content) => {
    return await createComment(announcement.id, content);
  };
  
  const handleCreateReply = async (commentId, content) => {
    try {
      const result = await createReply(announcement.id, commentId, content);
      
      // Refresh comments to ensure we have the latest state
      await fetchCommentsByAnnouncement(announcement.id);
      
      return result;
    } catch (error) {
      console.error('Error creating reply:', error);
      throw error;
    }
  };
  
  const handleUpdateComment = async (commentId, content) => {
    return await updateComment(commentId, content);
  };
  
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }
    return await deleteComment(commentId);
  };
  
  const handleLoadReplies = async () => {
    await fetchCommentsByAnnouncement(announcement.id);
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50 p-4">
        <div className="flex items-center">
          <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="ml-3 text-gray-600">Loading announcement...</span>
        </div>
      </div>
    );
  }
  
  if (error || !announcement) {
    return (
      <div className="min-h-screen flex justify-center items-center flex-col bg-gray-50 p-4">
        <Bell className="h-16 w-16 text-gray-300 mb-3" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Announcement Not Found</h2>
        <p className="text-gray-600 mb-6">{error || 'The announcement may have been removed or is not available.'}</p>
        <Link to="/" className="flex items-center text-blue-600 hover:underline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
        </Link>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 pt-20">
      <div className="max-w-4xl mx-auto px-4">
        <AnnouncementHeader onShare={handleShare} />
        
        <AnnouncementCard
          announcement={announcement}
          isAuthenticated={isAuthenticated}
          onImageClick={openImageViewer}
          getFullImageUrl={getFullImageUrl}
        />
        
        <CommentsSection
          comments={comments}
          commentsLoading={commentsLoading}
          isAuthenticated={isAuthenticated}
          user={user}
          onCreateComment={handleCreateComment}
          onCreateReply={handleCreateReply}
          onUpdateComment={handleUpdateComment}
          onDeleteComment={handleDeleteComment}
          onLoadReplies={handleLoadReplies}
          announcementId={announcement?.id}
          onRefreshComments={handleRefreshComments}
        />
      </div>
      
      <ImageViewer
        isOpen={viewerOpen}
        onClose={closeImageViewer}
        images={viewerImages}
        currentIndex={currentImageIndex}
        onNext={goToNextImage}
        onPrevious={goToPreviousImage}
      />
    </div>
  );
};

export default PublicAnnouncement;