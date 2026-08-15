import React from 'react';
import { motion } from 'framer-motion';
import { 
  Reply, 
  Edit3, 
  Trash2,
  Bell,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

const RenderComment = React.memo(({ 
  comment, 
  depth = 0, 
  maxDepth = 5,
  replyingTo,
  replyContent,
  editingComment,
  editContent,
  highlightedComment,
  loadingReplies,
  replyPages,
  collapsedReplies,
  user,
  isAuthenticated,
  getUserInitials,
  getVisibleReplies,
  hasMoreReplies,
  startReply,
  canEditComment,
  startEdit,
  onDeleteComment,
  toggleRepliesVisibility,
  handleLoadMoreReplies,
  handleCreateReply,
  handleUpdateComment,
  handleReplyContentChange,
  handleEditContentChange,
  setReplyingTo,
  setEditingComment,
  replyTextareaRef,
  editTextareaRef,
  REPLIES_PER_PAGE
}) => {
  const getAvatarSize = (depth) => {
    if (depth === 0) return 'w-8 h-8';
    if (depth === 1) return 'w-6 h-6';
    if (depth === 2) return 'w-5 h-5';
    return 'w-4 h-4';
  };

  const getTextSize = (depth) => {
    if (depth === 0) return 'text-sm';
    if (depth === 1) return 'text-sm';
    return 'text-xs';
  };

  const getMarginLeft = (depth) => {
    if (depth === 0) return '';
    if (depth === 1) return 'ml-11';
    if (depth === 2) return 'ml-9';
    return 'ml-6';
  };

  const getAvatarColor = (depth) => {
    if (depth === 0) return 'bg-gray-500';
    if (depth === 1) return 'bg-gray-400';
    if (depth === 2) return 'bg-gray-300';
    return 'bg-gray-200';
  };

  // Prevent infinite nesting beyond maxDepth
  if (depth > maxDepth) return null;

  const visibleReplies = getVisibleReplies(comment.replies, comment.id);
  const hasMore = hasMoreReplies(comment.replies, comment.id);
  const isLoading = loadingReplies[comment.id];
  const isCollapsed = collapsedReplies[comment.id];
  const totalReplies = comment.replies?.length || 0;

  return (
    <div className={`${depth > 0 ? 'space-y-3' : ''}`}>
      <div 
        key={comment.id} 
        id={depth === 0 ? `comment-${comment.id}` : undefined}
        className={`${depth === 0 ? 'border-b border-gray-100 pb-6 last:border-b-0' : ''} transition-all duration-500 ${
          highlightedComment === comment.id 
            ? 'bg-blue-50 border-blue-200 rounded-lg p-4 -m-4' 
            : ''
        }`}
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className={`${getAvatarSize(depth)} ${getAvatarColor(depth)} rounded-full flex items-center justify-center`}>
              <span className={`text-white ${getTextSize(depth)} font-medium`}>
                {getUserInitials(comment.author)}
              </span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <span className={`font-medium text-gray-800 ${getTextSize(depth)}`}>
                {comment.author?.user_fullname || comment.author?.fullname || 'Unknown User'}
              </span>
              <span className="text-xs text-gray-500">
                {comment.author?.user_role && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    comment.author.user_role === 'teacher' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {comment.author.user_role}
                  </span>
                )}
              </span>
              <span className="text-xs text-gray-500">
                {format(new Date(comment.created_at), 'MMM d, yyyy')}
              </span>
            </div>
            
            {editingComment === comment.id ? (
              <form onSubmit={handleUpdateComment} className="mt-1">
                <textarea
                  ref={editTextareaRef}
                  value={editContent}
                  onChange={handleEditContentChange}
                  className={`w-full p-2 border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${getTextSize(depth)}`}
                  rows="2"
                />
                <div className="flex justify-end space-x-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setEditingComment(null)}
                    className={`px-2 py-1 text-gray-600 hover:text-gray-800 ${getTextSize(depth)}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 ${getTextSize(depth)}`}
                  >
                    Save
                  </button>
                </div>
              </form>
            ) : (
              <p className={`text-gray-700 ${getTextSize(depth)}`}>{comment.content}</p>
            )}
            
            <div className={`flex items-center space-x-3 mt-1`}>
              {/* Only show reply button if we haven't reached max depth */}
              {isAuthenticated && depth < maxDepth && (
                <button
                  onClick={() => startReply(comment.id)}
                  className={`${getTextSize(depth)} text-blue-600 hover:text-blue-800 flex items-center`}
                >
                  <Reply className={`${depth > 2 ? 'h-2.5 w-2.5' : 'h-3 w-3'} mr-1`} />
                  Reply
                  <Bell className={`${depth > 2 ? 'h-2.5 w-2.5' : 'h-3 w-3'} ml-1 text-gray-400`} title="Author will be notified" />
                </button>
              )}
              
              {/* Show replies toggle button */}
              {totalReplies > 0 && (
                <button
                  onClick={() => toggleRepliesVisibility(comment.id)}
                  className={`${getTextSize(depth)} text-gray-600 hover:text-gray-800 flex items-center`}
                >
                  <ChevronDown className={`${depth > 2 ? 'h-2.5 w-2.5' : 'h-3 w-3'} mr-1 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                  {isCollapsed ? `Show ${totalReplies} ${totalReplies === 1 ? 'reply' : 'replies'}` : 'Hide replies'}
                </button>
              )}
              
              {canEditComment(comment) && editingComment !== comment.id && (
                <>
                  <button
                    onClick={() => startEdit(comment.id, comment.content)}
                    className={`${getTextSize(depth)} text-gray-600 hover:text-gray-800 flex items-center`}
                  >
                    <Edit3 className={`${depth > 2 ? 'h-2.5 w-2.5' : 'h-3 w-3'} mr-1`} />
                    Edit
                  </button>
                  <button
                    onClick={() => onDeleteComment(comment.id)}
                    className={`${getTextSize(depth)} text-red-600 hover:text-red-800 flex items-center`}
                  >
                    <Trash2 className={`${depth > 2 ? 'h-2.5 w-2.5' : 'h-3 w-3'} mr-1`} />
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Reply Form */}
        {replyingTo === comment.id && (
          <motion.form 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreateReply} 
            className={`${getMarginLeft(depth + 1)} mt-2`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className={`${getAvatarSize(depth + 1)} bg-blue-500 rounded-full flex items-center justify-center`}>
                  <span className={`text-white ${getTextSize(depth + 1)} font-medium`}>
                    {getUserInitials(user)}
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <textarea
                  ref={replyTextareaRef}
                  value={replyContent}
                  onChange={handleReplyContentChange}
                  placeholder={`Reply to ${comment.author?.user_fullname || 'this comment'}...`}
                  className={`w-full p-2 border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${getTextSize(depth + 1)}`}
                  rows="2"
                  autoFocus
                />
                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center text-xs text-blue-600">
                    <Bell className="w-3 h-3 mr-1" />
                    <span>
                      {comment.author?.user_fullname || 'Author'} will be notified
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className={`px-2 py-1 text-gray-600 hover:text-gray-800 ${getTextSize(depth + 1)}`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!replyContent.trim()}
                      className={`px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 ${getTextSize(depth + 1)}`}
                    >
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.form>
        )}

        {/* Recursive Replies */}
        {visibleReplies.length > 0 && (
          <div className={`${getMarginLeft(depth + 1)} mt-4 space-y-3`}>
            {visibleReplies.map((reply) => (
              <RenderComment 
                key={reply.id} 
                comment={reply} 
                depth={depth + 1} 
                maxDepth={maxDepth}
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
            
            {/* Show More Replies Button */}
            {hasMore && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <button
                  onClick={() => handleLoadMoreReplies(comment.id)}
                  disabled={isLoading}
                  className="flex items-center px-3 py-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <ChevronDown className="h-3 w-3 mr-1" />
                  )}
                  {isLoading ? 'Loading...' : `Show ${Math.min(REPLIES_PER_PAGE, totalReplies - visibleReplies.length)} more ${totalReplies - visibleReplies.length === 1 ? 'reply' : 'replies'}`}
                </button>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

RenderComment.displayName = 'RenderComment';

export default RenderComment;