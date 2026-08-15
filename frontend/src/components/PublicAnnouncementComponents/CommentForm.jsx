import React from 'react';
import { Send, Bell } from 'lucide-react';

const CommentForm = ({ 
  newComment, 
  onCommentChange, 
  onSubmit, 
  getUserInitials, 
  user, 
  commentsLoading,
  newCommentTextareaRef
}) => {
  return (
    <form onSubmit={onSubmit} className="mb-6">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {getUserInitials(user)}
            </span>
          </div>
        </div>
        <div className="flex-1">
          <textarea
            ref={newCommentTextareaRef}
            value={newComment}
            onChange={onCommentChange}
            placeholder="Write a comment..."
            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows="3"
          />
          <div className="flex justify-between items-center mt-2">
            <div className="flex items-center text-xs text-gray-500">
              <Bell className="w-3 h-3 mr-1" />
              <span>Others will be notified when you reply to their comments</span>
            </div>
            <button
              type="submit"
              disabled={!newComment.trim() || commentsLoading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4 mr-2" />
              Post Comment
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default CommentForm;