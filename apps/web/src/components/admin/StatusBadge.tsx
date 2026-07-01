'use client';

import { Chip } from '@mui/material';
import { tokens } from '@/theme/admin-tokens';

export function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Chip
      label="Hoạt động"
      size="small"
      sx={{
        bgcolor: tokens.color.sage,
        color: tokens.color.sageText,
        fontWeight: 600,
      }}
    />
  ) : (
    <Chip
      label="Ẩn"
      size="small"
      variant="outlined"
      sx={{
        bgcolor: 'transparent',
        color: tokens.color.textMuted,
        borderColor: tokens.color.border,
        fontWeight: 600,
      }}
    />
  );
}
