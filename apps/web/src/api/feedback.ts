import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface FeedbackOverviewParams {
  days?: number;
  store_id?: number;
  sources?: string;
}

export interface CreateFocusPeriodParams {
  theme_id: string;
  duration_weeks: number;
  frequency: string;
  templates: string[];
}

export const feedbackAPI = {
  getOverview: async (params: FeedbackOverviewParams = {}) => {
    const queryParams = new URLSearchParams();

    if (params.days) queryParams.append('days', params.days.toString());
    if (params.store_id) queryParams.append('store_id', params.store_id.toString());
    if (params.sources) queryParams.append('sources', params.sources);

    const response = await apiClient.get(`/integrations/feedback/overview/?${queryParams.toString()}`);
    return response.data;
  },

  createFocusPeriod: async (params: CreateFocusPeriodParams) => {
    const response = await apiClient.post('/integrations/feedback/focus/', params);
    return response.data;
  },
};
