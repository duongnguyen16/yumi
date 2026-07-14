'use client';

import {
  Box,
  Stack,
  Typography,
  Avatar,
  IconButton,
  List,
  Drawer,
  useMediaQuery,
  type Theme,
} from '@mui/material';
import type { ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import RuleOutlinedIcon from '@mui/icons-material/RuleOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { SidebarItem } from './SidebarItem';
import { tokens } from '@/theme/admin-tokens';
import { clearAuth, getStoredUser } from '@/lib/auth';

interface NavItem {
  icon: ReactNode;
  label: string;
  href?: string;
}

const NAV: NavItem[] = [
  {
    icon: <DashboardOutlinedIcon />,
    label: 'Tổng quan',
    href: '/admin/dashboard',
  },
  {
    icon: <LocationOnOutlinedIcon />,
    label: 'Duyệt địa điểm',
    href: '/admin/location-requests',
  },
  {
    icon: <HowToRegOutlinedIcon />,
    label: 'Duyệt Claim',
    href: '/admin/claims',
  },
  { icon: <FlagOutlinedIcon />, label: 'Xử lý Report', href: '/admin/reports' },
  {
    icon: <GavelOutlinedIcon />,
    label: 'Tranh chấp',
    href: '/admin/disputes',
  },
  {
    icon: <RuleOutlinedIcon />,
    label: 'Kháng cáo',
    href: '/admin/appeals',
  },
  { icon: <ManageAccountsOutlinedIcon />, label: 'Quản lí User', href: '/admin/users' },
  {
    icon: <CategoryOutlinedIcon />,
    label: 'Quản lí danh mục',
    href: '/admin/categories',
  },
  {
    icon: <HistoryOutlinedIcon />,
    label: 'Lịch sử hoạt động',
    href: '/admin/audit-logs',
  },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  const user = getStoredUser();
  const initial = (
    user?.fullName?.trim()?.[0] ?? user?.email?.trim()?.[0] ?? 'A'
  ).toUpperCase();

  function handleLogout() {
    clearAuth();
    router.replace('/admin/login');
  }

  const content = (
    <Box
      sx={{
        width: 260,
        height: '100%',
        bgcolor: tokens.color.sidebar,
        color: tokens.color.sidebarText,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Brand */}
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ alignItems: 'center', px: 2.5, py: 2.5 }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 0,
            bgcolor: tokens.color.orange,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 6px 16px rgba(233,85,46,0.30)',
          }}
        >
          <PlaceOutlinedIcon sx={{ fontSize: 24 }} />
        </Box>
        <Box>
          <Typography
            sx={{
              color: '#fff',
              fontWeight: 700,
              fontSize: 16,
              lineHeight: 1.1,
            }}
          >
            Yumi
          </Typography>
          <Typography
            sx={{
              fontFamily: tokens.font.mono,
              color: tokens.color.sidebarMuted,
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              mt: 0.25,
            }}
          >
            Admin Panel
          </Typography>
        </Box>
      </Stack>

      {/* Nav */}
      <List
        sx={{
          flex: 1,
          px: 1.5,
          py: 1,
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': { background: '#2c2f35', borderRadius: 0 },
        }}
      >
        {NAV.map((item) => (
          <SidebarItem
            key={item.label}
            icon={item.icon}
            label={item.label}
            href={item.href}
            active={!!item.href && pathname === item.href}
            disabled={!item.href}
          />
        ))}
      </List>

      {/* Admin profile */}
      <Box sx={{ borderTop: '1px solid #2A2C31', p: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: tokens.color.orange,
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {initial}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.fullName || user?.email || 'Admin'}
            </Typography>
            <Typography sx={{ color: tokens.color.sidebarMuted, fontSize: 12 }}>
              {user?.email}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={handleLogout}
            sx={{
              color: tokens.color.sidebarMuted,
              '&:hover': { color: '#fff', bgcolor: tokens.color.sidebarHover },
            }}
          >
            <LogoutOutlinedIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Stack>
      </Box>
    </Box>
  );

  if (lgUp) {
    return (
      <Box
        component="aside"
        sx={{ flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }}
      >
        {content}
      </Box>
    );
  }

  return (
    <Drawer
      variant="temporary"
      anchor="left"
      open={mobileOpen}
      onClose={onMobileClose}
      ModalProps={{ keepMounted: true }}
      slotProps={{
        paper: {
          sx: { bgcolor: tokens.color.sidebar, border: 'none', width: 260 },
        },
      }}
    >
      {content}
    </Drawer>
  );
}
