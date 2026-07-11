'use client';

import { Paper, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';
import { tokens } from '@/theme/admin-tokens';

interface AdminCardProps {
  children: ReactNode;
  sx?: SxProps<Theme>;
}

export function AdminCard({ children, sx }: AdminCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: tokens.color.card,
        border: `1px solid ${tokens.color.border}`,
        borderRadius: 0,
        boxShadow: tokens.shadow.card,
        overflow: 'hidden',
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
}
