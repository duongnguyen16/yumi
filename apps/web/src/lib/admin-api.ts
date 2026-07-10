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
