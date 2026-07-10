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
  // Backend returns userData, frontend expects user
  const data = res.data;
  if (data.success && (data as any).userData) {
    (data as any).user = (data as any).userData;
    delete (data as any).userData;
  }
  return data;
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
