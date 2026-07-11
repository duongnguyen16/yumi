import { api } from './api';
import type { StoredUser } from './auth';

export interface AdminSubCategory {
  _id: string;
  categoryId: string;
  name: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminCategory {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  subcategories: AdminSubCategory[];
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  user: StoredUser;
  accessToken: string;
  refreshToken: string;
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/auth/login', { email, password });
  return res.data;
}

export async function listCategories(): Promise<AdminCategory[]> {
  const res = await api.get<AdminCategory[]>('/admin/categories');
  return res.data;
}

export async function createCategory(
  name: string,
  description?: string,
): Promise<AdminCategory> {
  const res = await api.post<AdminCategory>('/admin/categories', {
    name,
    description,
  });
  return res.data;
}

export async function updateCategory(
  id: string,
  data: { name?: string; description?: string },
): Promise<AdminCategory> {
  const res = await api.patch<AdminCategory>(`/admin/categories/${id}`, data);
  return res.data;
}

export async function setCategoryStatus(
  id: string,
  isActive: boolean,
): Promise<AdminCategory> {
  const res = await api.patch<AdminCategory>(
    `/admin/categories/${id}/status`,
    { isActive },
  );
  return res.data;
}

export async function createSubCategory(
  categoryId: string,
  name: string,
): Promise<AdminSubCategory> {
  const res = await api.post<AdminSubCategory>(
    `/admin/categories/${categoryId}/subcategories`,
    { name },
  );
  return res.data;
}

export async function updateSubCategory(
  categoryId: string,
  id: string,
  name: string,
): Promise<AdminSubCategory> {
  const res = await api.patch<AdminSubCategory>(
    `/admin/categories/${categoryId}/subcategories/${id}`,
    { name },
  );
  return res.data;
}

export async function setSubCategoryStatus(
  categoryId: string,
  id: string,
  isActive: boolean,
): Promise<AdminSubCategory> {
  const res = await api.patch<AdminSubCategory>(
    `/admin/categories/${categoryId}/subcategories/${id}/status`,
    { isActive },
  );
  return res.data;
}

export interface LocationRequestFlags {
  suspectedDuplicate: boolean;
  suspectedDuplicateLocationIds: string[];
  farPin: boolean;
}

export interface AdminLocationRequest {
  _id: string;
  type?: string;
  status: string;
  submittedBy?: { _id: string; fullName?: string; email?: string } | string;
  locationId?: { _id: string; name?: string; address?: string; status?: string } | string;
  newData?: Record<string, unknown>;
  oldData?: Record<string, unknown> | null;
  changedFields?: string[];
  imageUrls?: string[];
  isPotentialDuplicate?: boolean;
  suspectedDuplicateLocationIds?: string[];
  deviceDistanceMeters?: number | null;
  reviewerId?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  createdAt?: string;
  updatedAt?: string;
  flags?: LocationRequestFlags;
}

export interface LocationRequestQueueResponse {
  success: boolean;
  total: number;
  page: number;
  limit: number;
  items: AdminLocationRequest[];
}

export async function getLocationRequestQueue(
  page = 1,
  limit = 30,
): Promise<LocationRequestQueueResponse> {
  const res = await api.get<LocationRequestQueueResponse>(
    '/admin/location-requests/queue',
    { params: { page, limit } },
  );
  return res.data;
}

export async function approveLocationRequest(id: string): Promise<void> {
  await api.patch(`/admin/location-requests/${id}/approve`);
}

export async function rejectLocationRequest(
  id: string,
  reason: string,
  duplicateOfLocationId?: string,
): Promise<void> {
  await api.patch(`/admin/location-requests/${id}/reject`, {
    reason,
    duplicateOfLocationId,
  });
}

export interface ClaimEvidence {
  url: string;
  fileType: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  geo?: { type: 'Point'; coordinates: [number, number] };
  accuracyMeters?: number;
  capturedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface ClaimFlags {
  otpVerified: boolean;
  needsAdminScrutiny: boolean;
  hasOnSiteProof: boolean;
  hasSiteCode: boolean;
  hasLicense: boolean;
  eligibleForApprove: boolean;
}

export interface AdminClaim {
  _id: string;
  vendorId?:
    | { _id: string; fullName?: string; email?: string; phone?: string }
    | string;
  locationId?:
    | {
        _id: string;
        name?: string;
        address?: string;
        ownerId?: string | null;
        status?: string;
        phone?: string;
      }
    | string;
  type: string;
  evidenceFiles: ClaimEvidence[];
  licenseUrl?: string;
  otpVerified: boolean;
  otpVerifiedAt?: string;
  deviceDistanceMeters?: number;
  status: string;
  createdAt?: string;
  flags: ClaimFlags;
}

export interface ClaimQueueResponse {
  success: boolean;
  total: number;
  page: number;
  limit: number;
  items: AdminClaim[];
}

export interface ClaimActionResponse {
  success: boolean;
  message: string;
  routedToDispute?: boolean;
}

export async function getClaimQueue(
  page = 1,
  limit = 20,
): Promise<ClaimQueueResponse> {
  const res = await api.get<ClaimQueueResponse>('/admin/claims/queue', {
    params: { page, limit },
  });
  return res.data;
}

export async function approveClaim(
  id: string,
  reason?: string,
): Promise<ClaimActionResponse> {
  const res = await api.patch<ClaimActionResponse>(
    `/admin/claims/${id}/approve`,
    { reason },
  );
  return res.data;
}

export async function rejectClaim(
  id: string,
  reason: string,
): Promise<ClaimActionResponse> {
  const res = await api.patch<ClaimActionResponse>(
    `/admin/claims/${id}/reject`,
    { reason },
  );
  return res.data;
}

export async function requestClaimEvidence(
  id: string,
  message: string,
): Promise<ClaimActionResponse> {
  const res = await api.patch<ClaimActionResponse>(
    `/admin/claims/${id}/request-evidence`,
    { message },
  );
  return res.data;
}
