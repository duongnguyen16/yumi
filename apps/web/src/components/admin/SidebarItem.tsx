'use client';

import Link from 'next/link';
import {
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Tooltip,
} from '@mui/material';
import type { ReactNode } from 'react';
import { tokens } from '@/theme/admin-tokens';

interface SidebarItemProps {
  icon: ReactNode;
  label: string;
  href?: string;
  active?: boolean;
  disabled?: boolean;
  count?: number;
}

export function SidebarItem({
  icon,
  label,
  href,
  active,
  disabled,
  count,
}: SidebarItemProps) {
  const c = tokens.color;
  const linkProps = !disabled && href ? { component: Link, href } : {};

  const content = (
    <ListItemButton
      {...linkProps}
      disabled={disabled}
      selected={active}
      sx={{
        height: 44,
        borderRadius: 0,
        mb: 0.5,
        px: 1.5,
        color: c.sidebarText,
        transition: `background-color ${tokens.motion.hover} ${tokens.motion.ease}, color ${tokens.motion.hover} ${tokens.motion.ease}`,
        '&:hover': {
          bgcolor: disabled ? 'transparent' : c.sidebarHover,
          color: c.sidebarText,
        },
        '&.Mui-selected': {
          bgcolor: c.sidebarActive,
          color: c.sidebarText,
        },
        '&.Mui-selected:hover': {
          bgcolor: c.sidebarActive,
          color: c.sidebarText,
        },
        '&.Mui-disabled': {
          color: c.sidebarText,
          opacity: 1,
          cursor: 'not-allowed',
        },
        '& .MuiListItemIcon-root': {
          color: `${c.sidebarText} !important`,
        },
        '& .MuiTypography-root': {
          color: `${c.sidebarText} !important`,
          WebkitTextFillColor: c.sidebarText,
        },
        '& .MuiSvgIcon-root': {
          color: `${c.sidebarText} !important`,
        },
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: 36,
          color: c.sidebarText,
          '& .MuiSvgIcon-root': { fontSize: 20 },
        }}
      >
        {icon}
      </ListItemIcon>
      <ListItemText
        primary={label}
        slotProps={{
          primary: {
            sx: {
              color: c.sidebarText,
              WebkitTextFillColor: c.sidebarText,
              fontSize: 14,
              fontWeight: active ? 600 : 500,
            },
          },
        }}
        sx={{ my: 0 }}
      />
      {typeof count === 'number' && count > 0 && (
        <Chip
          label={count}
          size="small"
          sx={{
            bgcolor: c.orange,
            color: '#fff',
            height: 20,
            minWidth: 20,
            fontSize: 11,
            fontWeight: 700,
            '.MuiChip-label': { px: 0.75 },
          }}
        />
      )}
    </ListItemButton>
  );

  if (disabled) {
    return (
      <Tooltip title="Sắp ra mắt" placement="right" arrow>
        <span style={{ display: 'block' }}>{content}</span>
      </Tooltip>
    );
  }

  return content;
}
