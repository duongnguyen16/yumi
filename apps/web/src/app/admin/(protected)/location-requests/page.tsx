'use client';

import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  Tooltip,
  Typography,
  type SxProps,
  type Theme,
} from '@mui/material';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
  approveLocationRequest,
  getLocationRequestQueue,
  rejectLocationRequest,
  type AdminLocationRequest,
  type AdminRequestView,
} from '@/lib/admin-api';
import { AdminRequestTabs } from '@/components/admin/AdminRequestTabs';
import { Topbar } from '@/components/admin/Topbar';
import { AdminCard } from '@/components/admin/AdminCard';
import { ActionButton } from '@/components/admin/ActionButton';
import { EmptyState } from '@/components/admin/EmptyState';
import { tilePalette, tokens } from '@/theme/admin-tokens';
import { LocationRequestDetailDrawer } from './components/LocationRequestDetailDrawer';

const PAGE_SIZE = 30;

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

export default function LocationRequestsPage() {
  const [items, setItems] = useState<AdminLocationRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<AdminRequestView>('queue');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminLocationRequest | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [startInRejectMode, setStartInRejectMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  const fetchQueue = useCallback(async (p: number, nextView: AdminRequestView) => {
    try {
      const data = await getLocationRequestQueue(p, PAGE_SIZE, nextView);
      setItems(data.items);
      setTotal(data.total);
      setPage(data.page);
      setError(null);
    } catch (err) {
      setError(extractMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadQueue() {
      try {
        const data = await getLocationRequestQueue(1, PAGE_SIZE, view);
        if (!active) return;
        setItems(data.items);
        setTotal(data.total);
        setPage(data.page);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(extractMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadQueue();

    return () => {
      active = false;
    };
  }, [view]);

  function openDetail(req: AdminLocationRequest, reject = false) {
    setSelected(req);
    setStartInRejectMode(reject);
    setDrawerError(null);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setSelected(null);
    setStartInRejectMode(false);
  }

  async function handleApprove() {
    if (!selected) return;
    setSubmitting(true);
    setDrawerError(null);
    try {
      await approveLocationRequest(selected._id);
      setDrawerOpen(false);
      await fetchQueue(items.length === 1 && page > 1 ? page - 1 : page, view);
    } catch (err) {
      setDrawerError(extractMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject(reason: string, duplicateOfLocationId?: string) {
    if (!selected) return;
    setSubmitting(true);
    setDrawerError(null);
    try {
      await rejectLocationRequest(selected._id, reason, duplicateOfLocationId);
      setDrawerOpen(false);
      await fetchQueue(items.length === 1 && page > 1 ? page - 1 : page, view);
    } catch (err) {
      setDrawerError(extractMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Topbar
        title="Duyệt địa điểm"
        subtitle={view === 'queue' ? `${total} phiếu chờ xử lý` : `${total} phiếu trong lịch sử`}
        actions={
          <ActionButton
            variant="neutral"
            onClick={() => fetchQueue(page, view)}
            sx={{ borderRadius: 0, height: 44 }}
          >
            Tải lại
          </ActionButton>
        }
      />

      <AdminRequestTabs
        value={view}
        onChange={(nextView) => {
          closeDrawer();
          setLoading(true);
          setPage(1);
          setView(nextView);
        }}
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
          sx={{ flex: 1, borderRadius: 0, animation: 'admin-fade-in 320ms ease both' }}
        >
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: tokens.color.card }}>
                  <TableCell sx={headSx}>Tên địa điểm</TableCell>
                  <TableCell sx={headSx}>Người gửi</TableCell>
                  <TableCell sx={headSx}>Loại</TableCell>
                  <TableCell sx={headSx}>Cờ cảnh báo</TableCell>
                  <TableCell sx={headSx}>Gửi lúc</TableCell>
                  <TableCell sx={headSx}>Trạng thái</TableCell>
                  <TableCell sx={headSx} align="right">
                    Hành động
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ borderBottom: 'none' }}>
                      <EmptyState
                        icon={<InboxOutlinedIcon sx={{ fontSize: 26 }} />}
                        title={view === 'queue' ? 'Không có phiếu chờ duyệt' : 'Chưa có lịch sử duyệt'}
                        subtitle={view === 'queue' ? 'Hàng đợi trống.' : 'Chưa có phiếu nào đã xử lý.'}
                      />
                    </TableCell>
                  </TableRow>
                )}
                {items.map((req, idx) => {
                  const tile = tilePalette[idx % tilePalette.length];
                  const loc =
                    req.locationId && typeof req.locationId === 'object'
                      ? req.locationId
                      : null;
                  const submitter =
                    req.submittedBy && typeof req.submittedBy === 'object'
                      ? req.submittedBy
                      : null;
                  const name =
                    typeof req.newData?.name === 'string'
                      ? req.newData.name
                      : loc?.name ?? '—';
                  const flags = req.flags;

                  return (
                    <TableRow
                      key={req._id}
                      sx={{
                        animation: 'admin-fade-in 240ms ease both',
                        animationDelay: `${Math.min(idx, 12) * 28}ms`,
                        '&:hover': { bgcolor: `${tokens.color.rowHover} !important` },
                      }}
                    >
                      <TableCell sx={{ py: 2.25, minWidth: 220 }}>
                        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: 0,
                              bgcolor: tile,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'rgba(37,35,32,0.72)',
                              flexShrink: 0,
                            }}
                          >
                            <WarningAmberOutlinedIcon sx={{ fontSize: 20 }} />
                          </Box>
                          <Typography
                            sx={{ fontWeight: 700, fontSize: 15, color: tokens.color.textPrimary }}
                          >
                            {name}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 14, color: tokens.color.textSecondary }}>
                          {submitter?.fullName ?? submitter?.email ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 14, color: tokens.color.textSecondary }}>
                          {req.type === 'UPDATE' ? 'Sửa' : req.type === 'CREATE' ? 'Tạo mới' : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                          {flags?.suspectedDuplicate && (
                            <Chip label="Nghi trùng" size="small" sx={flagChipSx(tokens.color.red, tokens.color.redSoftBg, tokens.color.redSoftBorder)} />
                          )}
                          {flags?.farPin && (
                            <Chip label="Pin xa" size="small" sx={flagChipSx(tokens.color.pendingText, tokens.color.pendingBg, tokens.color.border)} />
                          )}
                          {!flags?.suspectedDuplicate && !flags?.farPin && (
                            <Typography sx={{ color: tokens.color.textMuted, fontSize: 14 }}>—</Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 14, color: tokens.color.textSecondary, whiteSpace: 'nowrap' }}>
                          {formatTime(req.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={req.status} sx={{ borderRadius: 0 }} />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                          <Tooltip title="Xem chi tiết">
                            <IconButton
                              size="small"
                              onClick={() => openDetail(req)}
                              sx={{ color: tokens.color.textSecondary }}
                            >
                              <VisibilityOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {view === 'queue' && <Tooltip title="Duyệt">
                            <IconButton
                              size="small"
                              onClick={() => openDetail(req)}
                              sx={{ color: tokens.color.green, '&:hover': { bgcolor: 'rgba(46,125,50,0.08)' } }}
                            >
                              <CheckOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>}
                          {view === 'queue' && <Tooltip title="Từ chối">
                            <IconButton
                              size="small"
                              onClick={() => openDetail(req, true)}
                              sx={{ color: tokens.color.red, '&:hover': { bgcolor: tokens.color.redSoftBg } }}
                            >
                              <BlockOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
          <TablePagination
            component="div"
            count={total}
            page={Math.max(0, page - 1)}
            rowsPerPage={PAGE_SIZE}
            rowsPerPageOptions={[PAGE_SIZE]}
            onPageChange={(_, nextPage) => {
              setLoading(true);
              void fetchQueue(nextPage + 1, view);
            }}
          />
        </AdminCard>
      )}

      <LocationRequestDetailDrawer
        key={`${selected?._id ?? 'empty'}:${startInRejectMode}`}
        open={drawerOpen}
        request={selected}
        startInRejectMode={startInRejectMode}
        submitting={submitting}
        error={drawerError}
        readOnly={view === 'history'}
        onClose={closeDrawer}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </Box>
  );
}

function flagChipSx(color: string, bg: string, border: string) {
  return {
    bgcolor: bg,
    color,
    border: `1px solid ${border}`,
    fontWeight: 600,
    fontSize: 11,
    height: 22,
  };
}
