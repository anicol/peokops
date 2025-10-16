// Micro-Check Types matching backend models

export type MicroCheckCategory =
  | 'PPE'
  | 'SAFETY'
  | 'CLEANLINESS'
  | 'FOOD_HANDLING'
  | 'EQUIPMENT'
  | 'WASTE_MANAGEMENT'
  | 'PEST_CONTROL'
  | 'STORAGE'
  | 'DOCUMENTATION'
  | 'FACILITY';

export type MicroCheckSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type RunStatus = 'PENDING' | 'COMPLETED' | 'EXPIRED';

export type ResponseStatus = 'PASS' | 'FAIL' | 'SKIPPED';

export type DeliveryMethod = 'SMS' | 'EMAIL' | 'WHATSAPP';

export type AssignmentStatus = 'PENDING' | 'SENT' | 'ACCESSED' | 'COMPLETED' | 'FAILED' | 'EXPIRED';

export type SkipReason = 'NOT_APPLICABLE' | 'EQUIPMENT_UNAVAILABLE' | 'AREA_CLOSED' | 'OTHER';

export type PhotoRequiredReason = 'ALWAYS' | 'NEVER' | 'FIRST_TIME' | 'AFTER_FAIL' | 'RANDOM_10';

export type TemplateSource = 'PEAKOPS' | 'LOCAL';

export interface TemplateUsageStats {
  times_used: number;
  pass_rate: number | null;
}

export interface MicroCheckTemplate {
  id: string;
  brand: number | null;
  category: MicroCheckCategory;
  category_display: string;
  severity: MicroCheckSeverity;
  severity_display: string;
  title: string;
  description: string;
  success_criteria: string; // What "PASS" looks like

  // Source
  source: TemplateSource; // PEAKOPS = starter templates, LOCAL = user-created/customized

  // Versioning
  version: number;
  parent_template: string | null;

  // Requirements
  default_photo_required: boolean;
  default_video_required: boolean;
  expected_completion_seconds: number;

  // AI (future)
  ai_validation_enabled: boolean;
  ai_validation_prompt: string;

  // Lifecycle & Selection
  is_active: boolean;
  is_local: boolean;
  include_in_rotation: boolean;
  rotation_priority: number;
  visual_reference_image: string | null;

  // Usage statistics
  usage_stats?: TemplateUsageStats;

  // Audit
  created_at: string;
  created_by: number;
  created_by_name: string;
  updated_at: string;
  updated_by: number | null;
}

export interface MicroCheckRunItem {
  id: string;
  run: string;
  template: string;
  template_title: string;
  template_description?: string; // From template, not snapshot
  template_reference_image?: string; // URL to reference image
  order: number;
  photo_required: boolean;
  photo_required_reason: PhotoRequiredReason;
  photo_required_reason_display: string;
  template_version: number;
  title_snapshot: string;
  category_snapshot: MicroCheckCategory;
  severity_snapshot: MicroCheckSeverity;
  success_criteria_snapshot: string; // What the backend actually has
}

export interface MicroCheckRun {
  id: string;
  store: number;
  store_name: string;
  scheduled_for: string;
  sequence: number;
  store_timezone: string;
  retention_policy: string;
  retention_policy_display: string;
  expires_at: string;
  status: RunStatus;
  status_display: string;
  completed_at: string | null;
  completed_by: number | null;
  completed_by_name: string | null;
  items: MicroCheckRunItem[];
  completed_item_ids: string[]; // IDs of run_items that already have responses
  completed_count: number; // Count of completed items
  magic_link_token?: string;
  created_at: string;
  created_by: number | null;
  updated_at: string;
  updated_by: number | null;
}

export interface MicroCheckAssignment {
  id: string;
  run: string;
  run_details: MicroCheckRun;
  manager: number;
  manager_name: string;
  manager_email: string;
  token_hash: string;
  delivery_method: DeliveryMethod;
  delivery_method_display: string;
  sent_at: string | null;
  first_accessed_at: string | null;
  completed_at: string | null;
  access_count: number;
  last_access_ip: string | null;
  expires_at: string;
  status: AssignmentStatus;
  status_display: string;
  created_at: string;
  created_by: number | null;
  updated_at: string;
  updated_by: number | null;
}

export interface MediaAsset {
  id: string;
  store: number;
  s3_key: string;
  s3_bucket: string;
  file_size_bytes: number;
  mime_type: string;
  sha256: string;
  retention_policy: string;
  retention_policy_display: string;
  expires_at: string;
  uploaded_at: string;
  uploaded_by: number;
  uploaded_by_name: string;
}

export interface MicroCheckResponse {
  id: string;
  run_item: string;
  run_item_details?: MicroCheckRunItem;
  run: string;
  assignment: string | null;
  template: string;
  store: number;
  store_name: string;
  category: MicroCheckCategory;
  category_display: string;
  severity_snapshot: MicroCheckSeverity;
  severity_display: string;
  status: ResponseStatus;
  status_display: string;
  notes: string;
  skip_reason: SkipReason | '';
  skip_reason_display: string;
  skip_reason_detail: string;
  media: string | null; // MediaAsset ID (for writing)
  media_url: string | null; // Presigned S3 URL (for reading/display)
  completed_by: number | null;
  completed_by_name: string;
  completed_at: string;
  local_completed_date: string;
  completion_seconds: number | null;
  override_reason: string;
  overridden_by: number | null;
  overridden_at: string | null;
  created_at: string;
  created_by: number | null;
  updated_at: string;
  updated_by: number | null;
}

export interface CheckCoverage {
  id: string;
  store: number;
  store_name: string;
  template: string;
  template_title: string;
  category: MicroCheckCategory;
  category_display: string;
  last_used_date: string;
  times_used: number;
  last_response_status: ResponseStatus | null;
  consecutive_passes: number;
  consecutive_fails: number;
  created_at: string;
  updated_at: string;
}

export interface MicroCheckStreak {
  id: string;
  store: number;
  store_name: string;
  manager: number;
  manager_name: string;
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
  total_completed: number;
  total_passed: number;
  total_failed: number;
  total_skipped: number;
  created_at: string;
  updated_at: string;
}

export type CorrectiveActionStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'VERIFIED' | 'DISMISSED';
export type CorrectiveActionCreatedFrom = 'MICRO_CHECK' | 'MANUAL' | 'AI_DETECTED';

export interface CorrectiveAction {
  id: string;
  response: string;
  response_details?: MicroCheckResponse;
  store: number;
  store_name: string;
  category: MicroCheckCategory;
  category_display: string;
  status: CorrectiveActionStatus;
  due_at: string | null;
  assigned_to: number | null;
  assigned_to_name: string;
  before_media: string | null;
  after_media: string | null;
  resolved_at: string | null;
  resolved_by: number | null;
  resolved_by_name: string;
  resolution_notes: string;
  fixed_during_session: boolean;
  created_from: CorrectiveActionCreatedFrom;
  verified_at: string | null;
  verification_confidence: number | null;
  created_at: string;
  created_by: number | null;
  updated_at: string;
  updated_by: number | null;
}

// Request/Response types for API calls

export interface SubmitResponseRequest {
  token?: string; // For magic link submissions
  run_item: string;
  status: ResponseStatus;
  notes?: string;
  skip_reason?: SkipReason;
  photo?: File | string; // File for upload or base64 string (deprecated - use media instead)
  media?: string; // MediaAsset ID
}

export interface RunStatsResponse {
  total: number;
  completed: number;
  pending: number;
  expired: number;
  completion_rate: number;
}

export interface LeaderboardResponse {
  streaks: MicroCheckStreak[];
}

export interface OverdueActionsResponse {
  actions: CorrectiveAction[];
}

export interface CreateRunErrorResponse {
  error: 'NO_TEMPLATES' | string;
  message: string;
  user_role: string;
  can_configure: boolean;
}

// Frontend-specific types for UI state

export interface CheckResult {
  runItemId: string;
  status: ResponseStatus;
  photo?: string;
  notes?: string;
  timestamp: string;
}

export interface CheckSession {
  run: MicroCheckRun;
  currentCheckIndex: number;
  results: CheckResult[];
  startTime: number;
  token: string;
}
