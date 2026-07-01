'use client';

import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { tokens } from '@/theme/admin-tokens';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        gap: 1.5,
        textAlign: 'center',
        px: 3,
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: 0,
          bgcolor: tokens.color.sage,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: tokens.color.sageText,
        }}
      >
        {icon}
      </Box>
      <Typography sx={{ fontWeight: 700, color: tokens.color.textPrimary }}>
        {title}
      </Typography>
      {subtitle && <Typography variant="body2">{subtitle}</Typography>}
    </Box>
  );
}
