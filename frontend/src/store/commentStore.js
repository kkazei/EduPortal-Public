import { create } from "zustand";
import axios from "axios";

export const BASE_API_URL = import.meta.env.MODE === "development" ? "http://localhost:5000" : "";
export const API_URL = `${BASE_API_URL}/api/comments`;

axios.defaults.withCredentials = true;

export const useCommentStore = create((set, get) => ({
  // State
  comments: [],
  replies: {},
  isLoading: false,
  error: null,
  message: null,
  pagination: {
    count: 0,
    totalPages: 1,
    currentPage: 1
  },
  
  // Fetch comments for a specific announcement
  fetchCommentsByAnnouncement: async (announcementId, page = 1, limit = 20) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', limit);
      
      console.log('Fetching comments for announcement:', announcementId); // Add this debug log
      
      const response = await axios.get(`${API_URL}/announcement/${announcementId}?${params.toString()}`);
      
      console.log('Comments fetched:', response.data.data); // Add this debug log
      
      set({ 
        comments: response.data.data,
        pagination: {
          count: response.data.count,
          totalPages: response.data.totalPages,
          currentPage: response.data.currentPage
        },
        isLoading: false 
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching comments:', error);
      set({ error: error.response?.data?.message || 'Failed to fetch comments', isLoading: false });
      throw error;
    }
  },
  
  // Fetch replies for a specific comment
  fetchRepliesByComment: async (commentId, page = 1, limit = 10) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', limit);
      
      const response = await axios.get(`${API_URL}/${commentId}/replies?${params.toString()}`);
      
      // Store replies by comment ID
      set(state => ({
        replies: {
          ...state.replies,
          [commentId]: {
            data: response.data.data,
            pagination: {
              count: response.data.count,
              totalPages: response.data.totalPages,
              currentPage: response.data.currentPage
            }
          }
        },
        isLoading: false
      }));
      
      return response.data;
    } catch (error) {
      console.error('Error fetching replies:', error);
      set({ 
        error: error.response?.data?.message || "Failed to fetch replies", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Create a new comment
  createComment: async (announcementId, content) => {
    set({ isLoading: true, error: null });
    try {
      console.log('Creating comment:', { announcementId, content });
      
      const response = await axios.post(`${API_URL}/announcement/${announcementId}`, {
        content
      });
      
      console.log('Comment created successfully:', response.data);
      
      const newComment = response.data.data;
      
      // Add new comment to the beginning of the comments array
      set(state => ({ 
        comments: [newComment, ...state.comments],
        pagination: {
          ...state.pagination,
          count: state.pagination.count + 1
        },
        message: "Comment posted successfully",
        isLoading: false 
      }));
      
      return newComment;
    } catch (error) {
      console.error('Error creating comment:', error);
      set({ 
        error: error.response?.data?.message || "Failed to post comment", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Create a reply to a comment
  createReply: async (announcementId, parentCommentId, content) => {
    set({ isLoading: true, error: null });
    try {
      console.log('Creating reply:', { announcementId, parentCommentId, content });
      
      const response = await axios.post(`${API_URL}/announcement/${announcementId}`, {
        content,
        parent_comment_id: parentCommentId
      });
      
      console.log('Reply created successfully:', response.data);
      
      const newReply = response.data.data;
      
      // FIXED: Helper function to recursively update nested replies at ANY depth
      const updateNestedReplies = (comments) => {
        return comments.map(comment => {
          // If this is the direct parent comment
          if (comment.id === parentCommentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), newReply]
            };
          }
          
          // If this comment has replies, check recursively
          if (comment.replies && comment.replies.length > 0) {
            const updatedReplies = updateNestedReplies(comment.replies);
            // Check if any nested reply was updated
            const hasChanges = updatedReplies.some((reply, index) => 
              reply !== comment.replies[index]
            );
            
            if (hasChanges) {
              return {
                ...comment,
                replies: updatedReplies
              };
            }
          }
          
          return comment;
        });
      };
      
      // Update the comments with the new reply
      set(state => {
        const updatedComments = updateNestedReplies(state.comments);
        
        // Also update the replies object for direct parent comments
        const updatedReplies = { ...state.replies };
        if (updatedReplies[parentCommentId]) {
          updatedReplies[parentCommentId].data = [
            ...updatedReplies[parentCommentId].data,
            newReply
          ];
          updatedReplies[parentCommentId].pagination.count += 1;
        } else {
          // Check if parentCommentId is a top-level comment
          const isTopLevelComment = state.comments.some(c => c.id === parentCommentId);
          if (isTopLevelComment) {
            updatedReplies[parentCommentId] = {
              data: [newReply],
              pagination: { count: 1, totalPages: 1, currentPage: 1 }
            };
          }
        }
        
        return {
          replies: updatedReplies,
          comments: updatedComments,
          message: "Reply posted successfully",
          isLoading: false
        };
      });
      
      return newReply;
    } catch (error) {
      console.error('Error creating reply:', error);
      set({ 
        error: error.response?.data?.message || "Failed to post reply", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Update a comment
  updateComment: async (commentId, content) => {
    set({ isLoading: true, error: null });
    try {
      console.log('Updating comment:', { commentId, content });
      
      const response = await axios.put(`${API_URL}/${commentId}`, {
        content
      });
      
      console.log('Comment updated successfully:', response.data);
      
      const updatedComment = response.data.data;
      
      set(state => {
        // Update in comments array
        const updatedComments = state.comments.map(comment => {
          if (comment.id === commentId) {
            return updatedComment;
          }
          // Check if it's a reply in the comment's replies array
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map(reply => 
                reply.id === commentId ? updatedComment : reply
              )
            };
          }
          return comment;
        });
        
        // Update in replies object
        const updatedReplies = { ...state.replies };
        Object.keys(updatedReplies).forEach(parentId => {
          updatedReplies[parentId].data = updatedReplies[parentId].data.map(reply =>
            reply.id === commentId ? updatedComment : reply
          );
        });
        
        return {
          comments: updatedComments,
          replies: updatedReplies,
          message: "Comment updated successfully",
          isLoading: false
        };
      });
      
      return updatedComment;
    } catch (error) {
      console.error('Error updating comment:', error);
      set({ 
        error: error.response?.data?.message || "Failed to update comment", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Delete a comment (completely removes it)
  deleteComment: async (commentId) => {
    set({ isLoading: true, error: null });
    try {
      console.log('Deleting comment:', commentId);
      
      await axios.delete(`${API_URL}/${commentId}`);
      
      console.log('Comment deleted successfully');
      
      set(state => {
        // Remove from comments array
        const updatedComments = state.comments.filter(comment => {
          if (comment.id === commentId) return false;
          // Also remove from replies array if it exists
          if (comment.replies) {
            comment.replies = comment.replies.filter(reply => reply.id !== commentId);
          }
          return true;
        });
        
        // Remove from replies object
        const updatedReplies = { ...state.replies };
        Object.keys(updatedReplies).forEach(parentId => {
          updatedReplies[parentId].data = updatedReplies[parentId].data.filter(
            reply => reply.id !== commentId
          );
          // Update count after removing
          updatedReplies[parentId].pagination.count = updatedReplies[parentId].data.length;
        });
        
        // Remove the comment's own replies if it was a parent comment
        if (updatedReplies[commentId]) {
          delete updatedReplies[commentId];
        }
        
        // Update total count
        const deletedFromMain = state.comments.some(c => c.id === commentId);
        const newCount = deletedFromMain ? state.pagination.count - 1 : state.pagination.count;
        
        return {
          comments: updatedComments,
          replies: updatedReplies,
          pagination: {
            ...state.pagination,
            count: newCount
          },
          message: "Comment deleted successfully",
          isLoading: false
        };
      });
      
    } catch (error) {
      console.error('Error deleting comment:', error);
      set({ 
        error: error.response?.data?.message || "Failed to delete comment", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Load more comments (pagination)
  loadMoreComments: async (announcementId, page) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 20);
      
      const response = await axios.get(`${API_URL}/announcement/${announcementId}?${params.toString()}`);
      
      set(state => ({ 
        comments: [...state.comments, ...response.data.data],
        pagination: {
          count: response.data.count,
          totalPages: response.data.totalPages,
          currentPage: response.data.currentPage
        },
        isLoading: false 
      }));
      
      return response.data;
    } catch (error) {
      console.error('Error loading more comments:', error);
      set({ 
        error: error.response?.data?.message || "Failed to load more comments", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Load more replies for a specific comment
  loadMoreReplies: async (commentId, page) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10);
      
      const response = await axios.get(`${API_URL}/${commentId}/replies?${params.toString()}`);
      
      set(state => {
        const updatedReplies = { ...state.replies };
        if (updatedReplies[commentId]) {
          updatedReplies[commentId] = {
            data: [...updatedReplies[commentId].data, ...response.data.data],
            pagination: {
              count: response.data.count,
              totalPages: response.data.totalPages,
              currentPage: response.data.currentPage
            }
          };
        } else {
          updatedReplies[commentId] = {
            data: response.data.data,
            pagination: {
              count: response.data.count,
              totalPages: response.data.totalPages,
              currentPage: response.data.currentPage
            }
          };
        }
        
        return {
          replies: updatedReplies,
          isLoading: false
        };
      });
      
      return response.data;
    } catch (error) {
      console.error('Error loading more replies:', error);
      set({ 
        error: error.response?.data?.message || "Failed to load more replies", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Get comment count for an announcement
  getCommentCount: (announcementId) => {
    const state = get();
    return state.pagination.count;
  },
  
  // Get replies count for a comment
  getRepliesCount: (commentId) => {
    const state = get();
    return state.replies[commentId]?.pagination.count || 0;
  },
  
  // Clear comments (useful when navigating away from announcement)
  clearComments: () => {
    set({ 
      comments: [], 
      replies: {},
      pagination: { count: 0, totalPages: 1, currentPage: 1 },
      error: null,
      message: null
    });
  },
  
  // Clear messages
  clearMessages: () => {
    set({ error: null, message: null });
  },
  
  // Set loading state
  setLoading: (loading) => {
    set({ isLoading: loading });
  }
}));