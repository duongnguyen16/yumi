'use client';

import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Alert, Box, CircularProgress, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { ActionButton } from '@/components/admin/ActionButton';
import { AdminCard } from '@/components/admin/AdminCard';
import { EmptyState } from '@/components/admin/EmptyState';
import { Topbar } from '@/components/admin/Topbar';
import { getDisputeDetail, getDisputeQueue, resolveDispute, type AdminDispute } from '@/lib/admin-api';
import { tokens } from '@/theme/admin-tokens';
import { DisputeDetailDrawer } from './components/DisputeDetailDrawer';

function message(err: unknown) {
  const data = err as { response?: { data?: { message?: string | string[] } }; message?: string };
  const value = data.response?.data?.message;
  return Array.isArray(value) ? value.join(', ') : value ?? data.message ?? 'Đã xảy ra lỗi';
}

export default function DisputesPage() {
  const [items, setItems] = useState<AdminDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminDispute | null>(null);
  const [saving, setSaving] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getDisputeQueue();
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
        const data = await getDisputeQueue();
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
      await load();
    } catch (err) {
      setDrawerError(message(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, flex: 1, minWidth: 0 }}>
      <Topbar title="Tranh chấp sở hữu" subtitle={`${items.length} hồ sơ đang chờ`} actions={<ActionButton variant="neutral" onClick={() => void load()}>Tải lại</ActionButton>} />
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress sx={{ color: tokens.color.orange }} /></Box>
      ) : (
        <AdminCard>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead><TableRow><TableCell>Địa điểm</TableCell><TableCell>Vendor A</TableCell><TableCell>Vendor B</TableCell><TableCell>Bằng chứng</TableCell><TableCell>Ngày tạo</TableCell><TableCell align="right">Xem</TableCell></TableRow></TableHead>
              <TableBody>
                {items.length === 0 && <TableRow><TableCell colSpan={6}><EmptyState icon={<InboxOutlinedIcon />} title="Không có tranh chấp" subtitle="Hàng đợi hiện đang trống." /></TableCell></TableRow>}
                {items.map((item) => {
                  const loc = typeof item.locationId === 'object' ? item.locationId : null;
                  const a = typeof item.vendorAId === 'object' ? item.vendorAId : null;
                  const b = typeof item.vendorBId === 'object' ? item.vendorBId : null;
                  return <TableRow key={item._id} hover><TableCell><Typography sx={{ fontWeight: 700 }}>{loc?.name ?? 'Không rõ'}</Typography><Typography sx={{ color: tokens.color.textMuted, fontSize: 12 }}>{loc?.address ?? '—'}</Typography></TableCell><TableCell>{a?.fullName ?? a?.email ?? '—'}</TableCell><TableCell>{b?.fullName ?? b?.email ?? '—'}</TableCell><TableCell>{item.evidenceA.length} / {item.evidenceB.length}</TableCell><TableCell>{item.createdAt ? dayjs(item.createdAt).format('DD/MM/YYYY HH:mm') : '—'}</TableCell><TableCell align="right"><Tooltip title="Xem hồ sơ"><IconButton onClick={() => void show(item._id)}><VisibilityOutlinedIcon /></IconButton></Tooltip></TableCell></TableRow>;
                })}
              </TableBody>
            </Table>
          </Box>
        </AdminCard>
      )}
      <DisputeDetailDrawer open={Boolean(selected)} item={selected} saving={saving} error={drawerError} onClose={() => setSelected(null)} onResolve={(outcome, reason) => void run(outcome, reason)} />
    </Box>
  );
}
