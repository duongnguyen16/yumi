'use client';

import { Tab, Tabs } from '@mui/material';
import type { AdminRequestView } from '@/lib/admin-api';
import { tokens } from '@/theme/admin-tokens';

interface Props {
  value: AdminRequestView;
  onChange: (value: AdminRequestView) => void;
}

export function AdminRequestTabs({ value, onChange }: Props) {
  return (
    <Tabs
      value={value}
      onChange={(_, next: AdminRequestView) => onChange(next)}
      sx={{
        mb: 2,
        minHeight: 40,
        borderBottom: `1px solid ${tokens.color.border}`,
        '& .MuiTabs-indicator': { bgcolor: tokens.color.orange, height: 2 },
        '& .MuiTab-root': {
          minHeight: 40,
          px: 2,
          fontWeight: 700,
          color: tokens.color.textMuted,
        },
        '& .Mui-selected': { color: `${tokens.color.textPrimary} !important` },
      }}
    >
      <Tab value="queue" label="Chờ xử lý" />
      <Tab value="history" label="Lịch sử" />
    </Tabs>
  );
}
