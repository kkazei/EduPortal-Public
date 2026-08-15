import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export const useCommentHandlers = ({
  isAuthenticated,
  user,
  comments,
  onCreateComment,
  onCreateReply,
  onUpdateComment,
  onDeleteComment
}) => {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState('');

  const handleCreateComment = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('Please log in to comment');
      return;
    }
    
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    
    try {
      await onCreateComment(newComment.trim());
      setNewComment('');
      toast.success('Comment posted successfully!');
    } catch (error) {
      toast.error('Failed to post comment');
    }
  };

  const handleCreateReply = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please log in to reply');
      return;
    }
    
    if (!replyContent.trim()) {
      toast.error('Please enter a reply');
      return;
    }
    
    try {
      const findParentComment = (commentId) => {
        const topLevelComment = comments.find(c => c.id === commentId);
        if (topLevelComment) return topLevelComment;
        
        const searchInReplies = (replies, parentComment) => {
          for (const reply of replies) {
            if (reply.id === commentId) return parentComment;
            if (reply.replies && reply.replies.length > 0) {
              const found = searchInReplies(reply.replies, parentComment);
              if (found) return found;
            }
          }
          return null;
        };

        for (const comment of comments) {
          if (comment.replies && comment.replies.length > 0) {
            const found = searchInReplies(comment.replies, comment);
            if (found) return found;
          }
        }
        return null;
      };
      
      const parentComment = findParentComment(replyingTo);
      await onCreateReply(replyingTo, replyContent.trim());
      setReplyContent('');
      setReplyingTo(null);
      
      const parentAuthor = parentComment?.author?.user_fullname || 'the author';
      
      toast.success(`Reply sent to ${parentAuthor}! 🚀`, {
        icon: '💬',
        duration: 3000
      });
    } catch (error) {
      console.error('Reply error:', error);
      toast.error('Failed to post reply');
    }
  };

  const handleUpdateComment = async (e) => {
    e.preventDefault();
    if (!editContent.trim()) {
      toast.error('Please enter content');
      return;
    }
    
    try {
      await onUpdateComment(editingComment, editContent.trim());
      setEditingComment(null);
      setEditContent('');
      toast.success('Comment updated successfully!');
    } catch (error) {
      toast.error('Failed to update comment');
    }
  };

  const startReply = useCallback((commentId) => {
    if (!isAuthenticated) {
      toast.error('Please log in to reply');
      return;
    }
    setReplyingTo(commentId);
    setReplyContent('');
  }, [isAuthenticated]);

  const startEdit = useCallback((commentId, currentContent) => {
    setEditingComment(commentId);
    setEditContent(currentContent);
  }, []);

  const canEditComment = useCallback((comment) => {
    return isAuthenticated && user && (user.id === comment.author?.id || user.role === 'admin');
  }, [isAuthenticated, user]);

  const handleNewCommentChange = useCallback((e) => {
    setNewComment(e.target.value);
  }, []);

  const handleReplyContentChange = useCallback((e) => {
    setReplyContent(e.target.value);
  }, []);

  const handleEditContentChange = useCallback((e) => {
    setEditContent(e.target.value);
  }, []);

  return {
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
  };
};