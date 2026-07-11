'use client';

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import { Sidebar } from '@/components/admin/Sidebar';
import { SidebarContext } from '@/components/admin/sidebar-context';
import { getAccessToken, isAdmin } from '@/lib/auth';
import { tokens } from '@/theme/admin-tokens';

export default function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const canAccess = useSyncExternalStore(
    () => () => {},
    () => Boolean(getAccessToken() && isAdmin()),
    () => false,
  );

  useEffect(() => {
    if (!canAccess) {
      router.replace('/admin/login');
    }
  }, [canAccess, router]);

  if (!canAccess) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: tokens.color.bg,
        }}
      >
        <CircularProgress size={28} sx={{ color: tokens.color.orange }} />
      </Box>
    );
  }

  return (
    <SidebarContext.Provider value={{ openMobile: () => setMobileOpen(true) }}>
      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
          bgcolor: tokens.color.bg,
        }}
      >
        <Sidebar
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </Box>
      </Box>
    </SidebarContext.Provider>
  );
}
