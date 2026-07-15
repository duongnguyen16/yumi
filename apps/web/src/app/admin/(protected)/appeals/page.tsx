'use client';

import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Alert, Box, Chip, CircularProgress, IconButton, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, Tooltip, Typography } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { ActionButton } from '@/components/admin/ActionButton';
import { AdminCard } from '@/components/admin/AdminCard';
import { EmptyState } from '@/components/admin/EmptyState';
import { Topbar } from '@/components/admin/Topbar';
import { getAppealDetail, getAppealQueue, resolveAppeal, type AdminAppeal, type AdminRequestView } from '@/lib/admin-api';
import { AdminRequestTabs } from '@/components/admin/AdminRequestTabs';
import { tokens } from '@/theme/admin-tokens';
import { AppealDetailDrawer } from './components/AppealDetailDrawer';

type Decision = 'ACCEPTED_TO_DISPUTE' | 'OVERTURNED' | 'UPHELD';

const PAGE_SIZE = 20;

function message(err: unknown) {
  const data = err as { response?: { data?: { message?: string | string[] } }; message?: string };
  const value = data.response?.data?.message;
  return Array.isArray(value) ? value.join(', ') : value ?? data.message ?? 'Đã xảy ra lỗi';
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
    setLoading(true);
    void load(1, view);
  }, [load, view]);

  async function show(id: string) {
    try {
      setSelected(await getAppealDetail(id));
      setDrawerError(null);
    } catch (err) {
      setError(message(err));
    }
  }

  async function run(decision: Decision, reason: string) {
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
      <Topbar title="Kháng cáo" subtitle={view === 'queue' ? `${total} hồ sơ đang chờ` : `${total} hồ sơ trong lịch sử`} actions={<ActionButton variant="neutral" onClick={() => void load(page, view)}>Tải lại</ActionButton>} />
      <AdminRequestTabs value={view} onChange={(nextView) => { setSelected(null); setPage(1); setView(nextView); }} />
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress sx={{ color: tokens.color.orange }} /></Box>
      ) : (
        <AdminCard>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead><TableRow><TableCell>Loại</TableCell><TableCell>Người kháng cáo</TableCell><TableCell>Nội dung</TableCell><TableCell>Hạn xử lý</TableCell><TableCell>Trạng thái</TableCell><TableCell align="right">Xem</TableCell></TableRow></TableHead>
              <TableBody>
                {items.length === 0 && <TableRow><TableCell colSpan={6}><EmptyState icon={<InboxOutlinedIcon />} title={view === 'queue' ? 'Không có kháng cáo' : 'Chưa có lịch sử kháng cáo'} subtitle={view === 'queue' ? 'Hàng đợi hiện đang trống.' : 'Chưa có kháng cáo nào đã xử lý.'} /></TableCell></TableRow>}
                {items.map((item) => {
                  const user = typeof item.appellantId === 'object' ? item.appellantId : null;
                  return <TableRow key={item._id} hover><TableCell><Typography sx={{ fontWeight: 700 }}>{item.type}</Typography></TableCell><TableCell>{user?.fullName ?? user?.email ?? '—'}</TableCell><TableCell sx={{ maxWidth: 320 }}><Typography noWrap>{item.argument}</Typography></TableCell><TableCell>{dayjs(item.appealDeadline).format('DD/MM/YYYY HH:mm')}</TableCell><TableCell><Chip size="small" label={item.status} sx={{ borderRadius: 0 }} /></TableCell><TableCell align="right"><Tooltip title="Xem hồ sơ"><IconButton onClick={() => void show(item._id)}><VisibilityOutlinedIcon /></IconButton></Tooltip></TableCell></TableRow>;
                })}
              </TableBody>
            </Table>
          </Box>
          <TablePagination component="div" count={total} page={Math.max(0, page - 1)} rowsPerPage={PAGE_SIZE} rowsPerPageOptions={[PAGE_SIZE]} onPageChange={(_, nextPage) => { setLoading(true); void load(nextPage + 1, view); }} />
        </AdminCard>
      )}
      <AppealDetailDrawer key={selected?._id ?? 'closed'} open={Boolean(selected)} item={selected} saving={saving} error={drawerError} readOnly={view === 'history'} onClose={() => setSelected(null)} onResolve={(decision, reason) => void run(decision, reason)} />
    </Box>
  );
}
