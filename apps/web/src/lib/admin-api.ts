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
  const res = await api.post<Record<string, unknown>>('/auth/login', { email, password });
  // API returns userData but client expects user — normalize
  const raw = res.data as Record<string, unknown>;
  return {
    success: !!raw.success,
    user: raw.userData as StoredUser,
    accessToken: raw.accessToken as string,
    refreshToken: raw.refreshToken as string,
    message: raw.message as string | undefined,
  };
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

/* ───── Report types ───── */

export type ReportReason =
  | 'INCORRECT_INFORMATION'
  | 'SPAM'
  | 'PERMANENTLY_CLOSED'
  | 'WRONG_OWNER'
  | 'OTHER';

export type ReportTargetType = 'LOCATION' | 'REVIEW' | 'USER' | 'OWNERSHIP';

export type ReportStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'DISMISSED'
  | 'APPEALED'
  | 'RESOLVED';

export type ReportRoute = 'STANDARD_REVIEW' | 'OWNERSHIP_REVIEW';

export interface ReportEvidenceFile {
  url: string;
  fileType: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  geo?: { type: 'Point'; coordinates: [number, number] };
  accuracyMeters?: number;
  capturedAt?: string;
}

export interface AdminReport {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description: string;
  evidenceFiles: ReportEvidenceFile[];
  route: ReportRoute;
  status: ReportStatus;
  affectedVendorId: string | null;
  resultReason: string | null;
  resolvedAt: string | null;
  createdAt: string;
  reporter: { id: string; fullName: string; email: string } | null;
  handledBy: { id: string; fullName: string; email: string } | null;
}

export interface ReportListResponse {
  success: boolean;
  data: AdminReport[];
  total: number;
  page: number;
  limit: number;
}

export interface ReportActionResponse {
  success: boolean;
  message: string;
  report: {
    id: string;
    status: ReportStatus;
    handledBy: string;
    resultReason: string;
    resolvedAt: string;
  };
}

export async function listReports(
  page = 1,
  limit = 20,
): Promise<ReportListResponse> {
  const res = await api.get<ReportListResponse>('/admin/reports', {
    params: { page, limit },
  });
  return res.data;
}

export async function resolveReport(
  id: string,
  resultReason: string,
  removeReviewId?: string,
): Promise<ReportActionResponse> {
  const res = await api.post<ReportActionResponse>(`/admin/reports/${id}/resolve`, {
    resultReason,
    ...(removeReviewId ? { removeReviewId } : {}),
  });
  return res.data;
}

export async function dismissReport(
  id: string,
  resultReason: string,
): Promise<ReportActionResponse> {
  const res = await api.post<ReportActionResponse>(`/admin/reports/${id}/dismiss`, {
    resultReason,
  });
  return res.data;
}

// ─── Admin User Management (F31) ────────────────────────────────

export interface AdminUser {
  _id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  phone?: string;
  phoneVerified: boolean;
  avatarUrl?: string;
  trustScore: number;
  trustLevel: string;
  createdAt: string;
  updatedAt: string;
}

export async function listUsers(): Promise<AdminUser[]> {
  const res = await api.get<{ success: boolean; users: AdminUser[] }>(
    '/admin/users',
  );
  return res.data.users;
}

export async function getUserDetail(id: string): Promise<AdminUser> {
  const res = await api.get<{ success: boolean; user: AdminUser }>(
    `/admin/users/${id}`,
  );
  return res.data.user;
}

export async function updateUserStatus(
  id: string,
  status: string,
  reason?: string,
): Promise<AdminUser> {
  const res = await api.patch<{ success: boolean; user: AdminUser }>(
    `/admin/users/${id}/status`,
    { status, reason },
  );
  return res.data.user;
}

export async function updateUserRole(
  id: string,
  role: string,
  reason?: string,
): Promise<AdminUser> {
  const res = await api.patch<{ success: boolean; user: AdminUser }>(
    `/admin/users/${id}/role`,
    { role, reason },
  );
  return res.data.user;
}

export async function adjustUserTrust(
  id: string,
  pointChange: number,
  reason?: string,
): Promise<{ trustScore: number; trustLevel: string }> {
  const res = await api.patch<{
    success: boolean;
    trustScore: number;
    trustLevel: string;
  }>(`/admin/users/${id}/trust`, { pointChange, reason });
  return res.data;
}

/* ── Dashboard ─────────────────────────────────────────── */

export interface AuditLogEntry {
  _id: string;
  actorId: { _id: string; fullName: string; email: string };
  action: string;
  targetCollection: string;
  targetId: string;
  reason?: string;
  diff?: Record<string, unknown>;
  createdAt: string;
}

export interface DashboardOverview {
  users: {
    total: number;
    byRole: Record<string, number>;
    byStatus: Record<string, number>;
  };
  locations: {
    total: number;
    byStatus: Record<string, number>;
  };
  reviews: {
    total: number;
    byStatus: Record<string, number>;
  };
  reports: {
    total: number;
    byStatus: Record<string, number>;
  };
  recentActivity: AuditLogEntry[];
}

export interface PaginatedAuditLogs {
  success: boolean;
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export async function getDashboardOverview(): Promise<{
  success: boolean;
  data: DashboardOverview;
}> {
  const res = await api.get<{ success: boolean; data: DashboardOverview }>(
    '/admin/dashboard/overview',
  );
  return res.data;
}

export async function listAuditLogs(params?: {
  page?: number;
  limit?: number;
  action?: string;
  actorId?: string;
}): Promise<PaginatedAuditLogs> {
  const res = await api.get<PaginatedAuditLogs>('/admin/dashboard/audit-logs', {
    params,
  });
  return res.data;
}

// ─── Admin Claim Management (WDP-28) ────────────────────────────────────────

export interface AdminClaimLocation {
  _id: string;
  name: string;
  address?: string;
  ownerId?: string | null;
  status?: string;
  phone?: string;
}

export interface AdminClaimVendor {
  _id: string;
  fullName?: string;
  email?: string;
  phone?: string;
}

export interface ClaimEvidenceFile {
  url: string;
  fileType: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  geo?: { type: 'Point'; coordinates: [number, number] };
  capturedAt?: string;
  metadata?: {
    siteCode?: string;
    adminScrutiny?: string;
    [key: string]: unknown;
  };
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
  vendorId: AdminClaimVendor | string;
  locationId: AdminClaimLocation | string;
  status: string;
  otpVerified?: boolean;
  evidenceFiles?: ClaimEvidenceFile[];
  licenseUrl?: string;
  deviceDistanceMeters?: number;
  adminDecision?: {
    decidedBy: string;
    reason: string;
    decidedAt: string;
  };
  flags: ClaimFlags;
  createdAt: string;
  updatedAt?: string;
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
  claim?: { id: string; status: string };
  location?: { id: string; ownerId: string };
  redirectToRequestAccess?: boolean;
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

// ─── Admin Location Request Management (WDP-19 / location-requests) ──────────

export interface AdminLocationRequestFlags {
  suspectedDuplicate?: boolean;
  farPin?: boolean;
  suspectedDuplicateLocationIds?: string[];
  [key: string]: unknown;
}

export interface AdminLocationRequest {
  _id: string;
  type: 'CREATE' | 'UPDATE';
  status: string;
  submittedBy: { _id: string; fullName?: string; email?: string } | string;
  locationId?: { _id: string; name?: string; address?: string; status?: string } | string | null;
  newData?: {
    name?: string;
    address?: string;
    [key: string]: unknown;
  };
  flags?: AdminLocationRequestFlags;
  deviceDistanceMeters?: number;
  adminDecision?: {
    decidedBy: string;
    reason?: string;
    decidedAt: string;
    duplicateOfLocationId?: string;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface LocationRequestQueueResponse {
  success: boolean;
  total: number;
  page: number;
  limit: number;
  items: AdminLocationRequest[];
}

export interface LocationRequestActionResponse {
  success: boolean;
  message: string;
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

export async function approveLocationRequest(
  id: string,
): Promise<LocationRequestActionResponse> {
  const res = await api.patch<LocationRequestActionResponse>(
    `/admin/location-requests/${id}/approve`,
  );
  return res.data;
}

export async function rejectLocationRequest(
  id: string,
  reason: string,
  duplicateOfLocationId?: string,
): Promise<LocationRequestActionResponse> {
  const res = await api.patch<LocationRequestActionResponse>(
    `/admin/location-requests/${id}/reject`,
    { reason, ...(duplicateOfLocationId ? { duplicateOfLocationId } : {}) },
  );
  return res.data;
}

export interface DecisionEvidence {
  url: string;
  fileType: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  capturedAt?: string;
  geo?: { type: 'Point'; coordinates: [number, number] };
}

export interface DecisionUser {
  _id: string;
  fullName?: string;
  email?: string;
  phone?: string;
}

export interface DecisionLocation {
  _id: string;
  name?: string;
  address?: string;
  ownerId?: string | null;
}

export interface AdminDispute {
  _id: string;
  requestAccessId?: string;
  locationId: DecisionLocation | string;
  vendorAId: DecisionUser | string;
  vendorBId: DecisionUser | string;
  evidenceA: DecisionEvidence[];
  evidenceB: DecisionEvidence[];
  status: string;
  adminDecision?: { reason?: string; decidedAt?: string };
  createdAt?: string;
}

export interface DisputeQueueResponse {
  success: boolean;
  items: AdminDispute[];
  total: number;
  page: number;
  limit: number;
}

export async function getDisputeQueue(): Promise<DisputeQueueResponse> {
  const res = await api.get<DisputeQueueResponse>('/admin/disputes');
  return res.data;
}

export async function getDisputeDetail(id: string): Promise<AdminDispute> {
  const res = await api.get<{ success: boolean; dispute: AdminDispute }>(
    `/admin/disputes/${id}`,
  );
  return res.data.dispute;
}

export async function resolveDispute(
  id: string,
  outcome: 'KEEP' | 'TRANSFER' | 'REVOKE',
  reason: string,
): Promise<{ message: string }> {
  const res = await api.patch<{ success: boolean; message: string }>(
    `/admin/disputes/${id}/resolve`,
    { outcome, reason },
  );
  return res.data;
}
