import axios from 'axios';
import type {
  User,
  Brand,
  Store,
  Video,
  VideoFrame,
  Inspection,
  Finding,
  ActionItem,
  LoginCredentials,
  AuthResponse,
  InspectionStats,
  Upload,
} from '@/types';
import type {
  MicroCheckRun,
  MicroCheckResponse,
  MicroCheckStreak,
  CorrectiveAction,
  SubmitResponseRequest,
  RunStatsResponse,
  MicroCheckTemplate,
} from '@/types/microCheck';

// Upload-specific types
export interface PresignedUrlRequest {
  filename: string;
  file_type: string;
  store_id: number;
  mode: 'enterprise' | 'coaching';
}

export interface PresignedUrlResponse {
  upload_id: number;
  presigned_url: string;
  s3_key: string;
  expires_at: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh/`, {
            refresh: refreshToken,
          });
          
          const { access } = response.data;
          localStorage.setItem('access_token', access);
          
          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post('/auth/login/', credentials);
    return response.data;
  },
  
  getProfile: async (): Promise<User> => {
    const response = await api.get('/auth/profile/');
    return response.data;
  },
  
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
};

// Users API
export const usersAPI = {
  getUsers: async (): Promise<User[]> => {
    const response = await api.get('/auth/users/');
    return response.data.results || response.data;
  },
  
  createUser: async (userData: Partial<User>): Promise<User> => {
    const response = await api.post('/auth/users/', userData);
    return response.data;
  },
  
  updateUser: async (id: number, userData: Partial<User>): Promise<User> => {
    const response = await api.patch(`/auth/users/${id}/`, userData);
    return response.data;
  },
  
  deleteUser: async (id: number): Promise<void> => {
    await api.delete(`/auth/users/${id}/`);
  },
};

// Brands API
export const brandsAPI = {
  getBrands: async (): Promise<Brand[]> => {
    const response = await api.get('/brands/');
    return response.data.results || response.data;
  },
  
  getBrand: async (id: number): Promise<Brand> => {
    const response = await api.get(`/brands/${id}/`);
    return response.data;
  },
  
  createBrand: async (brandData: Partial<Brand>): Promise<Brand> => {
    const response = await api.post('/brands/', brandData);
    return response.data;
  },
  
  updateBrand: async (id: number, brandData: Partial<Brand>): Promise<Brand> => {
    const response = await api.patch(`/brands/${id}/`, brandData);
    return response.data;
  },
  
  deleteBrand: async (id: number): Promise<void> => {
    await api.delete(`/brands/${id}/`);
  },
};

// Stores API
export const storesAPI = {
  getStores: async (params?: Record<string, any>): Promise<Store[]> => {
    const response = await api.get('/brands/stores/', { params });
    return response.data.results || response.data;
  },
  
  getStore: async (id: number): Promise<Store> => {
    const response = await api.get(`/brands/stores/${id}/`);
    return response.data;
  },
  
  createStore: async (storeData: Partial<Store>): Promise<Store> => {
    const response = await api.post('/brands/stores/', storeData);
    return response.data;
  },
  
  updateStore: async (id: number, storeData: Partial<Store>): Promise<Store> => {
    const response = await api.patch(`/brands/stores/${id}/`, storeData);
    return response.data;
  },
  
  deleteStore: async (id: number): Promise<void> => {
    await api.delete(`/brands/stores/${id}/`);
  },
};

// Videos API
export const videosAPI = {
  getVideos: async (params?: Record<string, any>): Promise<Video[]> => {
    const response = await api.get('/videos/', { params });
    return response.data.results || response.data;
  },
  
  getVideo: async (id: number): Promise<Video> => {
    const response = await api.get(`/videos/${id}/`);
    return response.data;
  },
  
  uploadVideo: async (formData: FormData): Promise<Video> => {
    const response = await api.post('/videos/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  updateVideo: async (id: number, videoData: Partial<Video>): Promise<Video> => {
    const response = await api.patch(`/videos/${id}/`, videoData);
    return response.data;
  },
  
  deleteVideo: async (id: number): Promise<void> => {
    await api.delete(`/videos/${id}/`);
  },
  
  reprocessVideo: async (id: number): Promise<{ message: string }> => {
    const response = await api.post(`/videos/${id}/reprocess/`);
    return response.data;
  },
  
  getVideoFrames: async (videoId: number): Promise<VideoFrame[]> => {
    const response = await api.get(`/videos/${videoId}/frames/`);
    return response.data.results || response.data;
  },

  getVideoInspection: async (videoId: number): Promise<Inspection | null> => {
    // Use the new method that fetches full inspection details with ai_analysis
    return await inspectionsAPI.getInspectionByVideo(videoId);
  },
};

// Uploads API (S3 presigned URL workflow)
export const uploadsAPI = {
  requestPresignedUrl: async (request: PresignedUrlRequest): Promise<PresignedUrlResponse> => {
    const response = await api.post('/uploads/request-presigned-url/', request);
    return response.data;
  },

  uploadToS3: async (presignedUrl: string, file: File): Promise<void> => {
    // Direct upload to S3 using presigned URL
    await axios.put(presignedUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
    });
  },

  confirmUpload: async (uploadId: number): Promise<Upload> => {
    const response = await api.post(`/uploads/confirm/${uploadId}/`);
    return response.data;
  },

  getUploads: async (params?: Record<string, any>): Promise<Upload[]> => {
    const response = await api.get('/uploads/', { params });
    return response.data.results || response.data;
  },

  getUpload: async (id: number): Promise<Upload> => {
    const response = await api.get(`/uploads/${id}/`);
    return response.data;
  },

  // Convenience method that handles the full upload flow
  uploadVideo: async (
    file: File,
    storeId: number,
    mode: 'enterprise' | 'coaching' = 'enterprise'
  ): Promise<Upload> => {
    // Step 1: Request presigned URL
    const { upload_id, presigned_url } = await uploadsAPI.requestPresignedUrl({
      filename: file.name,
      file_type: file.type,
      store_id: storeId,
      mode,
    });

    // Step 2: Upload directly to S3
    await uploadsAPI.uploadToS3(presigned_url, file);

    // Step 3: Confirm upload to trigger processing
    const upload = await uploadsAPI.confirmUpload(upload_id);

    return upload;
  },
};

// Inspections API
export const inspectionsAPI = {
  getInspections: async (params?: Record<string, any>): Promise<Inspection[]> => {
    const response = await api.get('/inspections/', { params });
    return response.data.results || response.data;
  },
  
  getInspection: async (id: number): Promise<Inspection> => {
    const response = await api.get(`/inspections/${id}/`);
    return response.data;
  },

  getInspectionByVideo: async (videoId: number): Promise<Inspection | null> => {
    try {
      // First get the list to find the inspection ID
      const inspections = await inspectionsAPI.getInspections({ video: videoId });
      if (inspections.length === 0) return null;

      // Then fetch the full inspection detail with ai_analysis
      const fullInspection = await inspectionsAPI.getInspection(inspections[0].id);
      return fullInspection;
    } catch (error) {
      console.error('Error fetching inspection by video:', error);
      return null;
    }
  },

  startInspection: async (videoId: number, mode: 'ENTERPRISE' | 'COACHING'): Promise<Inspection> => {
    const response = await api.post(`/inspections/start/${videoId}/`, { mode });
    return response.data;
  },
  
  getFindings: async (inspectionId: number, params?: Record<string, any>): Promise<Finding[]> => {
    const response = await api.get(`/inspections/${inspectionId}/findings/`, { params });
    return response.data.results || response.data;
  },
  
  getStats: async (): Promise<InspectionStats> => {
    const response = await api.get('/inspections/stats/');
    return response.data;
  },

  // Finding review methods (coaching mode)
  approveFinding: async (findingId: number): Promise<Finding> => {
    const response = await api.post(`/inspections/findings/${findingId}/approve/`);
    return response.data;
  },

  rejectFinding: async (findingId: number, reason?: string): Promise<Finding> => {
    const response = await api.post(`/inspections/findings/${findingId}/reject/`, { reason });
    return response.data;
  },

  createManualFinding: async (
    inspectionId: number,
    data: {
      category: Finding['category'];
      severity: Finding['severity'];
      title: string;
      description: string;
      frame_id?: number | null;
    }
  ): Promise<Finding> => {
    const response = await api.post(`/inspections/${inspectionId}/findings/create/`, data);
    return response.data;
  },
};

// Action Items API
export const actionItemsAPI = {
  getActionItems: async (params?: Record<string, any>): Promise<ActionItem[]> => {
    const response = await api.get('/inspections/actions/', { params });
    return response.data.results || response.data;
  },
  
  getActionItem: async (id: number): Promise<ActionItem> => {
    const response = await api.get(`/inspections/actions/${id}/`);
    return response.data;
  },
  
  createActionItem: async (actionData: Partial<ActionItem>): Promise<ActionItem> => {
    const response = await api.post('/inspections/actions/', actionData);
    return response.data;
  },
  
  updateActionItem: async (id: number, actionData: Partial<ActionItem>): Promise<ActionItem> => {
    const response = await api.patch(`/inspections/actions/${id}/`, actionData);
    return response.data;
  },
  
  deleteActionItem: async (id: number): Promise<void> => {
    await api.delete(`/inspections/actions/${id}/`);
  },
};

// Micro-Checks API
export const microCheckAPI = {
  // Get run by magic link token (no auth required)
  getRunByToken: async (token: string): Promise<MicroCheckRun> => {
    const response = await api.get('/micro-checks/runs/by_token/', {
      params: { token },
      headers: { Authorization: '' }, // Override auth for this request
    });
    return response.data;
  },

  // Submit response via magic link (no auth required)
  submitResponseViaToken: async (data: SubmitResponseRequest): Promise<MicroCheckResponse> => {
    const response = await api.post('/micro-checks/responses/submit_via_magic_link/', data, {
      headers: { Authorization: '' }, // Override auth for this request
    });
    return response.data;
  },

  // Get runs for a store (auth required)
  getRuns: async (storeId: number, status?: string): Promise<MicroCheckRun[]> => {
    const response = await api.get('/micro-checks/runs/', {
      params: { store: storeId, status },
    });
    return response.data.results || response.data;
  },

  // Get pending runs for a store (auth required)
  getPendingRuns: async (storeId: number): Promise<MicroCheckRun[]> => {
    const response = await api.get('/micro-checks/runs/pending/', {
      params: { store_id: storeId },
    });
    return response.data.results || response.data;
  },

  // Get run statistics (auth required)
  getRunStats: async (storeId: number): Promise<RunStatsResponse> => {
    const response = await api.get('/micro-checks/runs/stats/', {
      params: { store_id: storeId },
    });
    return response.data;
  },

  // Get responses (history) for a store (auth required)
  getResponses: async (storeId: number, params?: Record<string, any>): Promise<MicroCheckResponse[]> => {
    const response = await api.get('/micro-checks/responses/', {
      params: { store: storeId, ...params },
    });
    return response.data.results || response.data;
  },

  // Get responses by category (auth required)
  getResponsesByCategory: async (storeId: number, category: string): Promise<MicroCheckResponse[]> => {
    const response = await api.get('/micro-checks/responses/by_category/', {
      params: { store_id: storeId, category },
    });
    return response.data.results || response.data;
  },

  // Get streaks for a store (auth required)
  getStreaks: async (storeId: number): Promise<MicroCheckStreak[]> => {
    const response = await api.get('/micro-checks/streaks/', {
      params: { store: storeId },
    });
    return response.data.results || response.data;
  },

  // Get leaderboard (auth required)
  getLeaderboard: async (storeId: number): Promise<MicroCheckStreak[]> => {
    const response = await api.get('/micro-checks/streaks/leaderboard/', {
      params: { store_id: storeId },
    });
    return response.data;
  },

  // Get corrective actions (auth required)
  getCorrectiveActions: async (storeId?: number, params?: Record<string, any>): Promise<CorrectiveAction[]> => {
    const response = await api.get('/micro-checks/actions/', {
      params: { store: storeId, ...params },
    });
    return response.data.results || response.data;
  },

  // Get overdue actions (auth required)
  getOverdueActions: async (storeId?: number): Promise<CorrectiveAction[]> => {
    const response = await api.get('/micro-checks/actions/overdue/', {
      params: storeId ? { store_id: storeId } : undefined,
    });
    return response.data;
  },

  // Resolve corrective action (auth required)
  resolveAction: async (actionId: string, resolutionNotes: string): Promise<CorrectiveAction> => {
    const response = await api.post(`/micro-checks/actions/${actionId}/resolve/`, {
      resolution_notes: resolutionNotes,
    });
    return response.data;
  },

  // Upload photo (for authenticated submissions)
  uploadPhoto: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/micro-checks/media/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.s3_key;
  },

  // Create instant run for current user (auth required)
  createInstantRun: async (storeId?: number): Promise<{ run: MicroCheckRun; token: string; message: string }> => {
    const response = await api.post('/micro-checks/runs/create_instant_run/', {
      store_id: storeId,
    });
    return response.data;
  },

  // Template Management (ADMIN and OWNER only)

  // Get all templates with optional filtering
  getTemplates: async (params?: {
    category?: string;
    severity?: string;
    is_active?: boolean;
    brand?: number;
    is_local?: boolean;
    search?: string;
  }): Promise<MicroCheckTemplate[]> => {
    const response = await api.get('/micro-checks/templates/', { params });
    return response.data.results || response.data;
  },

  // Get single template by ID
  getTemplate: async (id: string): Promise<MicroCheckTemplate> => {
    const response = await api.get(`/micro-checks/templates/${id}/`);
    return response.data;
  },

  // Create new template (ADMIN only)
  createTemplate: async (data: Partial<MicroCheckTemplate>): Promise<MicroCheckTemplate> => {
    const response = await api.post('/micro-checks/templates/', data);
    return response.data;
  },

  // Update template (ADMIN only)
  updateTemplate: async (id: string, data: Partial<MicroCheckTemplate>): Promise<MicroCheckTemplate> => {
    const response = await api.patch(`/micro-checks/templates/${id}/`, data);
    return response.data;
  },

  // Delete template (ADMIN only)
  deleteTemplate: async (id: string): Promise<void> => {
    await api.delete(`/micro-checks/templates/${id}/`);
  },

  // Clone template (ADMIN and OWNER)
  cloneTemplate: async (id: string, title?: string): Promise<MicroCheckTemplate> => {
    const response = await api.post(`/micro-checks/templates/${id}/clone/`, { title });
    return response.data;
  },

  // Duplicate template (for coaching mode - converts PEAKOPS to LOCAL)
  duplicateTemplate: async (id: string, title?: string): Promise<MicroCheckTemplate> => {
    const response = await api.post(`/micro-checks/templates/${id}/duplicate/`, { title });
    return response.data;
  },

  // Archive template (ADMIN only) - soft delete
  archiveTemplate: async (id: string): Promise<MicroCheckTemplate> => {
    const response = await api.post(`/micro-checks/templates/${id}/archive/`);
    return response.data;
  },

  // Publish new version of template (ADMIN only)
  publishTemplate: async (id: string, updates: Partial<MicroCheckTemplate>): Promise<MicroCheckTemplate> => {
    const response = await api.post(`/micro-checks/templates/${id}/publish/`, updates);
    return response.data;
  },

  // Get version history for template (ADMIN and OWNER)
  getTemplateHistory: async (id: string): Promise<MicroCheckTemplate[]> => {
    const response = await api.get(`/micro-checks/templates/${id}/history/`);
    return response.data;
  },
};

export default api;