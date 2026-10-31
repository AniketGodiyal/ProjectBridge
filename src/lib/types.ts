export type UserRole = 'student' | 'manager' | 'institute_admin' | 'platform_admin';

export type MembershipRole = 'student' | 'manager' | 'institute_admin';

export type VerificationStatus =
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'suspended'
  | 'active';

export type OperationalStatus = 'operational' | 'maintenance' | 'retired' | 'restricted';

export type BookingStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'waitlisted'
  | 'cancelled'
  | 'checked_in'
  | 'overdue'
  | 'return_pending'
  | 'completed'
  | 'disputed';

export type ReturnCondition = 'good' | 'minor_damage' | 'damaged';

export type IncidentStatus =
  | 'reported'
  | 'under_review'
  | 'awaiting_response'
  | 'resolved'
  | 'escalated';

export type IncidentType =
  | 'damage'
  | 'missing_accessories'
  | 'late_return'
  | 'safety'
  | 'unauthorized_use'
  | 'other';

export interface Organization {
  id: string;
  name: string;
  org_type: string;
  city: string | null;
  state: string | null;
  website: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  description: string | null;
  proposed_admin_email: string | null;
  verification_status: VerificationStatus;
  timezone: string;
  working_hours: Record<string, unknown>;
  booking_rules: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  user_id: string;
  organization_id: string;
  role: MembershipRole;
  status: 'pending' | 'active' | 'suspended' | 'left';
  joined_at: string;
  created_at: string;
  organization?: Organization;
}

export interface Department {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  head_user_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lab {
  id: string;
  organization_id: string;
  department_id: string | null;
  name: string;
  location: string | null;
  description: string | null;
  capacity: number;
  opening_hours: Record<string, unknown>;
  manager_user_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  department?: Department;
}

export interface Resource {
  id: string;
  organization_id: string;
  lab_id: string | null;
  department_id: string | null;
  name: string;
  category: string;
  description: string | null;
  quantity: number;
  available_quantity: number;
  operational_status: OperationalStatus;
  specifications: Record<string, string>;
  access_rules: Record<string, string>;
  required_training: string[];
  supervision_required: boolean;
  booking_duration_minutes: number | null;
  is_published: boolean;
  owner_user_id: string | null;
  image_url: string | null;
  price_per_hour: number | null;
  created_at: string;
  updated_at: string;
  organization?: Organization;
  lab?: Lab;
}

export interface AvailabilityRule {
  id: string;
  resource_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  resource_id: string;
  user_id: string;
  organization_id: string;
  purpose: string | null;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  rejection_reason: string | null;
  approval_user_id: string | null;
  approved_at: string | null;
  checkin_at: string | null;
  checkout_at: string | null;
  return_condition: ReturnCondition | null;
  initial_condition: ReturnCondition | null;
  return_notes: string | null;
  return_submitted_at: string | null;
  damage_flagged: boolean;
  return_photo_paths: string[];
  created_at: string;
  updated_at: string;
  resource?: Resource;
  organization?: Organization;
}

export interface CheckinEvent {
  id: string;
  booking_id: string;
  event_type: 'checkin' | 'checkout';
  condition_notes: string | null;
  accessories: string | null;
  performed_by: string;
  performed_at: string;
}

export interface Incident {
  id: string;
  booking_id: string | null;
  resource_id: string | null;
  organization_id: string;
  reported_by: string;
  incident_type: IncidentType;
  description: string;
  status: IncidentStatus;
  resolution_notes: string | null;
  reviewer_id: string | null;
  created_at: string;
  updated_at: string;
  resource?: Resource;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface SavedProject {
  id: string;
  user_id: string;
  organization_id: string | null;
  title: string;
  description: string | null;
  input_data: ProjectPlannerInput;
  plan_data: ProjectPlan;
  matches_data: MatchResult[];
  created_at: string;
  updated_at: string;
}

export interface ProjectPlannerInput {
  title: string;
  description: string;
  budget?: number;
  experienceLevel?: string;
  complexity?: string;
  deadline?: string;
  existingEquipment?: string;
  desiredCapabilities?: string;
  constraints?: string;
}

export interface ProjectRequirement {
  name: string;
  category: string;
  quantity: number;
  importance: 'essential' | 'optional';
  purpose: string;
  specifications: string[];
  estimated_cost_inr?: { min: number; max: number };
  safety_notes: string[];
  alternatives: string[];
  confidence: 'low' | 'medium' | 'high';
}

export interface ProjectPlan {
  project_title: string;
  project_summary: string;
  assumptions: string[];
  clarification_questions: string[];
  requirements: ProjectRequirement[];
  software_requirements: string[];
  skills_and_training: string[];
  estimated_total_budget_inr?: { min: number; max: number };
  limitations: string[];
}

export type MatchStatus =
  | 'MATCH_FOUND'
  | 'MATCH_FOUND_REQUIRES_APPROVAL'
  | 'MATCH_FOUND_AVAILABILITY_UNVERIFIED'
  | 'MATCH_FOUND_BUT_UNAVAILABLE'
  | 'PARTIAL_MATCH'
  | 'NO_MATCH_FOUND'
  | 'MANUAL_REVIEW_REQUIRED';

export interface MatchResult {
  requirementName: string;
  status: MatchStatus;
  reason: string;
  resource?: Resource;
  matchingSpecs: string[];
  unverifiedSpecs: string[];
}

export type StudentDocType = 'institution_id' | 'certificate' | 'training_record';

export type StudentVerificationStatus = 'unsubmitted' | 'pending' | 'verified' | 'rejected';

export interface StudentDocument {
  id: string;
  doc_type: StudentDocType;
  title: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: string;
}

export interface StudentVerificationState {
  status: StudentVerificationStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  documents: StudentDocument[];
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  organization_id: string | null;
  resource_id: string | null;
  booking_id: string | null;
  before_value: Record<string, unknown> | null;
  after_value: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
}
