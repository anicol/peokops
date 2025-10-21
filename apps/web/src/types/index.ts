export interface TrialStatus {
  is_trial: boolean;
  expires_at?: string;
  days_remaining?: number;
  hours_remaining?: number;
  is_expired?: boolean;
  videos_used?: number;
  videos_remaining?: number;
  stores_used?: number;
  stores_remaining?: number;
  reports_downloaded?: number;
  reports_remaining?: number;
  can_upload_video?: boolean;
  can_create_store?: boolean;
  can_download_report?: boolean;
  conversion_score?: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'OWNER' | 'GM' | 'INSPECTOR' | 'TRIAL_ADMIN';
  store: number | null;
  store_name?: string;
  brand_name?: string;
  brand_id?: number;
  phone: string;
  is_active: boolean;
  is_trial_user?: boolean;
  trial_status?: TrialStatus;
  has_seen_demo?: boolean;
  requested_demo?: boolean;
  demo_completed_at?: string;
  onboarding_completed_at?: string;
  hours_since_signup?: number;
  total_inspections?: number;
  created_at: string;
  last_active_at?: string;
}

export interface Brand {
  id: number;
  name: string;
  logo: string | null;
  description: string;
  industry?: string;
  inspection_config: Record<string, any>;
  retention_config: Record<string, any>;
  is_active: boolean;
  has_enterprise_access: boolean;
  stores_count: number;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: number;
  brand: number;
  brand_name: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  manager_email: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Video {
  id: number;
  uploaded_by: number;
  uploaded_by_name: string;
  store: number;
  store_name: string;
  title: string;
  description: string;
  file: string;
  thumbnail: string | null;
  duration: number | null;
  file_size: number | null;
  file_size_mb: number | null;
  status: 'UPLOADED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  error_message: string;
  metadata: Record<string, any>;
  frames?: VideoFrame[];
  mode: 'ENTERPRISE' | 'COACHING' | null;
  created_at: string;
  updated_at: string;
}

export interface VideoFrame {
  id: number;
  video: number;
  timestamp: number;
  frame_number: number;
  image: string;
  width: number;
  height: number;
  created_at: string;
}

export interface Inspection {
  id: number;
  video: number;
  video_title: string;
  store_name: string;
  mode: 'ENTERPRISE' | 'COACHING';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  assigned_inspector: number | null;
  inspector_notes: string;
  report_url: string;
  report_generated_at: string | null;
  overall_score: number | null;
  ppe_score: number | null;
  safety_score: number | null;
  cleanliness_score: number | null;
  food_safety_score: number | null;
  equipment_score: number | null;
  operational_score: number | null;
  food_quality_score: number | null;
  staff_behavior_score: number | null;
  uniform_score: number | null;
  menu_board_score: number | null;
  ai_analysis: Record<string, any>;
  error_message: string;
  expires_at: string | null;
  findings?: Finding[];
  action_items?: ActionItem[];
  findings_count: number;
  critical_findings_count: number;
  open_actions_count: number;
  created_at: string;
  updated_at: string;
}

export interface Finding {
  id: number;
  inspection: number;
  frame: number | null;
  frame_image: string | null;
  frame_timestamp: number | null;
  category: 'PPE' | 'SAFETY' | 'CLEANLINESS' | 'UNIFORM' | 'MENU_BOARD' | 'FOOD_SAFETY' | 'EQUIPMENT' | 'OPERATIONAL' | 'FOOD_QUALITY' | 'STAFF_BEHAVIOR' | 'OTHER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  confidence: number;
  bounding_box: Record<string, any> | null;
  recommended_action: string;
  is_resolved: boolean;
  // Consolidation fields
  affected_frame_count: number;
  first_timestamp: number | null;
  last_timestamp: number | null;
  average_confidence: number | null;
  // AI-generated action metadata
  estimated_minutes: number | null;
  // Manager review fields (for coaching mode)
  is_manual: boolean;
  is_approved: boolean;
  approved_by: number | null;
  approved_at: string | null;
  is_rejected: boolean;
  rejection_reason: string;
  rejected_by: number | null;
  rejected_at: string | null;
  created_by: number | null;
  created_at: string;
}

export interface ActionItem {
  id: number;
  inspection: number;
  finding: number | null;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED';
  assigned_to: number | null;
  assigned_to_name: string | null;
  due_date: string | null;
  completed_at: string | null;
  completed_by: number | null;
  completed_by_name: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface InspectionStats {
  // Basic stats (all users)
  total_inspections: number;
  completed_inspections: number;
  average_score: number | null;
  critical_findings: number;
  open_action_items: number;

  // Trial user stats
  streak_days?: number;
  runs_this_week?: number;
  runs_last_week?: number;
  issues_resolved_this_week?: number;
  yesterday_score?: number | null;
  today_score?: number | null;

  // Coaching mode stats
  avg_streak_across_stores?: number;
  total_stores?: number;
  active_stores_today?: number;
  top_performing_category?: string;
  top_category_improvement?: number;
  store_engagement?: Array<{
    store_id: number;
    store_name: string;
    completed_today: boolean;
    last_check?: string;
  }>;

  // Enterprise stats
  completion_rate?: number;
  template_coverage?: number;
  avg_resolution_time_days?: number;
  trend_data?: Array<{
    date: string;
    compliance: number;
  }>;
}

export interface Upload {
  id: number;
  store: number;
  mode: 'enterprise' | 'coaching';
  s3_key: string;
  status: 'uploaded' | 'processing' | 'complete' | 'failed';
  duration_s: number | null;
  original_filename: string;
  file_type: string;
  created_at: string;
  updated_at: string;
  created_by: number;
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  plan_type: 'TRIAL' | 'STARTER_COACHING' | 'PRO_COACHING' | 'ENTERPRISE';
  price_per_store: string;
  billing_period: 'MONTHLY' | 'ANNUAL';
  stripe_price_id: string;
  features: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: number;
  user: number;
  user_email: string;
  plan: number;
  plan_details: SubscriptionPlan;
  status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE' | 'UNPAID';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  store_count: number;
  trial_converted: boolean;
  is_active: boolean;
  days_until_renewal: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionStatus {
  has_subscription: boolean;
  is_trial: boolean;
  subscription?: Subscription;
  trial_status?: TrialStatus;
}