import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, LogIn, RefreshCw } from 'lucide-react';
import RenderComment from './RenderComment';
import CommentForm from './CommentForm';
import { useCommentHandlers } from './useCommentHandlers';
import { useCommentNotifications } from './useCommentNotifications';
import { useReplyPagination } from './useReplyPagination';

const CommentsSection = ({
  comments,
  commentsLoading,
  isAuthenticated,
  user,
  onCreateComment,
  onCreateReply,
  onUpdateComment,
  onDeleteComment,
  onLoadReplies,
  announcementId,
  onRefreshComments
}) => {
  // Add refs to preserve cursor position
  const replyTextareaRef = useRef(null);
  const editTextareaRef = useRef(null);
  const newCommentTextareaRef = useRef(null);

  // Add state for manual refresh
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Constants for pagination
  const REPLIES_PER_PAGE = 3;
  const INITIAL_REPLIES_SHOWN = 2;

  // Custom hooks
  const { highlightedComment } = useCommentNotifications(announcementId, onLoadReplies);
  
  const {
    newComment,
    replyingTo,
    replyContent,
    editingComment,
    editContent,
    setReplyingTo,
    setEditingComment,
    handleCreateComment,
    handleCreateReply,
    handleUpdateComment,
    startReply,
    startEdit,
    canEditComment,
    handleNewCommentChange,
    handleReplyContentChange,
    handleEditContentChange
  } = useCommentHandlers({
    isAuthenticated,
    user,
    comments,
    onCreateComment,
    onCreateReply,
    onUpdateComment,
    onDeleteComment
  });

  const {
    loadingReplies,
    replyPages,
    collapsedReplies,
    handleLoadMoreReplies,
    toggleRepliesVisibility,
    getVisibleReplies,
    hasMoreReplies
  } = useReplyPagination(INITIAL_REPLIES_SHOWN, REPLIES_PER_PAGE);

  // ADD THIS: Polling for real-time comment updates with more debugging
  useEffect(() => {
    if (!onRefreshComments || !announcementId) {
      console.log('Polling not started - missing props:', { onRefreshComments: !!onRefreshComments, announcementId });
      return;
    }

    console.log('Starting comment polling for announcement:', announcementId);

    const pollComments = setInterval(() => {
      console.log('Polling for new comments... Current count:', comments.length);
      onRefreshComments();
    }, 10000); // Reduce to 10 seconds for testing

    return () => {
      console.log('Stopping comment polling');
      clearInterval(pollComments);
    };
  }, [onRefreshComments, announcementId, comments.length]); // Add comments.length to see changes

  // ADD THIS: Service Worker message handling for comments
  useEffect(() => {
    const handleServiceWorkerMessage = (event) => {
      if (event.data?.type === 'REFRESH_COMMENTS' && 
          event.data?.announcementId === announcementId) {
        console.log('Service worker requested comment refresh for announcement:', announcementId);
        onRefreshComments?.();
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      };
    }
  }, [announcementId, onRefreshComments]);

  // ADD THIS: Manual refresh function
  const handleManualRefresh = async () => {
    if (!onRefreshComments || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await onRefreshComments();
      console.log('Comments refreshed manually');
    } catch (error) {
      console.error('Failed to refresh comments:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Helper function to get user initials
  const getUserInitials = useCallback((userData) => {
    if (!userData) return 'U';
    
    const name = userData.fullname || 
                 userData.user_fullname || 
                 userData.full_name || 
                 userData.first_name || 
                 userData.name ||
                 'Unknown';
    
    const nameParts = name.split(' ');
    if (nameParts.length > 1) {
      return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
    }
    
    return name.charAt(0).toUpperCase();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800 flex items-center">
            <MessageCircle className="h-5 w-5 mr-2" />
            Comments ({comments.length})
          </h3>
          <div className="flex items-center gap-2">
            {/* ADD THIS: Manual refresh button */}
            {onRefreshComments && (
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className={`p-2 rounded-lg transition-colors ${
                  isRefreshing 
                    ? 'bg-gray-100 cursor-not-allowed' 
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                }`}
                title="Refresh comments"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
            {!isAuthenticated && (
              <Link
                to="/student-login"
                className="flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
              >
                <LogIn className="h-4 w-4 mr-1" />
                Login to Comment
              </Link>
            )}
          </div>
        </div>
        
        {/* New Comment Form */}
        {isAuthenticated && (
          <CommentForm
            newComment={newComment}
            onCommentChange={handleNewCommentChange}
            onSubmit={handleCreateComment}
            getUserInitials={getUserInitials}
            user={user}
            commentsLoading={commentsLoading}
            newCommentTextareaRef={newCommentTextareaRef}
          />
        )}
        
        {/* Comments List */}
        {commentsLoading && comments.length === 0 ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {comments.map((comment) => (
              <RenderComment 
                key={comment.id} 
                comment={comment} 
                depth={0}
                replyingTo={replyingTo}
                replyContent={replyContent}
                editingComment={editingComment}
                editContent={editContent}
                highlightedComment={highlightedComment}
                loadingReplies={loadingReplies}
                replyPages={replyPages}
                collapsedReplies={collapsedReplies}
                user={user}
                isAuthenticated={isAuthenticated}
                getUserInitials={getUserInitials}
                getVisibleReplies={getVisibleReplies}
                hasMoreReplies={hasMoreReplies}
                startReply={startReply}
                canEditComment={canEditComment}
                startEdit={startEdit}
                onDeleteComment={onDeleteComment}
                toggleRepliesVisibility={toggleRepliesVisibility}
                handleLoadMoreReplies={handleLoadMoreReplies}
                handleCreateReply={handleCreateReply}
                handleUpdateComment={handleUpdateComment}
                handleReplyContentChange={handleReplyContentChange}
                handleEditContentChange={handleEditContentChange}
                setReplyingTo={setReplyingTo}
                setEditingComment={setEditingComment}
                replyTextareaRef={replyTextareaRef}
                editTextareaRef={editTextareaRef}
                REPLIES_PER_PAGE={REPLIES_PER_PAGE}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CommentsSection;