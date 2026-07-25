'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  type SxProps,
  type Theme,
} from '@mui/material';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import dayjs from 'dayjs';
import {
  getDashboardOverview,
  type DashboardOverview,
} from '@/lib/admin-api';
import { Topbar } from '@/components/admin/Topbar';
import { AdminCard } from '@/components/admin/AdminCard';
import { EmptyState } from '@/components/admin/EmptyState';
import { tokens } from '@/theme/admin-tokens';

function extractMessage(err: unknown): string {
  const e = err as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return e?.response?.data?.message ?? e?.message ?? 'Đã xảy ra lỗi';
}

const headSx: SxProps<Theme> = {
  fontFamily: tokens.font.mono,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: tokens.color.textSecondary,
  borderBottom: `1px solid ${tokens.color.border}`,
  py: 2,
  whiteSpace: 'nowrap',
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  total: number;
  details: { label: string; value: number; color?: string }[];
}

function StatCard({ icon, label, total, details }: StatCardProps) {
  return (
    <AdminCard
      sx={{
        flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 10px)', md: '1 1 calc(25% - 12px)' },
        p: 2.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        animation: 'admin-fade-in 320ms ease both',
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 0,
            bgcolor: tokens.color.orangeSoft,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: tokens.color.orange,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: tokens.font.mono,
              fontSize: 26,
              fontWeight: 700,
              color: tokens.color.textPrimary,
              lineHeight: 1.1,
            }}
          >
            {total.toLocaleString()}
          </Typography>
          <Typography
            sx={{
              fontSize: 13,
              color: tokens.color.textSecondary,
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </Typography>
        </Box>
      </Stack>

      {details.length > 0 && (
        <Stack
          spacing={0.75}
          sx={{
            borderTop: `1px solid ${tokens.color.border}`,
            pt: 1.5,
          }}
        >
          {details.map((d) => (
            <Stack
              key={d.label}
              direction="row"
              sx={{ justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Typography
                sx={{
                  fontSize: 12,
                  color: tokens.color.textSecondary,
                  fontFamily: tokens.font.mono,
                }}
              >
                {d.label}
              </Typography>
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: tokens.font.mono,
                  color: d.color ?? tokens.color.textPrimary,
                }}
              >
                {d.value.toLocaleString()}
              </Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </AdminCard>
  );
}

function toEntries(map: Record<string, number>): { label: string; value: number }[] {
  return Object.entries(map).map(([key, value]) => ({ label: key, value }));
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getDashboardOverview();
      setData(res.data);
    } catch (err) {
      setError(extractMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await getDashboardOverview();
        if (!active) return;
        setData(res.data);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(extractMessage(err));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [fetchOverview]);

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Topbar
        title="Tổng quan"
        subtitle="Dashboard quản trị"
      />

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2, borderRadius: 0 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {loading ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            py: 8,
          }}
        >
          <CircularProgress sx={{ color: tokens.color.orange }} />
        </Box>
      ) : !data ? (
        <AdminCard sx={{ borderRadius: 0 }}>
          <EmptyState
            icon={<InboxOutlinedIcon sx={{ fontSize: 26 }} />}
            title="Không có dữ liệu"
            subtitle="Không thể tải dữ liệu tổng quan."
          />
        </AdminCard>
      ) : (
        <Stack spacing={3} sx={{ animation: 'admin-fade-in 320ms ease both' }}>
          {/* Summary cards */}
          <Stack
            direction="row"
            sx={{
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <StatCard
              icon={<PeopleOutlinedIcon />}
              label="Người dùng"
              total={data.users.total}
              details={toEntries(data.users.byRole)}
            />
            <StatCard
              icon={<PlaceOutlinedIcon />}
              label="Địa điểm"
              total={data.locations.total}
              details={[
                {
                  label: 'Đã xuất bản',
                  value: data.locations.byStatus['PUBLISHED'] ?? 0,
                  color: tokens.color.green,
                },
                {
                  label: 'Đang chờ',
                  value: data.locations.byStatus['SUBMITTED'] ?? 0,
                  color: tokens.color.orange,
                },
                {
                  label: 'Đã ẩn',
                  value: data.locations.byStatus['HIDDEN'] ?? 0,
                  color: tokens.color.textMuted,
                },
              ]}
            />
            <StatCard
              icon={<RateReviewOutlinedIcon />}
              label="Đánh giá"
              total={data.reviews.total}
              details={[
                {
                  label: 'Đã xuất bản',
                  value: data.reviews.byStatus['PUBLISHED'] ?? 0,
                  color: tokens.color.green,
                },
              ]}
            />
            <StatCard
              icon={<FlagOutlinedIcon />}
              label="Báo cáo"
              total={data.reports.total}
              details={[
                {
                  label: 'Đang chờ',
                  value: data.reports.byStatus['PENDING'] ?? 0,
                  color: tokens.color.orange,
                },
                {
                  label: 'Đã xử lý',
                  value:
                    (data.reports.byStatus['RESOLVED'] ?? 0) +
                    (data.reports.byStatus['APPROVED'] ?? 0) +
                    (data.reports.byStatus['REJECTED'] ?? 0),
                  color: tokens.color.green,
                },
              ]}
            />
          </Stack>

          {/* Recent Activity */}
          <AdminCard
            sx={{
              borderRadius: 0,
              animation: 'admin-fade-in 320ms ease 120ms both',
            }}
          >
            <Box sx={{ p: 2.5, pb: 0 }}>
              <Typography
                sx={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: tokens.color.textPrimary,
                }}
              >
                Hoạt động gần đây
              </Typography>
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: tokens.color.card }}>
                    <TableCell sx={headSx}>Thời gian</TableCell>
                    <TableCell sx={headSx}>Người thực hiện</TableCell>
                    <TableCell sx={headSx}>Hành động</TableCell>
                    <TableCell sx={headSx}>Đối tượng</TableCell>
                    <TableCell sx={headSx}>Lý do</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.recentActivity.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ borderBottom: 'none' }}>
                        <EmptyState
                          icon={<InboxOutlinedIcon sx={{ fontSize: 26 }} />}
                          title="Chưa có hoạt động"
                          subtitle="Các thao tác quản trị sẽ được ghi lại ở đây."
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.recentActivity.map((log) => (
                      <TableRow
                        key={log._id}
                        sx={{
                          '&:hover': {
                            bgcolor: `${tokens.color.rowHover} !important`,
                          },
                        }}
                      >
                        <TableCell sx={{ py: 2, whiteSpace: 'nowrap' }}>
                          <Typography
                            sx={{
                              fontFamily: tokens.font.mono,
                              fontSize: 13,
                              color: tokens.color.textSecondary,
                            }}
                          >
                            {dayjs(log.createdAt).format('DD/MM/YYYY HH:mm')}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Typography
                            sx={{
                              fontSize: 14,
                              color: tokens.color.textPrimary,
                              fontWeight: 500,
                            }}
                          >
                            {log.actorId?.fullName || log.actorId?.email || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Typography
                            sx={{
                              fontFamily: tokens.font.mono,
                              fontSize: 12,
                              color: tokens.color.orange,
                              fontWeight: 600,
                            }}
                          >
                            {log.action}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Typography
                            sx={{
                              fontSize: 14,
                              color: tokens.color.textSecondary,
                            }}
                          >
                            {log.targetCollection}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2, maxWidth: 240 }}>
                          <Typography
                            sx={{
                              fontSize: 13,
                              color: tokens.color.textDescription,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {log.reason || '—'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Box>
          </AdminCard>
        </Stack>
      )}
    </Box>
  );
}
