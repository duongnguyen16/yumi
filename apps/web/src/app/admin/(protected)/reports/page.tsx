'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Pagination,
  type SxProps,
  type Theme,
} from '@mui/material';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import RemoveRedEyeOutlinedIcon from '@mui/icons-material/RemoveRedEyeOutlined';
import {
  listReports,
  resolveReport,
  dismissReport,
  type AdminReport,
} from '@/lib/admin-api';
import { Topbar } from '@/components/admin/Topbar';
import { AdminCard } from '@/components/admin/AdminCard';
import { ActionButton } from '@/components/admin/ActionButton';
import { EmptyState } from '@/components/admin/EmptyState';
import { tokens } from '@/theme/admin-tokens';

const REPORT_PAGE_SIZE = 20;

const STATUS_CHIP: Record<string, { label: string; bg: string; color: string }> = {
  PENDING: { label: 'Chờ xử lý', bg: tokens.color.pendingBg, color: tokens.color.pendingText },
  UNDER_REVIEW: { label: 'Đang xem xét', bg: '#E3EEF9', color: '#1A5C9A' },
  RESOLVED: { label: 'Đã xử lý', bg: tokens.color.sage, color: tokens.color.sageText },
  DISMISSED: { label: 'Đã từ chối', bg: tokens.color.redSoftBg, color: tokens.color.red },
  REJECTED: { label: 'Bị từ chối', bg: tokens.color.redSoftBg, color: tokens.color.red },
  APPROVED: { label: 'Đã chấp thuận', bg: tokens.color.sage, color: tokens.color.sageText },
  APPEALED: { label: 'Đã kháng nghị', bg: '#FFF3D8', color: '#8A641F' },
};

const REASON_LABEL: Record<string, string> = {
  INCORRECT_INFORMATION: 'Thông tin sai',
  SPAM: 'Spam',
  PERMANENTLY_CLOSED: 'Đã đóng cửa',
  WRONG_OWNER: 'Sai chủ sở hữu',
  OTHER: 'Khác',
};

const ROUTE_LABEL: Record<string, string> = {
  STANDARD_REVIEW: 'Thường',
  OWNERSHIP_REVIEW: 'Sở hữu',
};

function extractMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? 'Đã xảy ra lỗi';
}

function formatTime(value?: string): string {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—';
}

const headSx: SxProps<Theme> = {
  fontFamily: tokens.font.mono,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: tokens.color.textSecondary,
  borderBottom: `1px solid ${tokens.color.border}`,
  py: 2,
  whiteSpace: 'nowrap',
};

export default function ReportsPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Action modal state
  const [actionReport, setActionReport] = useState<AdminReport | null>(null);
  const [actionKind, setActionKind] = useState<'resolve' | 'dismiss' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionReviewId, setActionReviewId] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const topRef = useRef<HTMLDivElement>(null);

  const fetchReports = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listReports(p, REPORT_PAGE_SIZE);
      setReports(data.data);
      setTotal(data.total);
      setPage(data.page);
    } catch (err) {
      setError(extractMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReports(page);
  }, []);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / REPORT_PAGE_SIZE)), [total]);

  function handlePageChange(_: unknown, p: number) {
    setPage(p);
    void fetchReports(p);
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function openAction(report: AdminReport, kind: 'resolve' | 'dismiss') {
    setActionReport(report);
    setActionKind(kind);
    setActionReason('');
    setActionReviewId('');
    setActionError(null);
  }

  function closeAction() {
    setActionReport(null);
    setActionKind(null);
    setActionReason('');
    setActionReviewId('');
    setActionError(null);
  }

  async function handleActionSubmit() {
    if (!actionReport || !actionKind) return;
    if (!actionReason.trim()) {
      setActionError('Vui lòng nhập lý do');
      return;
    }

    setActionSubmitting(true);
    setActionError(null);
    try {
      if (actionKind === 'resolve') {
        await resolveReport(
          actionReport.id,
          actionReason.trim(),
          actionReviewId.trim() || undefined,
        );
      } else {
        await dismissReport(actionReport.id, actionReason.trim());
      }
      closeAction();
      await fetchReports(page);
    } catch (err) {
      setActionError(extractMessage(err));
    } finally {
      setActionSubmitting(false);
    }
  }

  const pendingCount = useMemo(() => reports.filter((r) => r.status === 'PENDING').length, [reports]);

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
      ref={topRef}
    >
      <Topbar
        title="Xử lý Report"
        subtitle={
          pendingCount > 0
            ? `${pendingCount} báo cáo đang chờ xử lý`
            : 'Tất cả báo cáo'
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: tokens.color.orange }} />
        </Box>
      ) : (
        <AdminCard
          sx={{
            flex: 1,
            borderRadius: 0,
            animation: 'admin-fade-in 320ms ease both',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ overflowX: 'auto', flex: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: tokens.color.card }}>
                  <TableCell sx={headSx}>Người báo cáo</TableCell>
                  <TableCell sx={headSx}>Loại</TableCell>
                  <TableCell sx={headSx}>Lý do</TableCell>
                  <TableCell sx={headSx}>Mô tả</TableCell>
                  <TableCell sx={headSx}>Trạng thái</TableCell>
                  <TableCell sx={headSx}>Ngày tạo</TableCell>
                  <TableCell sx={headSx} align="right">
                    Hành động
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reports.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ borderBottom: 'none' }}>
                      <EmptyState
                        icon={<InboxOutlinedIcon sx={{ fontSize: 26 }} />}
                        title="Không có báo cáo"
                        subtitle="Chưa có báo cáo nào từ người dùng."
                      />
                    </TableCell>
                  </TableRow>
                )}
                {reports.map((r, idx) => {
                  const chip = STATUS_CHIP[r.status] ?? STATUS_CHIP.PENDING;
                  return (
                    <TableRow
                      key={r.id}
                      sx={{
                        animation: 'admin-fade-in 240ms ease both',
                        animationDelay: `${Math.min(idx, 12) * 28}ms`,
                        bgcolor:
                          r.status === 'PENDING'
                            ? tokens.color.rowSubTint
                            : undefined,
                        '&:hover': {
                          bgcolor: `${tokens.color.rowHover} !important`,
                        },
                      }}
                    >
                      <TableCell sx={{ py: 2, minWidth: 180 }}>
                        <Typography
                          sx={{
                            fontWeight: 600,
                            fontSize: 14,
                            color: tokens.color.textPrimary,
                          }}
                        >
                          {r.reporter?.fullName ?? 'N/A'}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: 12,
                            color: tokens.color.textMuted,
                            fontFamily: tokens.font.mono,
                          }}
                        >
                          {r.reporter?.email ?? ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 14, color: tokens.color.textPrimary }}>
                          {r.targetType === 'REVIEW' ? 'Đánh giá' : 'Địa điểm'}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: 12,
                            color: tokens.color.textMuted,
                            fontFamily: tokens.font.mono,
                          }}
                        >
                          {ROUTE_LABEL[r.route] ?? r.route}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 14, color: tokens.color.textPrimary }}>
                          {REASON_LABEL[r.reason] ?? r.reason}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 260 }}>
                        <Typography
                          sx={{
                            fontSize: 14,
                            color: tokens.color.textDescription,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {r.description || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: 'inline-block',
                            px: 1.25,
                            py: 0.5,
                            fontSize: 12,
                            fontWeight: 700,
                            fontFamily: tokens.font.mono,
                            letterSpacing: '0.04em',
                            bgcolor: chip.bg,
                            color: chip.color,
                          }}
                        >
                          {chip.label}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: 13,
                            color: tokens.color.textSecondary,
                            whiteSpace: 'nowrap',
                            fontFamily: tokens.font.mono,
                          }}
                        >
                          {formatTime(r.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {r.status === 'PENDING' ? (
                          <Stack
                            direction="row"
                            spacing={0.5}
                            sx={{ justifyContent: 'flex-end' }}
                          >
                            {actionLoading === r.id ? (
                              <CircularProgress size={20} sx={{ color: tokens.color.orange }} />
                            ) : (
                              <>
                                <Tooltip title="Xử lý (báo cáo đúng)">
                                  <IconButton
                                    size="small"
                                    onClick={() => openAction(r, 'resolve')}
                                    sx={{
                                      color: tokens.color.green,
                                      '&:hover': { bgcolor: tokens.color.sage },
                                    }}
                                  >
                                    <CheckCircleOutlineOutlinedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Từ chối (báo cáo sai)">
                                  <IconButton
                                    size="small"
                                    onClick={() => openAction(r, 'dismiss')}
                                    sx={{
                                      color: tokens.color.red,
                                      '&:hover': { bgcolor: tokens.color.redSoftBg },
                                    }}
                                  >
                                    <CancelOutlinedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </Stack>
                        ) : (
                          <Typography
                            sx={{
                              fontSize: 12,
                              color: tokens.color.textMuted,
                              fontFamily: tokens.font.mono,
                            }}
                          >
                            {r.handledBy?.fullName ?? '—'}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                py: 2,
                borderTop: `1px solid ${tokens.color.border}`,
              }}
            >
              <Pagination
                page={page}
                count={totalPages}
                onChange={handlePageChange}
                size="small"
                sx={{
                  '& .MuiPaginationItem-root': {
                    fontFamily: tokens.font.mono,
                    fontSize: 13,
                  },
                }}
              />
            </Box>
          )}
        </AdminCard>
      )}

      {/* Action Dialog */}
      <Dialog
        open={!!actionReport && !!actionKind}
        onClose={closeAction}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 0,
              bgcolor: tokens.color.card,
              boxShadow: tokens.shadow.card,
            },
          },
          transition: {
            onExited: closeAction,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontSize: 18,
            color: tokens.color.textPrimary,
            borderBottom: `1px solid ${tokens.color.border}`,
            px: 3,
            py: 2.5,
          }}
        >
          {actionKind === 'resolve' ? 'Xác nhận xử lý báo cáo' : 'Từ chối báo cáo'}
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 2.5 }}>
          {actionReport && (
            <Stack spacing={2}>
              <Box>
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: tokens.color.textMuted,
                    mb: 0.5,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontFamily: tokens.font.mono,
                  }}
                >
                  Lý do báo cáo
                </Typography>
                <Typography sx={{ fontSize: 14, color: tokens.color.textPrimary }}>
                  {REASON_LABEL[actionReport.reason] ?? actionReport.reason}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 14,
                    color: tokens.color.textDescription,
                    mt: 0.5,
                    fontStyle: actionReport.description ? undefined : 'italic',
                  }}
                >
                  {actionReport.description || 'Không có mô tả'}
                </Typography>
              </Box>

              {actionKind === 'resolve' && actionReport.targetType === 'REVIEW' && (
                <TextField
                  label="ID Đánh giá cần xóa (nếu có)"
                  placeholder="Nhập Review ID để xóa đánh giá"
                  value={actionReviewId}
                  onChange={(e) => setActionReviewId(e.target.value)}
                  fullWidth
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 0,
                      bgcolor: tokens.color.inputBg,
                    },
                  }}
                />
              )}

              <TextField
                label={actionKind === 'resolve' ? 'Kết quả xử lý' : 'Lý do từ chối'}
                placeholder={
                  actionKind === 'resolve'
                    ? 'Ghi rõ kết quả xử lý...'
                    : 'Ghi rõ lý do từ chối báo cáo...'
                }
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                multiline
                rows={3}
                fullWidth
                size="small"
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 0,
                    bgcolor: tokens.color.inputBg,
                  },
                }}
              />

              {actionError && (
                <Alert severity="error" onClose={() => setActionError(null)}>
                  {actionError}
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            pb: 2.5,
            gap: 1,
            borderTop: `1px solid ${tokens.color.border}`,
            pt: 2,
          }}
        >
          <ActionButton variant="neutral" onClick={closeAction}>
            Hủy
          </ActionButton>
          <ActionButton
            variant={actionKind === 'resolve' ? 'approve' : 'reject'}
            onClick={handleActionSubmit}
            disabled={actionSubmitting || !actionReason.trim()}
            sx={{ minWidth: 120 }}
          >
            {actionSubmitting
              ? 'Đang xử lý...'
              : actionKind === 'resolve'
                ? 'Xác nhận xử lý'
                : 'Từ chối'}
          </ActionButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
