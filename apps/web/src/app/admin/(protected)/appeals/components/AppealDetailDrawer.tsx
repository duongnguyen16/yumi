'use client';

import { useState } from 'react';
import { Alert, Box, Chip, Link, Stack, TextField, Typography } from '@mui/material';
import RuleOutlinedIcon from '@mui/icons-material/RuleOutlined';
import { ActionButton } from '@/components/admin/ActionButton';
import { DetailDrawer } from '@/components/admin/DetailDrawer';
import type { AdminAppeal } from '@/lib/admin-api';
import { tokens } from '@/theme/admin-tokens';

type Decision = 'ACCEPTED_TO_DISPUTE' | 'OVERTURNED' | 'UPHELD';

interface Props {
  open: boolean;
  item: AdminAppeal | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onResolve: (decision: Decision, reason: string) => void;
}

export function AppealDetailDrawer({ open, item, saving, error, onClose, onResolve }: Props) {
  const requestAppeal = item?.type === 'REQUEST_ACCESS_REJECTED';
  const decisions: Decision[] = requestAppeal
    ? ['ACCEPTED_TO_DISPUTE', 'UPHELD']
    : ['OVERTURNED', 'UPHELD'];
  const [decision, setDecision] = useState<Decision>(
    requestAppeal ? 'ACCEPTED_TO_DISPUTE' : 'OVERTURNED',
  );
  const [reason, setReason] = useState('');
  const user = typeof item?.appellantId === 'object' ? item.appellantId : null;

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title="Hồ sơ kháng cáo"
      width={500}
      preview={<RuleOutlinedIcon sx={{ fontSize: 64, color: tokens.color.orange }} />}
      footer={
        <>
          <ActionButton variant="neutral" onClick={onClose} disabled={saving} sx={{ flex: 1 }}>Đóng</ActionButton>
          <ActionButton variant="approve" disabled={saving || reason.trim().length < 5} onClick={() => onResolve(decision, reason.trim())} sx={{ flex: 1.5 }}>
            {saving ? 'Đang xử lý' : 'Xác nhận'}
          </ActionButton>
        </>
      }
    >
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="overline">Người kháng cáo</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 18 }}>{user?.fullName ?? user?.email ?? 'Không rõ'}</Typography>
          <Typography sx={{ color: tokens.color.textMuted, fontSize: 12 }}>{user?.email ?? '—'}</Typography>
        </Box>
        <Box sx={{ border: `1px solid ${tokens.color.border}`, p: 1.5 }}>
          <Typography variant="overline">Quyết định gốc</Typography>
          <Typography sx={{ fontWeight: 700 }}>{item?.type ?? '—'}</Typography>
          <Typography sx={{ color: tokens.color.textSecondary, fontSize: 13 }}>{item?.originalDecisionReason ?? 'Không có lý do'}</Typography>
        </Box>
        <Box>
          <Typography variant="overline">Nội dung kháng cáo</Typography>
          <Typography sx={{ fontSize: 14 }}>{item?.argument ?? '—'}</Typography>
        </Box>
        <Box>
          <Typography variant="overline">Bằng chứng bổ sung</Typography>
          <Stack spacing={0.75} sx={{ mt: 0.75 }}>
            {(item?.additionalEvidenceFiles ?? []).map((file, index) => (
              <Link key={`${file.url}-${index}`} href={file.url} target="_blank" rel="noreferrer" sx={{ fontSize: 13 }}>{file.fileType} {index + 1}</Link>
            ))}
          </Stack>
        </Box>
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          {decisions.map((value) => (
            <Chip key={value} label={value} onClick={() => setDecision(value)} sx={{ borderRadius: 0, bgcolor: decision === value ? tokens.color.orange : tokens.color.inputBg, color: decision === value ? '#fff' : tokens.color.textPrimary, fontWeight: 700 }} />
          ))}
        </Stack>
        <TextField fullWidth multiline minRows={3} label="Lý do xử lý" value={reason} onChange={(event) => setReason(event.target.value)} helperText="Tối thiểu 5 ký tự" />
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </DetailDrawer>
  );
}
