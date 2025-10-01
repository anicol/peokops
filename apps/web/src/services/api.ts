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

// Upload-specific types
export interface PresignedUrlRequest {
  filename: string;
  file_type: string;
  store_id: number;
  mode: 'inspection' | 'coaching';
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
    mode: 'inspection' | 'coaching' = 'inspection'
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

  startInspection: async (videoId: number, mode: 'INSPECTION' | 'COACHING'): Promise<Inspection> => {
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

export default api;