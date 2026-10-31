import {
  STUDENT_DOCUMENT_BUCKET,
  STUDENT_DOCUMENT_MAX_BYTES,
  STUDENT_DOCUMENT_MIME_TYPES,
} from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import type { StudentDocType, StudentVerificationState, StudentVerificationStatus } from '@/lib/types';

const SIGNED_URL_TTL_SECONDS = 3600;
const VALID_STATUSES: StudentVerificationStatus[] = ['unsubmitted', 'pending', 'verified', 'rejected'];

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-120);
}

export function validateStudentDocumentFile(file: File): string | null {
  if (!STUDENT_DOCUMENT_MIME_TYPES.includes(file.type)) return 'Upload a JPEG, PNG, WebP, or PDF file.';
  if (file.size > STUDENT_DOCUMENT_MAX_BYTES) return 'Files must be under 10 MB.';
  return null;
}

export async function fetchVerificationState(studentId: string, actorId: string): Promise<StudentVerificationState> {
  const { data, error } = await supabase.rpc('student_verification_state', {
    p_student_id: studentId,
    p_actor_id: actorId,
  });
  if (error) throw new Error(error.message);

  const state = data as Partial<StudentVerificationState> | null;
  if (!state || !VALID_STATUSES.includes(state.status as StudentVerificationStatus) || !Array.isArray(state.documents)) {
    throw new Error('Verification details could not be read.');
  }
  return state as StudentVerificationState;
}

export async function uploadStudentDocument(params: {
  studentId: string;
  file: File;
  docType: StudentDocType;
  title: string;
}): Promise<void> {
  const path = `${params.studentId}/${crypto.randomUUID()}/${safeFileName(params.file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from(STUDENT_DOCUMENT_BUCKET)
    .upload(path, params.file, { contentType: params.file.type, upsert: false });
  if (uploadError) throw new Error('The file could not be uploaded. Please try again.');

  const { error } = await supabase.rpc('student_submit_document', {
    p_user_id: params.studentId,
    p_doc_type: params.docType,
    p_title: params.title,
    p_storage_path: path,
    p_mime_type: params.file.type,
    p_size_bytes: params.file.size,
  });
  if (error) throw new Error(error.message);
}

export async function createDocumentUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(STUDENT_DOCUMENT_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error || !data) throw new Error('Documents could not be opened.');

  const urls: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
  }
  return urls;
}

export async function reviewStudentVerification(params: {
  studentId: string;
  actorId: string;
  action: 'verify' | 'reject';
  reason?: string;
}): Promise<void> {
  const { error } = await supabase.rpc('student_review_verification', {
    p_student_id: params.studentId,
    p_action: params.action,
    p_actor_id: params.actorId,
    p_reason: params.reason ?? null,
  });
  if (error) throw new Error(error.message);
}
