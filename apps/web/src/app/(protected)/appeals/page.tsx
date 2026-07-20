'use client';

import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
  type SxProps,
  type Theme,
} from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { ActionButton } from '@/components/admin/ActionButton';
import { AdminCard } from '@/components/admin/AdminCard';
import { EmptyState } from '@/components/admin/EmptyState';
import { Topbar } from '@/components/admin/Topbar';
import {
  appealStatusLabel,
  appealTypeLabel,
  type AppealDecision,
} from '@/components/admin/admin-review-labels';
import {
  getAppealDetail,
  getAppealQueue,
  resolveAppeal,
  type AdminAppeal,
  type AdminRequestView,
} from '@/lib/admin-api';
import { AdminRequestTabs } from '@/components/admin/AdminRequestTabs';
import { tokens } from '@/theme/admin-tokens';
import { AppealDetailDrawer } from './components/AppealDetailDrawer';

const PAGE_SIZE = 20;

const headSx = {
  fontFamily: tokens.font.mono,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: tokens.color.textSecondary,
  borderBottom: `1px solid ${tokens.color.border}`,
  py: 2,
  whiteSpace: 'nowrap',
} satisfies SxProps<Theme>;

const stickyActionHeadSx: SxProps<Theme> = {
  ...headSx,
  position: 'sticky',
  right: 0,
  zIndex: 2,
  bgcolor: tokens.color.card,
  boxShadow: '-8px 0 12px rgba(25, 28, 33, 0.04)',
};

const stickyActionCellSx: SxProps<Theme> = {
  position: 'sticky',
  right: 0,
  zIndex: 1,
  bgcolor: tokens.color.card,
  boxShadow: '-8px 0 12px rgba(25, 28, 33, 0.04)',
};

function message(err: unknown) {
  const data = err as { response?: { data?: { message?: string | string[] } }; message?: string };
  const value = data.response?.data?.message;
  return Array.isArray(value) ? value.join(', ') : value ?? data.message ?? 'Đã xảy ra lỗi';
}

function deadlineContext(deadline: string, status: string): string {
  if (status !== 'PENDING') return 'Đã xử lý';

  const end = dayjs(deadline);
  if (dayjs().isAfter(end)) return 'Quá hạn xử lý';

  const hours = Math.max(1, end.diff(dayjs(), 'hour'));
  if (hours < 24) return `Còn ${hours} giờ`;
  return `Còn ${Math.ceil(hours / 24)} ngày`;
}

function statusChipSx(status: string) {
  if (status === 'OVERTURNED' || status === 'ACCEPTED_TO_DISPUTE') {
    return {
      bgcolor: tokens.color.sage,
      color: tokens.color.sageText,
      border: '1px solid transparent',
    };
  }
  if (status === 'UPHELD') {
    return {
      bgcolor: tokens.color.redSoftBg,
      color: tokens.color.red,
      border: `1px solid ${tokens.color.redSoftBorder}`,
    };
  }
  return {
    bgcolor: tokens.color.pendingBg,
    color: tokens.color.pendingText,
    border: `1px solid ${tokens.color.border}`,
  };
}

export default function AppealsPage() {
  const [items, setItems] = useState<AdminAppeal[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<AdminRequestView>('queue');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminAppeal | null>(null);
  const [saving, setSaving] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  const load = useCallback(async (nextPage: number, nextView: AdminRequestView) => {
    try {
      const data = await getAppealQueue(nextPage, PAGE_SIZE, nextView);
      setItems(data.items);
      setTotal(data.total);
      setPage(data.page);
      setError(null);
    } catch (err) {
      setError(message(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadInitialPage() {
      try {
        const data = await getAppealQueue(1, PAGE_SIZE, view);
        if (!active) return;
        setItems(data.items);
        setTotal(data.total);
        setPage(data.page);
        setError(null);
      } catch (err) {
        if (active) setError(message(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadInitialPage();
    return () => {
      active = false;
    };
  }, [view]);

  async function show(id: string) {
    try {
      setSelected(await getAppealDetail(id));
      setDrawerError(null);
    } catch (err) {
      setError(message(err));
    }
  }

  async function run(decision: AppealDecision, reason: string) {
    if (!selected) return;
    setSaving(true);
    try {
      const result = await resolveAppeal(selected._id, decision, reason);
      setNotice(result.message);
      setSelected(null);
      await load(items.length === 1 && page > 1 ? page - 1 : page, view);
    } catch (err) {
      setDrawerError(message(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, flex: 1, minWidth: 0 }}>
      <Topbar
        title="Kháng cáo"
        subtitle={view === 'queue' ? `${total} hồ sơ đang chờ` : `${total} hồ sơ trong lịch sử`}
        actions={
          <ActionButton
            variant="neutral"
            onClick={() => {
              setLoading(true);
              void load(page, view);
            }}
            sx={{ minHeight: 44 }}
          >
            Tải lại
          </ActionButton>
        }
      />
      <AdminRequestTabs
        value={view}
        onChange={(nextView) => {
          setSelected(null);
          setLoading(true);
          setPage(1);
          setView(nextView);
        }}
      />
      {notice ? (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      ) : null}
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress sx={{ color: tokens.color.orange }} />
        </Box>
      ) : (
        <AdminCard sx={{ overflow: 'hidden' }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 980 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={headSx}>Loại kháng cáo</TableCell>
                  <TableCell sx={headSx}>Người kháng cáo</TableCell>
                  <TableCell sx={headSx}>Nội dung</TableCell>
                  <TableCell sx={headSx}>Hạn xử lý</TableCell>
                  <TableCell sx={headSx}>Trạng thái</TableCell>
                  <TableCell sx={stickyActionHeadSx} align="right">Hành động</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ borderBottom: 'none' }}>
                      <EmptyState
                        icon={<InboxOutlinedIcon />}
                        title={view === 'queue' ? 'Không có kháng cáo' : 'Chưa có lịch sử kháng cáo'}
                        subtitle={view === 'queue' ? 'Hàng đợi hiện đang trống.' : 'Chưa có kháng cáo nào đã xử lý.'}
                      />
                    </TableCell>
                  </TableRow>
                ) : null}
                {items.map((item) => {
                  const user = typeof item.appellantId === 'object' ? item.appellantId : null;
                  const deadlineState = deadlineContext(item.appealDeadline, item.status);
                  const overdue = deadlineState === 'Quá hạn xử lý';

                  return (
                    <TableRow
                      key={item._id}
                      hover
                      sx={{ '&:hover': { bgcolor: `${tokens.color.rowHover} !important` } }}
                    >
                      <TableCell sx={{ py: 2, minWidth: 220 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                          {appealTypeLabel(item.type)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ minWidth: 180 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                          {user?.fullName ?? user?.email ?? 'Không rõ'}
                        </Typography>
                        {user?.fullName && user.email ? (
                          <Typography sx={{ color: tokens.color.textMuted, fontSize: 12 }}>
                            {user.email}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell sx={{ width: '32%', minWidth: 260 }}>
                        <Typography
                          sx={{
                            color: tokens.color.textSecondary,
                            fontSize: 14,
                            lineHeight: 1.45,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {item.argument}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ minWidth: 150 }}>
                        <Typography sx={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                          {dayjs(item.appealDeadline).format('DD/MM/YYYY HH:mm')}
                        </Typography>
                        <Typography
                          sx={{
                            mt: 0.25,
                            color: overdue ? tokens.color.red : tokens.color.textMuted,
                            fontSize: 12,
                            fontWeight: overdue ? 700 : 500,
                          }}
                        >
                          {deadlineState}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ minWidth: 160 }}>
                        <Chip
                          size="small"
                          label={appealStatusLabel(item.status)}
                          sx={statusChipSx(item.status)}
                        />
                      </TableCell>
                      <TableCell align="right" sx={stickyActionCellSx}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<VisibilityOutlinedIcon fontSize="small" />}
                          aria-label={`Xem hồ sơ của ${user?.fullName ?? user?.email ?? 'người kháng cáo'}`}
                          onClick={() => void show(item._id)}
                          sx={{
                            minHeight: 44,
                            minWidth: 118,
                            borderColor: tokens.color.border,
                            color: tokens.color.textPrimary,
                            whiteSpace: 'nowrap',
                            '&:hover': { borderColor: tokens.color.orange, bgcolor: tokens.color.orangeSoft },
                          }}
                        >
                          Xem hồ sơ
                        </Button>
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
              void load(nextPage + 1, view);
            }}
          />
        </AdminCard>
      )}
      <AppealDetailDrawer
        key={selected?._id ?? 'closed'}
        open={Boolean(selected)}
        item={selected}
        saving={saving}
        error={drawerError}
        readOnly={view === 'history'}
        onClose={() => setSelected(null)}
        onResolve={(decision, reason) => void run(decision, reason)}
      />
    </Box>
  );
}
