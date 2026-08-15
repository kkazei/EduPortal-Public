import { create } from "zustand";
import axios from "axios";

export const BASE_API_URL = import.meta.env.MODE === "development" ? "http://localhost:5000" : "";
export const API_URL = `${BASE_API_URL}/api/announcements`;

axios.defaults.withCredentials = true;

export const useAnnouncementStore = create((set, get) => ({
  announcements: [],
  activeAnnouncements: [],
  currentAnnouncement: null,
  userAnnouncements: [],
  isLoading: false,
  error: null,
  message: null,
  pagination: {
    count: 0,
    totalPages: 1,
    currentPage: 1
  },
  
  // Updated utility function for Cloudinary URLs
  getFullImageUrl: (imageUrl) => {
    if (!imageUrl) return null;
    
    // If it's already a full URL (Cloudinary), return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // For backward compatibility with local images
    return imageUrl.startsWith('/') ? `${BASE_API_URL}${imageUrl}` : `${BASE_API_URL}/${imageUrl}`;
  },

  // Get count of active announcements for current user
  getActiveAnnouncementsCount: (userId) => {
    const { announcements } = get();
    return announcements.filter(announcement => 
      announcement.is_active && 
      (announcement.user_id === userId || announcement.created_by === userId)
    ).length;
  },

  // Get user's announcements (both active and inactive)
  getUserAnnouncements: (userId) => {
    const { announcements } = get();
    return announcements.filter(announcement => 
      announcement.user_id === userId || announcement.created_by === userId
    );
  },

  // Get user's active announcements only
  getUserActiveAnnouncements: (userId) => {
    const { announcements } = get();
    return announcements.filter(announcement => 
      announcement.is_active && 
      (announcement.user_id === userId || announcement.created_by === userId)
    );
  },
  
  // Fetch all announcements with optional filters
  fetchAnnouncements: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const { priority, target_audience, is_active, search, page = 1, user_id, limit = 5 } = filters;

      // Build query params
      const params = new URLSearchParams();
      if (priority) params.append('priority', priority);
      if (target_audience) params.append('target_audience', target_audience);
      if (is_active !== undefined) params.append('is_active', is_active);
      if (search) params.append('search', search);
      if (user_id !== undefined) params.append('user_id', user_id);
      
      params.append('page', page);
      params.append('limit', limit);
      
      const response = await axios.get(`${API_URL}?${params.toString()}`);
      set({ 
        announcements: response.data.data, 
        pagination: {
          count: response.data.count,
          totalPages: response.data.totalPages,
          currentPage: response.data.currentPage
        },
        isLoading: false 
      });
      
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch announcements", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Fetch active announcements for dashboard
  fetchActiveAnnouncements: async (audience = 'All') => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      params.append('audience', audience);
      
      const response = await axios.get(`${API_URL}/active?${params.toString()}`);
      set({ 
        activeAnnouncements: response.data.data, 
        isLoading: false 
      });
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch active announcements", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Get a specific announcement by ID
  fetchAnnouncementById: async (announcementId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/${announcementId}`);
      set({ 
        currentAnnouncement: response.data.data, 
        isLoading: false 
      });
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch announcement details", 
        isLoading: false 
      });
      throw error;
    }
  },

  // Fetch public announcement by ID (for public pages)
  fetchPublicAnnouncementById: async (announcementId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/public/${announcementId}`);
      set({ 
        currentAnnouncement: response.data.data, 
        isLoading: false 
      });
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch announcement details", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Get announcements by creator
  fetchAnnouncementsByCreator: async (userId, page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      
      const response = await axios.get(`${API_URL}/user/${userId}?${params.toString()}`);
      set({ 
        userAnnouncements: response.data.data,
        pagination: {
          count: response.data.count,
          totalPages: response.data.totalPages,
          currentPage: response.data.currentPage
        },
        isLoading: false 
      });
      return response.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch user announcements", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Create a new announcement with Cloudinary support
  createAnnouncement: async (announcementData) => {
    set({ isLoading: true, error: null, message: null });
    try {
      // If announcementData is already FormData, use it directly
      let formData;
      if (announcementData instanceof FormData) {
        formData = announcementData;
      } else {
        formData = new FormData();
        // Add basic announcement data
        formData.append('title', announcementData.title);
        formData.append('content', announcementData.content);
        formData.append('publish_date', announcementData.publish_date || new Date().toISOString());
        
        // Handle multiple images
        if (announcementData.images && Array.isArray(announcementData.images)) {
          announcementData.images.forEach(image => {
            formData.append('images', image);
          });
        }
      }
      
      const response = await axios.post(API_URL, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const newAnnouncement = response.data.data;
      
      set(state => ({ 
        announcements: [newAnnouncement, ...state.announcements],
        userAnnouncements: [newAnnouncement, ...state.userAnnouncements],
        message: "Announcement created successfully",
        isLoading: false 
      }));
      
      return newAnnouncement;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to create announcement", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Update an existing announcement with Cloudinary support
  updateAnnouncement: async (announcementId, announcementData) => {
    set({ isLoading: true, error: null, message: null });
    try {
      let formData;
      if (announcementData instanceof FormData) {
        formData = announcementData;
      } else {
        formData = new FormData();
        
        // Add basic announcement data
        if (announcementData.title) formData.append('title', announcementData.title);
        if (announcementData.content) formData.append('content', announcementData.content);
        if (announcementData.publish_date) formData.append('publish_date', announcementData.publish_date);
        if (announcementData.is_active !== undefined) formData.append('is_active', announcementData.is_active);
        
        // Add removed image IDs if any
        if (announcementData.removed_image_ids && announcementData.removed_image_ids.length) {
          formData.append('removed_image_ids', announcementData.removed_image_ids.join(','));
        }
        
        // Add new images if any
        if (announcementData.images && Array.isArray(announcementData.images)) {
          announcementData.images.forEach(image => {
            formData.append('images', image);
          });
        }
      }
      
      const response = await axios.put(`${API_URL}/${announcementId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const updatedAnnouncement = response.data.data;
      
      set(state => ({ 
        announcements: state.announcements.map(announcement => 
          announcement.id === updatedAnnouncement.id ? updatedAnnouncement : announcement
        ),
        userAnnouncements: state.userAnnouncements.map(announcement => 
          announcement.id === updatedAnnouncement.id ? updatedAnnouncement : announcement
        ),
        currentAnnouncement: state.currentAnnouncement?.id === updatedAnnouncement.id 
          ? updatedAnnouncement 
          : state.currentAnnouncement,
        message: "Announcement updated successfully",
        isLoading: false 
      }));
      
      return updatedAnnouncement;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to update announcement", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Delete an announcement (will also handle Cloudinary cleanup)
  deleteAnnouncement: async (announcementId) => {
    set({ isLoading: true, error: null, message: null });
    try {
      await axios.delete(`${API_URL}/${announcementId}`);
      
      set(state => ({ 
        announcements: state.announcements.filter(announcement => 
          announcement.id !== parseInt(announcementId)
        ),
        userAnnouncements: state.userAnnouncements.filter(announcement => 
          announcement.id !== parseInt(announcementId)
        ),
        currentAnnouncement: state.currentAnnouncement?.id === parseInt(announcementId) 
          ? null 
          : state.currentAnnouncement,
        message: "Announcement deleted successfully",
        isLoading: false 
      }));
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to delete announcement", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Toggle announcement active status
  toggleAnnouncementStatus: async (announcementId) => {
    set({ isLoading: true, error: null, message: null });
    try {
      const response = await axios.patch(`${API_URL}/${announcementId}/toggle`);
      const { is_active } = response.data.data;
      
      set(state => ({ 
        announcements: state.announcements.map(announcement => 
          announcement.id === parseInt(announcementId) 
            ? { ...announcement, is_active } 
            : announcement
        ),
        userAnnouncements: state.userAnnouncements.map(announcement => 
          announcement.id === parseInt(announcementId) 
            ? { ...announcement, is_active } 
            : announcement
        ),
        currentAnnouncement: state.currentAnnouncement?.id === parseInt(announcementId) 
          ? { ...state.currentAnnouncement, is_active }
          : state.currentAnnouncement,
        message: `Announcement ${is_active ? 'activated' : 'deactivated'} successfully`,
        isLoading: false 
      }));
      
      return is_active;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to toggle announcement status", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Fetch announcements for a specific adviser
  fetchAdviserAnnouncements: async (adviserId, filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      params.append('user_id', adviserId);
      params.append('is_active', 'true');
      params.append('page', filters.page || 1);
      params.append('limit', filters.limit || 10);
      
      if (filters.search) params.append('search', filters.search);
      
      const response = await axios.get(`${API_URL}?${params.toString()}`);
      set({ 
        announcements: response.data.data, 
        pagination: {
          count: response.data.count,
          totalPages: response.data.totalPages,
          currentPage: response.data.currentPage
        },
        isLoading: false 
      });
      return response.data.data;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || "Failed to fetch adviser announcements", 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Clear any error or success messages
  clearMessages: () => {
    set({ error: null, message: null });
  },
  
  // Clear the current selected announcement
  clearCurrentAnnouncement: () => {
    set({ currentAnnouncement: null });
  }
}));