import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export const useReplyPagination = (initialRepliesShown, repliesPerPage) => {
  const [loadingReplies, setLoadingReplies] = useState({});
  const [replyPages, setReplyPages] = useState({});
  const [collapsedReplies, setCollapsedReplies] = useState({});

  const handleLoadMoreReplies = async (commentId) => {
    setLoadingReplies(prev => ({ ...prev, [commentId]: true }));
    
    try {
      const currentPage = replyPages[commentId] || 0;
      setReplyPages(prev => ({ ...prev, [commentId]: currentPage + 1 }));
    } catch (error) {
      console.error('Error loading more replies:', error);
      toast.error('Failed to load more replies');
    } finally {
      setLoadingReplies(prev => ({ ...prev, [commentId]: false }));
    }
  };

  const toggleRepliesVisibility = useCallback((commentId) => {
    setCollapsedReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  }, []);

  const getVisibleReplies = useCallback((replies, commentId) => {
    if (!replies || replies.length === 0) return [];
    
    const currentPage = replyPages[commentId] || 0;
    const isCollapsed = collapsedReplies[commentId];
    
    if (isCollapsed) return [];
    
    if (currentPage === 0) {
      return replies.slice(0, initialRepliesShown);
    }
    
    const totalToShow = initialRepliesShown + (currentPage * repliesPerPage);
    return replies.slice(0, totalToShow);
  }, [replyPages, collapsedReplies, initialRepliesShown, repliesPerPage]);

  const hasMoreReplies = useCallback((replies, commentId) => {
    if (!replies || replies.length === 0) return false;
    
    const currentPage = replyPages[commentId] || 0;
    const totalShown = initialRepliesShown + (currentPage * repliesPerPage);
    return replies.length > totalShown;
  }, [replyPages, initialRepliesShown, repliesPerPage]);

  return {
    loadingReplies,
    replyPages,
    collapsedReplies,
    handleLoadMoreReplies,
    toggleRepliesVisibility,
    getVisibleReplies,
    hasMoreReplies
  };
};