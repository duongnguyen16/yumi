'use client';

import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Alert, Box, Chip, CircularProgress, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { ActionButton } from '@/components/admin/ActionButton';
import { AdminCard } from '@/components/admin/AdminCard';
import { EmptyState } from '@/components/admin/EmptyState';
import { Topbar } from '@/components/admin/Topbar';
import { getAppealDetail, getAppealQueue, resolveAppeal, type AdminAppeal } from '@/lib/admin-api';
import { tokens } from '@/theme/admin-tokens';
import { AppealDetailDrawer } from './components/AppealDetailDrawer';

type Decision = 'ACCEPTED_TO_DISPUTE' | 'OVERTURNED' | 'UPHELD';

function message(err: unknown) {
  const data = err as { response?: { data?: { message?: string | string[] } }; message?: string };
  const value = data.response?.data?.message;
  return Array.isArray(value) ? value.join(', ') : value ?? data.message ?? 'Đã xảy ra lỗi';
}

export default function AppealsPage() {
  const [items, setItems] = useState<AdminAppeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminAppeal | null>(null);
  const [saving, setSaving] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getAppealQueue();
      setItems(data.items);
      setError(null);
    } catch (err) {
      setError(message(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const data = await getAppealQueue();
        if (!active) return;
        setItems(data.items);
        setError(null);
      } catch (err) {
        if (active) setError(message(err));
      } finally {
        if (active) setLoading(false);
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, []);

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
      await load();
    } catch (err) {
      setDrawerError(message(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, flex: 1, minWidth: 0 }}>
      <Topbar title="Kháng cáo" subtitle={`${items.length} hồ sơ đang chờ`} actions={<ActionButton variant="neutral" onClick={() => void load()}>Tải lại</ActionButton>} />
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
                {items.length === 0 && <TableRow><TableCell colSpan={6}><EmptyState icon={<InboxOutlinedIcon />} title="Không có kháng cáo" subtitle="Hàng đợi hiện đang trống." /></TableCell></TableRow>}
                {items.map((item) => {
                  const user = typeof item.appellantId === 'object' ? item.appellantId : null;
                  return <TableRow key={item._id} hover><TableCell><Typography sx={{ fontWeight: 700 }}>{item.type}</Typography></TableCell><TableCell>{user?.fullName ?? user?.email ?? '—'}</TableCell><TableCell sx={{ maxWidth: 320 }}><Typography noWrap>{item.argument}</Typography></TableCell><TableCell>{dayjs(item.appealDeadline).format('DD/MM/YYYY HH:mm')}</TableCell><TableCell><Chip size="small" label={item.status} sx={{ borderRadius: 0 }} /></TableCell><TableCell align="right"><Tooltip title="Xem hồ sơ"><IconButton onClick={() => void show(item._id)}><VisibilityOutlinedIcon /></IconButton></Tooltip></TableCell></TableRow>;
                })}
              </TableBody>
            </Table>
          </Box>
        </AdminCard>
      )}
      <AppealDetailDrawer key={selected?._id ?? 'closed'} open={Boolean(selected)} item={selected} saving={saving} error={drawerError} onClose={() => setSelected(null)} onResolve={(decision, reason) => void run(decision, reason)} />
    </Box>
  );
}
