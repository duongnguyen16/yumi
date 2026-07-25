'use client';

import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { ActionButton } from '@/components/admin/ActionButton';
import { AdminCard } from '@/components/admin/AdminCard';
import { EmptyState } from '@/components/admin/EmptyState';
import { Topbar } from '@/components/admin/Topbar';
import {
  getDisputeDetail,
  getDisputeQueue,
  resolveDispute,
  type AdminDispute,
  type AdminRequestView,
} from '@/lib/admin-api';
import { AdminRequestTabs } from '@/components/admin/AdminRequestTabs';
import { tokens } from '@/theme/admin-tokens';
import { DisputeDetailDrawer } from './components/DisputeDetailDrawer';

const PAGE_SIZE = 20;

function message(err: unknown) {
  const data = err as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };
  const value = data.response?.data?.message;
  if (Array.isArray(value)) return value.join(', ');
  if (value) return value;
  return data.message ?? 'Đã xảy ra lỗi';
}

function getPersonLabel(person: { fullName?: string; email?: string } | null) {
  if (!person) return '—';
  const label = person.fullName ?? person.email;
  return label ?? '—';
}

export default function DisputesPage() {
  const [items, setItems] = useState<AdminDispute[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<AdminRequestView>('queue');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminDispute | null>(null);
  const [saving, setSaving] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  const load = useCallback(
    async (nextPage: number, nextView: AdminRequestView) => {
      try {
        const data = await getDisputeQueue(nextPage, PAGE_SIZE, nextView);
        setItems(data.items);
        setTotal(data.total);
        setPage(data.page);
        setError(null);
      } catch (err) {
        setError(message(err));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    let active = true;

    async function loadInitialPage() {
      try {
        const data = await getDisputeQueue(1, PAGE_SIZE, view);
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
      setSelected(await getDisputeDetail(id));
      setDrawerError(null);
    } catch (err) {
      setError(message(err));
    }
  }

  async function run(outcome: 'KEEP' | 'TRANSFER' | 'REVOKE', reason: string) {
    if (!selected) return;
    setSaving(true);
    try {
      const result = await resolveDispute(selected._id, outcome, reason);
      setNotice(result.message);
      setSelected(null);
      let nextPage = page;
      if (items.length === 1 && page > 1) {
        nextPage = page - 1;
      }
      await load(nextPage, view);
    } catch (err) {
      setDrawerError(message(err));
    } finally {
      setSaving(false);
    }
  }

  const isQueue = view === 'queue';
  const topbarSubtitle = isQueue
    ? `${total} hồ sơ đang chờ`
    : `${total} hồ sơ trong lịch sử`;
  const emptyTitle = isQueue
    ? 'Không có tranh chấp'
    : 'Chưa có lịch sử tranh chấp';
  const emptySubtitle = isQueue
    ? 'Hàng đợi hiện đang trống.'
    : 'Chưa có tranh chấp nào đã xử lý.';

  function changePage(nextPage: number) {
    setLoading(true);
    void load(nextPage + 1, view);
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, flex: 1, minWidth: 0 }}>
      <Topbar
        title="Tranh chấp sở hữu"
        subtitle={topbarSubtitle}
        actions={
          <ActionButton variant="neutral" onClick={() => void load(page, view)}>
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
      {notice && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setNotice(null)}
        >
          {notice}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress sx={{ color: tokens.color.orange }} />
        </Box>
      ) : (
        <AdminCard>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Địa điểm</TableCell>
                  <TableCell>Vendor A</TableCell>
                  <TableCell>Vendor B</TableCell>
                  <TableCell>Bằng chứng</TableCell>
                  <TableCell>Ngày tạo</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell align="right">Xem</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <EmptyState
                        icon={<InboxOutlinedIcon />}
                        title={emptyTitle}
                        subtitle={emptySubtitle}
                      />
                    </TableCell>
                  </TableRow>
                )}
                {items.map((item) => {
                  const loc =
                    typeof item.locationId === 'object'
                      ? item.locationId
                      : null;
                  const a =
                    typeof item.vendorAId === 'object' ? item.vendorAId : null;
                  const b =
                    typeof item.vendorBId === 'object' ? item.vendorBId : null;
                  const vendorALabel = getPersonLabel(a);
                  const vendorBLabel = getPersonLabel(b);
                  const createdAt = item.createdAt
                    ? dayjs(item.createdAt).format('DD/MM/YYYY HH:mm')
                    : '—';

                  return (
                    <TableRow key={item._id} hover>
                      <TableCell>
                        <Typography sx={{ fontWeight: 700 }}>
                          {loc?.name ?? 'Không rõ'}
                        </Typography>
                        <Typography
                          sx={{ color: tokens.color.textMuted, fontSize: 12 }}
                        >
                          {loc?.address ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>{vendorALabel}</TableCell>
                      <TableCell>{vendorBLabel}</TableCell>
                      <TableCell>
                        {item.evidenceA.length} / {item.evidenceB.length}
                      </TableCell>
                      <TableCell>{createdAt}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={item.status}
                          sx={{ borderRadius: 0 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Xem hồ sơ">
                          <IconButton onClick={() => void show(item._id)}>
                            <VisibilityOutlinedIcon />
                          </IconButton>
                        </Tooltip>
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
            onPageChange={(_, nextPage) => changePage(nextPage)}
          />
        </AdminCard>
      )}
      <DisputeDetailDrawer
        open={Boolean(selected)}
        item={selected}
        saving={saving}
        error={drawerError}
        readOnly={!isQueue}
        onClose={() => setSelected(null)}
        onResolve={(outcome, reason) => void run(outcome, reason)}
      />
    </Box>
  );
}
