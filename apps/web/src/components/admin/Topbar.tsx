'use client';

import { Stack, Typography, Box, IconButton } from '@mui/material';
import type { ReactNode } from 'react';
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined';
import { tokens } from '@/theme/admin-tokens';
import { useSidebar } from './sidebar-context';

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

  export function Topbar({ title, subtitle, actions }: TopbarProps) {
  const { openMobile } = useSidebar();

  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        mb: 3,
        rowGap: 1.5,
        animation: 'admin-fade-in 320ms ease both',
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ alignItems: 'center', minWidth: 0 }}
      >
        <IconButton
          onClick={openMobile}
          sx={{ display: { lg: 'none' }, color: tokens.color.textSecondary }}
          aria-label="Mở menu"
        >
          <MenuOutlinedIcon />
        </IconButton>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: { xs: 20, md: 24 },
              fontWeight: 700,
              color: tokens.color.textPrimary,
              lineHeight: 1.2,
            }}
          >
            {title}
          </Typography>
          {/*{subtitle && (
            <Typography variant="overline" sx={{ display: 'block', mt: 0.25 }}>
              {subtitle}
            </Typography>
          )}*/}
        </Box>
      </Stack>
      {actions && (
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: 'center', flexShrink: 0, maxWidth: '100%' }}
        >
          {actions}
        </Stack>
      )}
    </Stack>
  );
}
