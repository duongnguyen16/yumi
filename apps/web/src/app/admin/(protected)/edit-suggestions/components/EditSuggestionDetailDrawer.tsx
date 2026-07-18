'use client';

import { useState } from 'react';
import { Alert, Box, Divider, Stack, TextField, Typography } from '@mui/material';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import { ActionButton } from '@/components/admin/ActionButton';
import { DetailDrawer } from '@/components/admin/DetailDrawer';
import {
  editSuggestionFieldLabel,
  editSuggestionValue,
} from '@/components/admin/edit-suggestion-labels';
import type { AdminEditSuggestion } from '@/lib/admin-api';
import { tokens } from '@/theme/admin-tokens';

interface Props {
  open: boolean;
  suggestion: AdminEditSuggestion | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onApply: () => void;
  onDiscard: (reason?: string) => void;
}

export function EditSuggestionDetailDrawer({
  open,
  suggestion,
  saving,
  error,
  onClose,
  onApply,
  onDiscard,
}: Props) {
  const [discarding, setDiscarding] = useState(false);
  const [reason, setReason] = useState('');
  const user =
    suggestion?.user && typeof suggestion.user === 'object'
      ? suggestion.user
      : null;
  const note = getNote(suggestion?.newValue);
  const fieldName = suggestion?.fieldName;

  function close() {
    if (saving) return;
    setDiscarding(false);
    setReason('');
    onClose();
  }

  function back() {
    setDiscarding(false);
    setReason('');
  }

  return (
    <DetailDrawer
      open={open}
      onClose={close}
      title="Duyệt đề xuất chỉnh sửa"
      width={520}
      footer={
        discarding ? (
          <>
            <ActionButton
              variant="neutral"
              disabled={saving}
              onClick={back}
              sx={{ flex: 1 }}
            >
              Quay lại
            </ActionButton>
            <ActionButton
              variant="reject"
              disabled={saving}
              onClick={() => onDiscard(reason.trim() || undefined)}
              sx={{ flex: 1.5 }}
            >
              {saving ? 'Đang xử lý' : 'Xác nhận bỏ qua'}
            </ActionButton>
          </>
        ) : (
          <>
            <ActionButton
              variant="reject"
              disabled={saving}
              onClick={() => setDiscarding(true)}
              sx={{ flex: 1 }}
            >
              Bỏ qua
            </ActionButton>
            <ActionButton
              variant="approve"
              disabled={saving}
              onClick={onApply}
              sx={{ flex: 1 }}
            >
              {saving ? 'Đang xử lý' : 'Áp dụng'}
            </ActionButton>
          </>
        )
      }
    >
      <Stack spacing={2.5}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              bgcolor: tokens.color.orangeSoft,
              color: tokens.color.orange,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <EditNoteOutlinedIcon />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
              {suggestion?.location?.name ?? 'Không rõ địa điểm'}
            </Typography>
            <Typography sx={{ color: tokens.color.textSecondary, fontSize: 13 }}>
              {suggestion?.location?.address ?? 'Chưa có địa chỉ'}
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ border: `1px solid ${tokens.color.border}` }}>
          <Meta
            label="Người đề xuất"
            value={user?.fullName ?? user?.email ?? 'Không rõ người dùng'}
          />
          <Divider />
          <Meta label="Email" value={user?.email ?? '—'} />
          <Divider />
          <Meta
            label="Trường chỉnh sửa"
            value={editSuggestionFieldLabel(fieldName)}
          />
          <Divider />
          <Meta label="Trạng thái địa điểm" value={suggestion?.location?.status ?? '—'} />
        </Box>

        <Box>
          <Typography variant="overline">So sánh thay đổi</Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ mt: 0.75 }}
          >
            <ValuePanel
              label="Thông tin hiện tại"
              value={editSuggestionValue(suggestion?.oldValue)}
            />
            <ValuePanel
              label="Thông tin đề xuất"
              value={editSuggestionValue(suggestion?.newValue)}
              proposed
            />
          </Stack>
        </Box>

        {(fieldName === 'name' || fieldName === 'address') && (
          <Alert severity="info">
            Áp dụng thay đổi này sẽ tạo phiếu duyệt lại và chưa cập nhật dữ liệu công khai ngay.
          </Alert>
        )}

        {fieldName === 'flag' && (
          <Alert severity="warning">
            Cờ đóng cửa hoặc không tồn tại sẽ ẩn địa điểm. Cờ trùng lặp sẽ chuyển sang luồng kiểm tra trùng.
          </Alert>
        )}

        {note && (
          <Box>
            <Typography variant="overline">Ghi chú của người đề xuất</Typography>
            <Typography
              sx={{
                mt: 0.75,
                p: 1.5,
                bgcolor: tokens.color.inputBg,
                color: tokens.color.textDescription,
                whiteSpace: 'pre-wrap',
              }}
            >
              {note}
            </Typography>
          </Box>
        )}

        {discarding && (
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label="Lý do bỏ qua"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            helperText="Không bắt buộc, tối đa 500 ký tự"
            slotProps={{ htmlInput: { maxLength: 500 } }}
          />
        )}

        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </DetailDrawer>
  );
}

function getNote(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const note = (value as Record<string, unknown>).note;
  return typeof note === 'string' && note.trim() ? note.trim() : null;
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <Stack
      direction="row"
      sx={{ justifyContent: 'space-between', gap: 2, px: 1.5, py: 1.25 }}
    >
      <Typography variant="overline" sx={{ color: tokens.color.textMuted }}>
        {label}
      </Typography>
      <Typography
        sx={{
          color: tokens.color.textSecondary,
          fontSize: 13,
          textAlign: 'right',
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

function ValuePanel({
  label,
  value,
  proposed = false,
}: {
  label: string;
  value: string;
  proposed?: boolean;
}) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        border: `1px solid ${proposed ? tokens.color.green : tokens.color.border}`,
        bgcolor: proposed ? tokens.color.sage : tokens.color.rowSubTint,
        p: 1.5,
      }}
    >
      <Typography
        variant="overline"
        sx={{ color: proposed ? tokens.color.sageText : tokens.color.textMuted }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          mt: 0.75,
          color: tokens.color.textPrimary,
          fontWeight: proposed ? 700 : 500,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
