'use client';

import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  Tooltip,
  Typography,
  type SxProps,
  type Theme,
} from '@mui/material';
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
  approveClaim,
  getClaimQueue,
  rejectClaim,
  type AdminClaim,
  type AdminRequestView,
} from '@/lib/admin-api';
import { AdminRequestTabs } from '@/components/admin/AdminRequestTabs';
import { ActionButton } from '@/components/admin/ActionButton';
import { AdminCard } from '@/components/admin/AdminCard';
import { EmptyState } from '@/components/admin/EmptyState';
import { Topbar } from '@/components/admin/Topbar';
import { tilePalette, tokens } from '@/theme/admin-tokens';
import { ClaimDetailDrawer } from './components/ClaimDetailDrawer';

const PAGE_SIZE = 20;

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

function getMessage(err: unknown) {
  const data = err as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };
  const message = data.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (message) return message;
  return data.message ?? 'Đã xảy ra lỗi';
}

function getTime(value?: string) {
  if (!value) return '—';
  return dayjs(value).format('DD/MM/YYYY HH:mm');
}

function getPageAfterRemoval(itemCount: number, currentPage: number) {
  if (itemCount === 1 && currentPage > 1) {
    return currentPage - 1;
  }
  return currentPage;
}

function getVendorLabel(vendor: { fullName?: string; email?: string } | null) {
  if (!vendor) return '—';
  const label = vendor.fullName ?? vendor.email;
  return label ?? '—';
}

function getVerificationLabel(flags: AdminClaim['flags']) {
  if (flags.otpVerified) return 'OTP hợp lệ';
  if (flags.needsAdminScrutiny) return 'No-phone';
  return 'Chưa xác minh';
}

export default function ClaimsPage() {
  const [items, setItems] = useState<AdminClaim[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<AdminRequestView>('queue');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminClaim | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  const load = useCallback(
    async (nextPage: number, nextView: AdminRequestView) => {
      try {
        const data = await getClaimQueue(nextPage, PAGE_SIZE, nextView);
        setItems(data.items);
        setTotal(data.total);
        setPage(data.page);
        setError(null);
      } catch (err) {
        setError(getMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    let active = true;

    async function loadInitialPage() {
      try {
        const data = await getClaimQueue(1, PAGE_SIZE, view);
        if (!active) return;
        setItems(data.items);
        setTotal(data.total);
        setPage(data.page);
        setError(null);
      } catch (err) {
        if (active) setError(getMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadInitialPage();
    return () => {
      active = false;
    };
  }, [view]);

  function show(claim: AdminClaim) {
    setSelected(claim);
    setDrawerError(null);
    setOpen(true);
  }

  function close() {
    if (saving) return;
    setOpen(false);
    setSelected(null);
    setDrawerError(null);
  }

  async function run(action: () => Promise<{ message: string }>) {
    setSaving(true);
    setDrawerError(null);
    try {
      const result = await action();
      setNotice(result.message);
      setOpen(false);
      setSelected(null);
      const nextPage = getPageAfterRemoval(items.length, page);
      await load(nextPage, view);
    } catch (err) {
      setDrawerError(getMessage(err));
    } finally {
      setSaving(false);
    }
  }

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
        title="Duyệt Claim"
        subtitle={
          view === 'queue'
            ? `${total} yêu cầu đang chờ`
            : `${total} yêu cầu trong lịch sử`
        }
        actions={
          <ActionButton
            variant="neutral"
            onClick={() => void load(page, view)}
            sx={{ borderRadius: 0, height: 44 }}
          >
            Tải lại
          </ActionButton>
        }
      />

      <AdminRequestTabs
        value={view}
        onChange={(nextView) => {
          close();
          setLoading(true);
          setPage(1);
          setView(nextView);
        }}
      />

      {notice && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setNotice(null)}
        >
          {notice}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: tokens.color.orange }} />
        </Box>
      ) : (
        <AdminCard sx={{ flex: 1, borderRadius: 0 }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={headSx}>Địa điểm</TableCell>
                  <TableCell sx={headSx}>Vendor</TableCell>
                  <TableCell sx={headSx}>Xác minh</TableCell>
                  <TableCell sx={headSx}>Bằng chứng</TableCell>
                  <TableCell sx={headSx}>Gửi lúc</TableCell>
                  <TableCell sx={headSx}>Trạng thái</TableCell>
                  <TableCell sx={headSx} align="right">
                    Hành động
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ borderBottom: 'none' }}>
                      <EmptyState
                        icon={<InboxOutlinedIcon sx={{ fontSize: 26 }} />}
                        title={
                          view === 'queue'
                            ? 'Không có claim chờ duyệt'
                            : 'Chưa có lịch sử claim'
                        }
                        subtitle={
                          view === 'queue'
                            ? 'Hàng đợi hiện đang trống.'
                            : 'Chưa có claim nào đã xử lý.'
                        }
                      />
                    </TableCell>
                  </TableRow>
                )}
                {items.map((claim, index) => {
                  const loc =
                    claim.locationId && typeof claim.locationId === 'object'
                      ? claim.locationId
                      : null;
                  const vendor =
                    claim.vendorId && typeof claim.vendorId === 'object'
                      ? claim.vendorId
                      : null;
                  const flags = claim.flags;
                  const vendorLabel = getVendorLabel(vendor);
                  const verificationLabel = getVerificationLabel(flags);

                  return (
                    <TableRow
                      key={claim._id}
                      hover
                      sx={{
                        animation: 'admin-fade-in 240ms ease both',
                        animationDelay: `${Math.min(index, 12) * 28}ms`,
                      }}
                    >
                      <TableCell sx={{ py: 2, minWidth: 230 }}>
                        <Stack
                          direction="row"
                          spacing={1.25}
                          sx={{ alignItems: 'center' }}
                        >
                          <Box
                            sx={{
                              width: 38,
                              height: 38,
                              bgcolor: tilePalette[index % tilePalette.length],
                              display: 'grid',
                              placeItems: 'center',
                              color: tokens.color.textDescription,
                              flexShrink: 0,
                            }}
                          >
                            <HowToRegOutlinedIcon sx={{ fontSize: 20 }} />
                          </Box>
                          <Box>
                            <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                              {loc?.name ?? 'Không rõ địa điểm'}
                            </Typography>
                            <Typography
                              sx={{
                                color: tokens.color.textMuted,
                                fontSize: 12,
                              }}
                            >
                              {loc?.address ?? 'Chưa có địa chỉ'}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                          {vendorLabel}
                        </Typography>
                        <Typography
                          sx={{ color: tokens.color.textMuted, fontSize: 12 }}
                        >
                          {vendor?.email ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={verificationLabel}
                          sx={flagSx(
                            flags.otpVerified || flags.needsAdminScrutiny,
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack
                          direction="row"
                          spacing={0.5}
                          sx={{ flexWrap: 'wrap', gap: 0.5 }}
                        >
                          <Chip
                            size="small"
                            label={
                              flags.hasOnSiteProof ? 'Ảnh tại chỗ' : 'Thiếu ảnh'
                            }
                            sx={flagSx(flags.hasOnSiteProof)}
                          />
                          <Chip
                            size="small"
                            label={flags.hasSiteCode ? 'Có mã' : 'Thiếu mã'}
                            sx={flagSx(flags.hasSiteCode)}
                          />
                          {flags.hasLicense && (
                            <Chip
                              size="small"
                              label="Giấy phép"
                              sx={flagSx(true)}
                            />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            color: tokens.color.textSecondary,
                            fontSize: 13,
                          }}
                        >
                          {getTime(claim.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={claim.status}
                          sx={{ borderRadius: 0 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Stack
                          direction="row"
                          spacing={0.5}
                          sx={{ justifyContent: 'flex-end' }}
                        >
                          <Tooltip title="Xem hồ sơ">
                            <IconButton
                              size="small"
                              onClick={() => show(claim)}
                            >
                              <VisibilityOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {view === 'queue' && (
                            <Tooltip
                              title={
                                flags.eligibleForApprove
                                  ? 'Đủ điều kiện duyệt'
                                  : 'Hồ sơ chưa đủ điều kiện'
                              }
                            >
                              <span>
                                <IconButton
                                  size="small"
                                  disabled={!flags.eligibleForApprove}
                                  onClick={() => show(claim)}
                                  sx={{ color: tokens.color.green }}
                                >
                                  <CheckOutlinedIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
          <TablePagination
            component="div"
            count={total}
            page={Math.max(0, page - 1)}
            rowsPerPage={PAGE_SIZE}
            rowsPerPageOptions={[PAGE_SIZE]}
            onPageChange={(_, nextPage) => {
              setLoading(true);
              void load(nextPage + 1, view);
            }}
          />
        </AdminCard>
      )}

      <ClaimDetailDrawer
        key={selected?._id ?? 'empty'}
        open={open}
        claim={selected}
        saving={saving}
        error={drawerError}
        readOnly={view === 'history'}
        onClose={close}
        onApprove={(reason) =>
          selected && run(() => approveClaim(selected._id, reason))
        }
        onReject={(reason) =>
          selected && run(() => rejectClaim(selected._id, reason))
        }
      />
    </Box>
  );
}

function flagSx(ok: boolean) {
  return {
    height: 22,
    borderRadius: 0,
    fontSize: 11,
    fontWeight: 700,
    bgcolor: ok ? tokens.color.sage : tokens.color.redSoftBg,
    color: ok ? tokens.color.sageText : tokens.color.red,
    border: `1px solid ${ok ? tokens.color.sage : tokens.color.redSoftBorder}`,
  };
}
