'use client';

import { useState } from 'react';
import { Alert, Box, Chip, Link, Stack, TextField, Typography } from '@mui/material';
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import { ActionButton } from '@/components/admin/ActionButton';
import { DetailDrawer } from '@/components/admin/DetailDrawer';
import type { AdminDispute, DecisionEvidence, DecisionUser } from '@/lib/admin-api';
import { tokens } from '@/theme/admin-tokens';

type Outcome = 'KEEP' | 'TRANSFER' | 'REVOKE';

interface Props {
  open: boolean;
  item: AdminDispute | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onResolve: (outcome: Outcome, reason: string) => void;
}

export function DisputeDetailDrawer({
  open,
  item,
  saving,
  error,
  onClose,
  onResolve,
}: Props) {
  const [outcome, setOutcome] = useState<Outcome>('KEEP');
  const [reason, setReason] = useState('');
  const loc = typeof item?.locationId === 'object' ? item.locationId : null;
  const a = typeof item?.vendorAId === 'object' ? item.vendorAId : null;
  const b = typeof item?.vendorBId === 'object' ? item.vendorBId : null;

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title="Hồ sơ tranh chấp"
      width={520}
      preview={<GavelOutlinedIcon sx={{ fontSize: 64, color: tokens.color.orange }} />}
      footer={
        <>
          <ActionButton variant="neutral" onClick={onClose} disabled={saving} sx={{ flex: 1 }}>
            Đóng
          </ActionButton>
          <ActionButton
            variant="approve"
            disabled={saving || reason.trim().length < 5}
            onClick={() => onResolve(outcome, reason.trim())}
            sx={{ flex: 1.5 }}
          >
            {saving ? 'Đang xử lý' : 'Xác nhận'}
          </ActionButton>
        </>
      }
    >
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="overline">Địa điểm</Typography>
          <Typography sx={{ fontSize: 20, fontWeight: 700 }}>{loc?.name ?? 'Không rõ'}</Typography>
          <Typography sx={{ color: tokens.color.textSecondary, fontSize: 13 }}>
            {loc?.address ?? 'Chưa có địa chỉ'}
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Party title="Vendor A · Chủ hiện tại" user={a} files={item?.evidenceA ?? []} />
          <Party title="Vendor B · Người yêu cầu" user={b} files={item?.evidenceB ?? []} />
        </Stack>
        <Box>
          <Typography variant="overline">Phán quyết</Typography>
          <Stack direction="row" sx={{ gap: 1, mt: 1, flexWrap: 'wrap' }}>
            {(['KEEP', 'TRANSFER', 'REVOKE'] as Outcome[]).map((value) => (
              <Chip
                key={value}
                label={value}
                onClick={() => setOutcome(value)}
                sx={{
                  borderRadius: 0,
                  bgcolor: outcome === value ? tokens.color.orange : tokens.color.inputBg,
                  color: outcome === value ? '#fff' : tokens.color.textPrimary,
                  fontWeight: 700,
                }}
              />
            ))}
          </Stack>
        </Box>
        <TextField
          fullWidth
          multiline
          minRows={3}
          label="Lý do phán quyết"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          helperText="Tối thiểu 5 ký tự"
        />
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </DetailDrawer>
  );
}

function Party({ title, user, files }: { title: string; user: DecisionUser | null; files: DecisionEvidence[] }) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, border: `1px solid ${tokens.color.border}`, p: 1.5 }}>
      <Typography variant="overline">{title}</Typography>
      <Typography sx={{ fontWeight: 700 }}>{user?.fullName ?? user?.email ?? 'Không rõ'}</Typography>
      <Typography sx={{ color: tokens.color.textMuted, fontSize: 12, mb: 1 }}>{user?.email ?? '—'}</Typography>
      <Stack spacing={0.75}>
        {files.map((file, index) => (
          <Link key={`${file.url}-${index}`} href={file.url} target="_blank" rel="noreferrer" sx={{ fontSize: 12 }}>
            {file.fileType} {index + 1}
          </Link>
        ))}
        {files.length === 0 && <Typography sx={{ color: tokens.color.textMuted, fontSize: 12 }}>Chưa có bằng chứng</Typography>}
      </Stack>
    </Box>
  );
}
