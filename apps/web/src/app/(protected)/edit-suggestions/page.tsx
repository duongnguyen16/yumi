'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  type SxProps,
  type Theme,
} from '@mui/material';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { AdminCard } from '@/components/admin/AdminCard';
import { EmptyState } from '@/components/admin/EmptyState';
import {
  editSuggestionFieldLabel,
  editSuggestionValue,
} from '@/components/admin/edit-suggestion-labels';
import { Topbar } from '@/components/admin/Topbar';
import {
  applyEditSuggestion,
  discardEditSuggestion,
  getAdminEditSuggestions,
  type AdminEditSuggestion,
  type EditSuggestionActionResponse,
} from '@/lib/admin-api';
import { tilePalette, tokens } from '@/theme/admin-tokens';
import { EditSuggestionDetailDrawer } from './components/EditSuggestionDetailDrawer';

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

function getMessage(error: unknown) {
  const data = error as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };
  const message = data.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  return message ?? data.message ?? 'Đã xảy ra lỗi';
}

export default function EditSuggestionsPage() {
  const [items, setItems] = useState<AdminEditSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminEditSuggestion | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getAdminEditSuggestions()
      .then((response) => {
        if (!active) return;
        setItems(response.suggestions);
        setError(null);
      })
      .catch((loadError) => {
        if (active) setError(getMessage(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const response = await getAdminEditSuggestions();
      setItems(response.suggestions);
    } catch (loadError) {
      setError(getMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  function show(item: AdminEditSuggestion) {
    setSelected(item);
    setDrawerError(null);
    setOpen(true);
  }

  function close() {
    if (saving) return;
    setOpen(false);
    setDrawerError(null);
  }

  async function run(action: () => Promise<EditSuggestionActionResponse>) {
    setSaving(true);
    setDrawerError(null);
    try {
      const response = await action();
      setNotice(response.message);
      setOpen(false);
      setSelected(null);
      await refresh();
    } catch (actionError) {
      setDrawerError(getMessage(actionError));
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
        title="Duyệt chỉnh sửa"
        subtitle={`${items.length} đề xuất cho địa điểm cộng đồng`}
        actions={
          <Button
            variant="outlined"
            startIcon={<RefreshOutlinedIcon />}
            disabled={loading}
            onClick={() => void refresh()}
          >
            Làm mới
          </Button>
        }
      />

      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>
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
        <AdminCard
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            animation: 'admin-fade-in 320ms ease both',
          }}
        >
          <Box sx={{ overflowX: 'auto', flex: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={headSx}>Địa điểm</TableCell>
                  <TableCell sx={headSx}>Người đề xuất</TableCell>
                  <TableCell sx={headSx}>Trường</TableCell>
                  <TableCell sx={headSx}>Hiện tại</TableCell>
                  <TableCell sx={headSx}>Đề xuất</TableCell>
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
                        title="Không có đề xuất đang chờ"
                        subtitle="Đề xuất mới cho địa điểm chưa có chủ sẽ xuất hiện tại đây."
                      />
                    </TableCell>
                  </TableRow>
                )}

                {items.map((item, index) => {
                  const user =
                    item.user && typeof item.user === 'object' ? item.user : null;

                  return (
                    <TableRow
                      key={item.id}
                      hover
                      sx={{
                        animation: 'admin-fade-in 240ms ease both',
                        animationDelay: `${Math.min(index, 12) * 28}ms`,
                      }}
                    >
                      <TableCell sx={{ py: 2, minWidth: 240 }}>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              bgcolor: tilePalette[index % tilePalette.length],
                              color: tokens.color.textDescription,
                              display: 'grid',
                              placeItems: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <EditNoteOutlinedIcon sx={{ fontSize: 21 }} />
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                              {item.location?.name ?? 'Không rõ địa điểm'}
                            </Typography>
                            <Typography
                              sx={{
                                color: tokens.color.textMuted,
                                fontSize: 12,
                                maxWidth: 260,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {item.location?.address ?? 'Chưa có địa chỉ'}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ minWidth: 190 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                          {user?.fullName ?? user?.email ?? 'Không rõ người dùng'}
                        </Typography>
                        <Typography sx={{ color: tokens.color.textMuted, fontSize: 12 }}>
                          {user?.email ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ minWidth: 150 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                          {editSuggestionFieldLabel(item.fieldName)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ minWidth: 180, maxWidth: 260 }}>
                        <ValueText value={editSuggestionValue(item.oldValue)} />
                      </TableCell>
                      <TableCell sx={{ minWidth: 180, maxWidth: 260 }}>
                        <ValueText value={editSuggestionValue(item.newValue)} proposed />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label="Chờ xử lý"
                          sx={{
                            borderRadius: 0,
                            bgcolor: tokens.color.pendingBg,
                            color: tokens.color.pendingText,
                            fontWeight: 700,
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Xem và xử lý">
                          <IconButton
                            size="small"
                            aria-label="Xem đề xuất chỉnh sửa"
                            onClick={() => show(item)}
                          >
                            <VisibilityOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </AdminCard>
      )}

      <EditSuggestionDetailDrawer
        key={selected?.id ?? 'empty'}
        open={open}
        suggestion={selected}
        saving={saving}
        error={drawerError}
        onClose={close}
        onApply={() =>
          selected && run(() => applyEditSuggestion(selected.id))
        }
        onDiscard={(reason) =>
          selected && run(() => discardEditSuggestion(selected.id, reason))
        }
      />
    </Box>
  );
}

function ValueText({ value, proposed = false }: { value: string; proposed?: boolean }) {
  return (
    <Typography
      sx={{
        fontSize: 13,
        color: proposed ? tokens.color.sageText : tokens.color.textSecondary,
        fontWeight: proposed ? 700 : 500,
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: 2,
        overflow: 'hidden',
      }}
    >
      {value}
    </Typography>
  );
}
