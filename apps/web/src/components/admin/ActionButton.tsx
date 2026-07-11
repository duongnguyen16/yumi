'use client';

import { Button, type ButtonProps } from '@mui/material';
import type { ReactNode } from 'react';
import { tokens } from '@/theme/admin-tokens';

type ActionVariant = 'approve' | 'reject' | 'neutral';

interface ActionButtonProps extends Omit<ButtonProps, 'variant'> {
  variant: ActionVariant;
  icon?: ReactNode;
}

export function ActionButton({
  variant,
  icon,
  children,
  sx,
  ...rest
}: ActionButtonProps) {
  const c = tokens.color;
  const variantStyles: Record<ActionVariant, object> = {
    approve: {
      bgcolor: c.green,
      color: '#fff',
      '&:hover': { bgcolor: c.greenDark },
    },
    reject: {
      bgcolor: '#fff',
      color: c.red,
      border: `1px solid ${c.redSoftBorder}`,
      '&:hover': { bgcolor: c.redSoftBg },
    },
    neutral: {
      bgcolor: '#fff',
      color: c.textSecondary,
      border: `1px solid ${c.border}`,
      '&:hover': { bgcolor: c.rowHover },
    },
  };

  return (
    <Button
      variant="contained"
      disableElevation
      startIcon={icon}
      sx={{ ...variantStyles[variant], ...sx }}
      {...rest}
    >
      {children}
    </Button>
  );
}
