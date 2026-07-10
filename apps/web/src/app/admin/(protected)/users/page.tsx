'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Tooltip,
  Snackbar,
} from '@mui/material';
import {
  listUsers,
  updateUserStatus,
  updateUserRole,
  adjustUserTrust,
  type AdminUser,
} from '@/lib/admin-api';
import { Topbar } from '@/components/admin/Topbar';
import { AdminCard } from '@/components/admin/AdminCard';
import { EmptyState } from '@/components/admin/EmptyState';
import { SearchInput } from '@/components/admin/SearchInput';
import { tokens } from '@/theme/admin-tokens';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: tokens.color.sage,
  WARNED: '#E8A838',
  BANNED: '#D84C3F',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Hoạt động',
  WARNED: 'Cảnh cáo',
  BANNED: 'Đã cấm',
};

const TRUST_COLORS: Record<string, string> = {
  TRUSTED: tokens.color.sage,
  NEW: tokens.color.textMuted,
  RESTRICTED: '#E8A838',
  BANNED: '#D84C3F',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Dialog states
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    user: AdminUser | null;
  }>({ open: false, user: null });
  const [roleDialog, setRoleDialog] = useState<{
    open: boolean;
    user: AdminUser | null;
  }>({ open: false, user: null });
  const [trustDialog, setTrustDialog] = useState<{
    open: boolean;
    user: AdminUser | null;
  }>({ open: false, user: null });

  const [selectedStatus, setSelectedStatus] = useState('ACTIVE');
  const [selectedRole, setSelectedRole] = useState('CUSTOMER');
  const [trustPoints, setTrustPoints] = useState(0);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listUsers();
      setUsers(data);
    } catch {
      setError('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = search
    ? users.filter(
        (u) =>
          u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase()),
      )
    : users;

  async function handleStatusChange() {
    if (!statusDialog.user) return;
    setActionLoading(true);
    setError(null);
    try {
      await updateUserStatus(
        statusDialog.user._id,
        selectedStatus,
        reason || undefined,
      );
      setSuccess('Cập nhật trạng thái thành công');
      setStatusDialog({ open: false, user: null });
      setReason('');
      fetchUsers();
    } catch (err: any) {
      setError(
        err?.response?.data?.message || 'Không thể cập nhật trạng thái',
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRoleChange() {
    if (!roleDialog.user) return;
    setActionLoading(true);
    setError(null);
    try {
      await updateUserRole(
        roleDialog.user._id,
        selectedRole,
        reason || undefined,
      );
      setSuccess('Cập nhật vai trò thành công');
      setRoleDialog({ open: false, user: null });
      setReason('');
      fetchUsers();
    } catch (err: any) {
      setError(
        err?.response?.data?.message || 'Không thể cập nhật vai trò',
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleTrustAdjust() {
    if (!trustDialog.user) return;
    setActionLoading(true);
    setError(null);
    try {
      await adjustUserTrust(
        trustDialog.user._id,
        trustPoints,
        reason || undefined,
      );
      setSuccess('Điều chỉnh trust score thành công');
      setTrustDialog({ open: false, user: null });
      setReason('');
      setTrustPoints(0);
      fetchUsers();
    } catch (err: any) {
      setError(
        err?.response?.data?.message || 'Không thể điều chỉnh trust score',
      );
    } finally {
      setActionLoading(false);
    }
  }

  const getInitial = (u: AdminUser) =>
    (u.fullName?.trim()?.[0] ?? u.email?.trim()?.[0] ?? '?').toUpperCase();

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Topbar title="Quản lí User" subtitle="Danh sách người dùng" />
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={28} sx={{ color: tokens.color.orange }} />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Topbar
        title="Quản lí User"
        subtitle={`${users.length} người dùng`}
        actions={
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm kiếm người dùng..."
          />
        }
      />

      {users.length === 0 ? (
        <AdminCard>
          <EmptyState
            icon={<ManageAccountsOutlinedIcon sx={{ fontSize: 28 }} />}
            title="Chưa có người dùng nào"
            subtitle="Khi có người dùng đăng ký, họ sẽ xuất hiện ở đây."
          />
        </AdminCard>
      ) : (
        <AdminCard>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Người dùng</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Vai trò</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Trust</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    Thao tác
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow
                    key={u._id}
                    hover
                    sx={{ '&:hover': { cursor: 'pointer' } }}
                    onClick={() => setSelectedUser(u)}
                  >
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: tokens.color.orange,
                            color: '#fff',
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          {getInitial(u)}
                        </Avatar>
                        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                          {u.fullName || '—'}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 13, color: tokens.color.textMuted }}>
                        {u.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={u.role}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          bgcolor:
                            u.role === 'ADMIN'
                              ? tokens.color.orange + '22'
                              : u.role === 'VENDOR'
                                ? tokens.color.sage
                                : tokens.color.border,
                          color:
                            u.role === 'ADMIN'
                              ? tokens.color.orange
                              : u.role === 'VENDOR'
                                ? tokens.color.sageText
                                : tokens.color.textMuted,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={STATUS_LABELS[u.status] || u.status}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          bgcolor: (STATUS_COLORS[u.status] || tokens.color.border) + '22',
                          color: STATUS_COLORS[u.status] || tokens.color.textMuted,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={`Score: ${u.trustScore} · Level: ${u.trustLevel}`}>
                        <Chip
                          label={`${u.trustScore} · ${u.trustLevel}`}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            bgcolor: (TRUST_COLORS[u.trustLevel] || tokens.color.border) + '22',
                            color: TRUST_COLORS[u.trustLevel] || tokens.color.textMuted,
                          }}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="Đổi trạng thái">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStatus(u.status);
                              setStatusDialog({ open: true, user: u });
                            }}
                            sx={{ color: tokens.color.textSecondary }}
                          >
                            {u.status === 'BANNED' ? (
                              <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 18 }} />
                            ) : (
                              <BlockOutlinedIcon sx={{ fontSize: 18 }} />
                            )}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Đổi vai trò">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRole(u.role);
                              setRoleDialog({ open: true, user: u });
                            }}
                            sx={{ color: tokens.color.textSecondary }}
                          >
                            <ManageAccountsOutlinedIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Điều chỉnh Trust">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTrustPoints(0);
                              setTrustDialog({ open: true, user: u });
                            }}
                            sx={{ color: tokens.color.textSecondary }}
                          >
                            <TrendingUpOutlinedIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AdminCard>
      )}

      {/* User Detail Drawer Area - inline section below table */}
      {selectedUser && (
        <AdminCard sx={{ mt: 3 }}>
          <Box sx={{ p: 3 }}>
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 3 }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
                Chi tiết người dùng
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setSelectedUser(null)}
                sx={{ borderRadius: 0 }}
              >
                Đóng
              </Button>
            </Stack>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1}>
                <Typography sx={{ fontWeight: 600, minWidth: 140, fontSize: 13, color: tokens.color.textMuted }}>
                  Họ tên
                </Typography>
                <Typography sx={{ fontSize: 13 }}>{selectedUser.fullName || '—'}</Typography>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Typography sx={{ fontWeight: 600, minWidth: 140, fontSize: 13, color: tokens.color.textMuted }}>
                  Email
                </Typography>
                <Typography sx={{ fontSize: 13 }}>{selectedUser.email}</Typography>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Typography sx={{ fontWeight: 600, minWidth: 140, fontSize: 13, color: tokens.color.textMuted }}>
                  Số điện thoại
                </Typography>
                <Typography sx={{ fontSize: 13 }}>{selectedUser.phone || '—'}</Typography>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Typography sx={{ fontWeight: 600, minWidth: 140, fontSize: 13, color: tokens.color.textMuted }}>
                  Vai trò
                </Typography>
                <Typography sx={{ fontSize: 13 }}>{selectedUser.role}</Typography>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Typography sx={{ fontWeight: 600, minWidth: 140, fontSize: 13, color: tokens.color.textMuted }}>
                  Trạng thái
                </Typography>
                <Typography sx={{ fontSize: 13 }}>
                  {STATUS_LABELS[selectedUser.status] || selectedUser.status}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Typography sx={{ fontWeight: 600, minWidth: 140, fontSize: 13, color: tokens.color.textMuted }}>
                  Trust Score
                </Typography>
                <Typography sx={{ fontSize: 13 }}>{selectedUser.trustScore}</Typography>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Typography sx={{ fontWeight: 600, minWidth: 140, fontSize: 13, color: tokens.color.textMuted }}>
                  Trust Level
                </Typography>
                <Typography sx={{ fontSize: 13 }}>{selectedUser.trustLevel}</Typography>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Typography sx={{ fontWeight: 600, minWidth: 140, fontSize: 13, color: tokens.color.textMuted }}>
                  Ngày tạo
                </Typography>
                <Typography sx={{ fontSize: 13 }}>
                  {new Date(selectedUser.createdAt).toLocaleDateString('vi-VN')}
                </Typography>
              </Stack>
            </Stack>
          </Box>
        </AdminCard>
      )}

      {/* Status Dialog */}
      <Dialog
        open={statusDialog.open}
        onClose={() => !actionLoading && setStatusDialog({ open: false, user: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Đổi trạng thái — {statusDialog.user?.fullName || statusDialog.user?.email}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Trạng thái</InputLabel>
              <Select
                value={selectedStatus}
                label="Trạng thái"
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <MenuItem value="ACTIVE">Hoạt động</MenuItem>
                <MenuItem value="WARNED">Cảnh cáo</MenuItem>
                <MenuItem value="BANNED">Cấm</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Lý do (không bắt buộc)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              multiline
              rows={2}
              fullWidth
              size="small"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setStatusDialog({ open: false, user: null })}
            disabled={actionLoading}
            sx={{ borderRadius: 0 }}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={handleStatusChange}
            disabled={actionLoading}
            sx={{ borderRadius: 0 }}
          >
            {actionLoading ? 'Đang xử lý...' : 'Xác nhận'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Role Dialog */}
      <Dialog
        open={roleDialog.open}
        onClose={() => !actionLoading && setRoleDialog({ open: false, user: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Đổi vai trò — {roleDialog.user?.fullName || roleDialog.user?.email}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Vai trò</InputLabel>
              <Select
                value={selectedRole}
                label="Vai trò"
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <MenuItem value="CUSTOMER">Khách hàng</MenuItem>
                <MenuItem value="VENDOR">Vendor</MenuItem>
                <MenuItem value="ADMIN">Admin</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Lý do (không bắt buộc)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              multiline
              rows={2}
              fullWidth
              size="small"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setRoleDialog({ open: false, user: null })}
            disabled={actionLoading}
            sx={{ borderRadius: 0 }}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={handleRoleChange}
            disabled={actionLoading}
            sx={{ borderRadius: 0 }}
          >
            {actionLoading ? 'Đang xử lý...' : 'Xác nhận'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Trust Dialog */}
      <Dialog
        open={trustDialog.open}
        onClose={() => !actionLoading && setTrustDialog({ open: false, user: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Điều chỉnh Trust — {trustDialog.user?.fullName || trustDialog.user?.email}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="caption" sx={{ color: tokens.color.textMuted }}>
              Hiện tại: Score {trustDialog.user?.trustScore} · Level {trustDialog.user?.trustLevel}
            </Typography>
            <TextField
              label="Điểm thay đổi"
              type="number"
              value={trustPoints}
              onChange={(e) => setTrustPoints(Number(e.target.value))}
              fullWidth
              size="small"
              helperText="Dương = tăng, Âm = giảm. Ví dụ: +15, -10"
            />
            <TextField
              label="Lý do (không bắt buộc)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              multiline
              rows={2}
              fullWidth
              size="small"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setTrustDialog({ open: false, user: null })}
            disabled={actionLoading}
            sx={{ borderRadius: 0 }}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={handleTrustAdjust}
            disabled={actionLoading}
            sx={{ borderRadius: 0 }}
          >
            {actionLoading ? 'Đang xử lý...' : 'Xác nhận'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error / Success */}
      <Snackbar
        open={!!error}
        autoHideDuration={5000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 0 }}>
          {error}
        </Alert>
      </Snackbar>
      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ borderRadius: 0 }}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
}
