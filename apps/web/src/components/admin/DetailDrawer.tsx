'use client';

import { Drawer, Box, IconButton, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import { tokens } from '@/theme/admin-tokens';

interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  preview?: ReactNode;
  footer?: ReactNode;
  width?: number | string;
  children: ReactNode;
}

export function DetailDrawer({
  open,
  onClose,
  title,
  preview,
  footer,
  width = 380,
  children,
}: DetailDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      transitionDuration={{ enter: 320, exit: 220 }}
      slotProps={{
        transition: {
          style: { transitionTimingFunction: tokens.motion.ease },
        },
      }}
    >
      <Box
        sx={{
          width: { xs: '100vw', sm: width },
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: tokens.color.card,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            height: 56,
            px: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${tokens.color.border}`,
            flexShrink: 0,
          }}
        >
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: 16,
              color: tokens.color.textPrimary,
            }}
          >
            {title}
          </Typography>
          <IconButton size="small" aria-label="Đóng bảng chi tiết" onClick={onClose}>
            <CloseOutlinedIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Scrollable content */}
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {preview && (
            <Box
              sx={{
                height: 180,
                bgcolor: tokens.color.preview,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {preview}
            </Box>
          )}
          <Box sx={{ p: 3 }}>{children}</Box>
        </Box>

        {/* Sticky footer */}
        {footer && (
          <Box
            sx={{
              borderTop: `1px solid ${tokens.color.border}`,
              bgcolor: tokens.color.card,
              p: 2,
              display: 'flex',
              gap: 1.5,
              flexShrink: 0,
            }}
          >
            {footer}
          </Box>
        )}
      </Box>
    </Drawer>
  );
}
