import type {
  BookingStatus,
  IncidentStatus,
  OperationalStatus,
  ReturnCondition,
  StudentDocType,
  StudentVerificationStatus,
  VerificationStatus,
} from './types';

export const RESOURCE_CATEGORIES = [
  'electronics',
  'robotics',
  'computing',
  'photography',
  'fabrication',
  'testing',
  'space',
  'tools',
  'other',
] as const;

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  waitlisted: 'Waitlisted',
  cancelled: 'Cancelled',
  checked_in: 'Checked In',
  overdue: 'Overdue',
  return_pending: 'Return Pending',
  completed: 'Completed',
  disputed: 'Disputed',
};

export const BOOKING_STATUS_COLORS: Record<BookingStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  waitlisted: 'bg-sky-100 text-sky-800 border-sky-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
  checked_in: 'bg-blue-100 text-blue-800 border-blue-200',
  overdue: 'bg-orange-100 text-orange-800 border-orange-200',
  return_pending: 'bg-teal-100 text-teal-800 border-teal-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  disputed: 'bg-rose-100 text-rose-800 border-rose-200',
};

export const RETURN_CONDITIONS: { value: ReturnCondition; label: string; description: string }[] = [
  { value: 'good', label: 'Good', description: 'Works as expected, no visible wear' },
  { value: 'minor_damage', label: 'Minor damage', description: 'Cosmetic wear or a small issue, still usable' },
  { value: 'damaged', label: 'Damaged', description: 'Broken, missing parts, or unsafe to use' },
];

export const RETURN_CONDITION_LABELS: Record<ReturnCondition, string> = {
  good: 'Good',
  minor_damage: 'Minor damage',
  damaged: 'Damaged',
};

export const RETURN_PHOTO_BUCKET = 'return-photos';

export const STUDENT_DOCUMENT_BUCKET = 'student-documents';
export const STUDENT_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
export const STUDENT_DOCUMENT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export const STUDENT_DOCUMENT_TYPES: { value: StudentDocType; label: string; description: string }[] = [
  { value: 'institution_id', label: 'Institution ID', description: 'Your current student ID card' },
  { value: 'certificate', label: 'Certificate', description: 'Course or safety certificate' },
  { value: 'training_record', label: 'Training record', description: 'Proof of completed lab training' },
];

export const STUDENT_DOCUMENT_TYPE_LABELS: Record<StudentDocType, string> = {
  institution_id: 'Institution ID',
  certificate: 'Certificate',
  training_record: 'Training record',
};

export const STUDENT_VERIFICATION_STATUS_LABELS: Record<StudentVerificationStatus, string> = {
  unsubmitted: 'Not submitted',
  pending: 'Pending review',
  verified: 'Verified',
  rejected: 'Rejected',
};

export const STUDENT_VERIFICATION_STATUS_COLORS: Record<StudentVerificationStatus, string> = {
  unsubmitted: 'bg-gray-100 text-gray-700 border-gray-200',
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  verified: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
};

export const RETURN_CONDITION_COLORS: Record<ReturnCondition, string> = {
  good: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  minor_damage: 'bg-amber-100 text-amber-800 border-amber-200',
  damaged: 'bg-red-100 text-red-800 border-red-200',
};

export const OPERATIONAL_STATUS_LABELS: Record<OperationalStatus, string> = {
  operational: 'Operational',
  maintenance: 'Under Maintenance',
  retired: 'Retired',
  restricted: 'Restricted',
};

export const OPERATIONAL_STATUS_COLORS: Record<OperationalStatus, string> = {
  operational: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  maintenance: 'bg-amber-100 text-amber-800 border-amber-200',
  retired: 'bg-gray-100 text-gray-600 border-gray-200',
  restricted: 'bg-red-100 text-red-800 border-red-200',
};

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  reported: 'Reported',
  under_review: 'Under Review',
  awaiting_response: 'Awaiting Response',
  resolved: 'Resolved',
  escalated: 'Escalated',
};

export const INCIDENT_STATUS_COLORS: Record<IncidentStatus, string> = {
  reported: 'bg-amber-100 text-amber-800 border-amber-200',
  under_review: 'bg-blue-100 text-blue-800 border-blue-200',
  awaiting_response: 'bg-orange-100 text-orange-800 border-orange-200',
  resolved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  escalated: 'bg-rose-100 text-rose-800 border-rose-200',
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  pending: 'Pending Verification',
  verified: 'Verified',
  rejected: 'Rejected',
  suspended: 'Suspended',
  active: 'Active',
};

export const VERIFICATION_STATUS_COLORS: Record<VerificationStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  verified: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  suspended: 'bg-orange-100 text-orange-800 border-orange-200',
  active: 'bg-blue-100 text-blue-800 border-blue-200',
};

export const ORG_TYPES = [
  'university',
  'college',
  'research_institute',
  'school',
  'community_org',
  'corporate',
  'other',
];

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function formatDateTime(iso: string, timezone?: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timezone || 'Asia/Kolkata',
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

export function formatDate(iso: string, timezone?: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeZone: timezone || 'Asia/Kolkata',
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleDateString();
  }
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}
