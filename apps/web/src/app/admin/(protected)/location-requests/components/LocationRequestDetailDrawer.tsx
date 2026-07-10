'use client';

import { useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import { DetailDrawer } from '@/components/admin/DetailDrawer';
import { ActionButton } from '@/components/admin/ActionButton';
import { tokens } from '@/theme/admin-tokens';
import type { AdminLocationRequest } from '@/lib/admin-api';

interface Props {
  open: boolean;
  request: AdminLocationRequest | null;
  startInRejectMode: boolean;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string, duplicateOfLocationId?: string) => void;
}

const fieldLabelSx = {
  fontFamily: tokens.font.mono,
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

const fieldInputSx = {
  fontSize: 14,
};

export function LocationRequestDetailDrawer({
  open,
  request,
  startInRejectMode,
  submitting,
  error,
  onClose,
  onApprove,
  onReject,
}: Props) {
  const [rejecting, setRejecting] = useState(startInRejectMode);
  const [reason, setReason] = useState('');
  const [duplicateOfLocationId, setDuplicateOfLocationId] = useState('');

  const loc =
    request?.locationId && typeof request.locationId === 'object'
      ? request.locationId
      : null;
  const submitter =
    request?.submittedBy && typeof request.submittedBy === 'object'
      ? request.submittedBy
      : null;
  const flags = request?.flags;
  const snapshot = request?.newData ?? {};
  const snapName = typeof snapshot.name === 'string' ? snapshot.name : null;
  const snapAddress = typeof snapshot.address === 'string' ? snapshot.address : null;

  function close() {
    setRejecting(false);
    setReason('');
    setDuplicateOfLocationId('');
    onClose();
  }

  function handleReject() {
    onReject(reason.trim(), duplicateOfLocationId.trim() || undefined);
  }

  return (
    <DetailDrawer
      open={open}
      onClose={close}
      title="Xét duyệt địa điểm"
      preview={
        <Box
          sx={{
            width: 64,
            height: 64,
            bgcolor: 'rgba(255,255,255,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: tokens.color.orange,
          }}
          >
          <LocationOnOutlinedIcon sx={{ fontSize: 32 }} />
        </Box>
      }
      footer={
        !rejecting ? (
          <>
            <ActionButton variant="neutral" onClick={close} sx={{ flex: 1 }}>
              Đóng
            </ActionButton>
            <ActionButton
              variant="reject"
              onClick={() => setRejecting(true)}
              disabled={submitting}
              sx={{ flex: 1 }}
            >
              Từ chối
            </ActionButton>
            <ActionButton
              variant="approve"
              onClick={onApprove}
              disabled={submitting}
              sx={{ flex: 1.2 }}
            >
              {submitting ? 'Đang xử lý...' : 'Duyệt'}
            </ActionButton>
          </>
        ) : (
          <>
            <ActionButton variant="neutral" onClick={() => setRejecting(false)} sx={{ flex: 1 }}>
              Quay lại
            </ActionButton>
            <ActionButton
              variant="reject"
              onClick={handleReject}
              disabled={submitting || reason.trim().length < 5}
              sx={{ flex: 1.4 }}
            >
              {submitting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </ActionButton>
          </>
        )
      }
    >
      <Stack spacing={2.5} sx={{ width: '100%' }}>
        <Box>
          <Typography variant="overline" sx={{ display: 'block', mb: 0.75 }}>
            Tên địa điểm
          </Typography>
          <Typography
            sx={{ color: tokens.color.textPrimary, fontSize: 18, fontWeight: 700 }}
          >
            {snapName ?? loc?.name ?? '—'}
          </Typography>
          {snapAddress && (
            <Typography sx={{ color: tokens.color.textSecondary, fontSize: 13, mt: 0.5 }}>
              {snapAddress}
            </Typography>
          )}
        </Box>

        {flags && (flags.suspectedDuplicate || flags.farPin) && (
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {flags.suspectedDuplicate && (
              <Chip
                icon={<WarningAmberOutlinedIcon sx={{ fontSize: 18 }} />}
                label="Nghi trùng lặp"
                size="small"
                sx={{
                  bgcolor: tokens.color.redSoftBg,
                  color: tokens.color.red,
                  border: `1px solid ${tokens.color.redSoftBorder}`,
                  fontWeight: 600,
                }}
              />
            )}
            {flags.farPin && (
              <Chip
                icon={<WarningAmberOutlinedIcon sx={{ fontSize: 18 }} />}
                label="Pin lệch xa thiết bị"
                size="small"
                sx={{
                  bgcolor: tokens.color.pendingBg,
                  color: tokens.color.pendingText,
                  fontWeight: 600,
                }}
              />
            )}
          </Stack>
        )}

        {flags?.suspectedDuplicate &&
          flags.suspectedDuplicateLocationIds.length > 0 && (
            <Box>
              <Typography variant="overline" sx={{ display: 'block', mb: 0.75 }}>
                Địa điểm nghi trùng
              </Typography>
              <Stack spacing={0.5}>
                {flags.suspectedDuplicateLocationIds.map((locationId) => (
                  <Typography
                    key={locationId}
                    sx={{ color: tokens.color.textSecondary, fontFamily: tokens.font.mono, fontSize: 12 }}
                  >
                    {locationId}
                  </Typography>
                ))}
              </Stack>
            </Box>
          )}

        <Box
          sx={{
            border: `1px solid ${tokens.color.border}`,
            borderRadius: 0,
            overflow: 'hidden',
          }}
        >
          <MetaRow label="Người gửi" value={submitter?.fullName ?? submitter?.email ?? '—'} />
          <Divider />
          <MetaRow
            label="Loại phiếu"
            value={
              request?.type === 'UPDATE' ? 'Sửa địa điểm' : request?.type === 'CREATE' ? 'Tạo mới' : '—'
            }
          />
          <Divider />
          <MetaRow
            label="Khoảng cách pin"
            value={
              typeof request?.deviceDistanceMeters === 'number'
                ? `${request.deviceDistanceMeters} m`
                : '—'
            }
          />
          <Divider />
          <MetaRow
            label="Trạng thái Location"
            value={loc?.status ?? '—'}
          />
        </Box>

        {Object.keys(snapshot).length > 0 && (
          <Box>
            <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>
              Dữ liệu đề xuất
            </Typography>
            <Box
              sx={{
                border: `1px solid ${tokens.color.border}`,
                borderRadius: 0,
                overflow: 'hidden',
              }}
            >
              {Object.entries(snapshot).map(([key, value], i, arr) => (
                <Box key={key}>
                  <MetaRow label={key} value={renderValue(value)} />
                  {i < arr.length - 1 && <Divider />}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {rejecting && (
          <Box>
            <TextField
              label="Lý do từ chối"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              fullWidth
              multiline
              minRows={2}
              placeholder="Nhập lý do (tối thiểu 5 ký tự)..."
              slotProps={{
                inputLabel: { sx: fieldLabelSx },
                input: { sx: fieldInputSx },
              }}
            />
            <TextField
              label="ID địa điểm gốc (nếu trùng)"
              value={duplicateOfLocationId}
              onChange={(e) => setDuplicateOfLocationId(e.target.value)}
              fullWidth
              sx={{ mt: 2 }}
              placeholder="Optional — khi từ chối vì trùng"
              slotProps={{
                inputLabel: { sx: fieldLabelSx },
                input: { sx: fieldInputSx },
              }}
            />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </DetailDrawer>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        px: 1.5,
        py: 1,
      }}
    >
      <Typography variant="overline" sx={{ color: tokens.color.textMuted }}>
        {label}
      </Typography>
      <Typography
        sx={{
          minWidth: 0,
          color: tokens.color.textSecondary,
          fontFamily: tokens.font.mono,
          fontSize: 12,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textAlign: 'right',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.length ? `${value.length} mục` : '—';
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if (Array.isArray(v.coordinates)) {
      return `[${(v.coordinates as number[]).join(', ')}]`;
    }
    return JSON.stringify(value).slice(0, 60);
  }
  return '—';
}
