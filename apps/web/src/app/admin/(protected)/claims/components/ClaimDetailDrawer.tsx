'use client';

import { useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Divider,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import { ActionButton } from '@/components/admin/ActionButton';
import { DetailDrawer } from '@/components/admin/DetailDrawer';
import type { AdminClaim } from '@/lib/admin-api';
import { tokens } from '@/theme/admin-tokens';

type Mode = 'default' | 'reject' | 'evidence';

interface Props {
  open: boolean;
  claim: AdminClaim | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onApprove: (reason?: string) => void;
  onReject: (reason: string) => void;
  onRequestEvidence: (message: string) => void;
}

export function ClaimDetailDrawer({
  open,
  claim,
  saving,
  error,
  onClose,
  onApprove,
  onReject,
  onRequestEvidence,
}: Props) {
  const [mode, setMode] = useState<Mode>('default');
  const [text, setText] = useState('');
  const loc =
    claim?.locationId && typeof claim.locationId === 'object'
      ? claim.locationId
      : null;
  const vendor =
    claim?.vendorId && typeof claim.vendorId === 'object'
      ? claim.vendorId
      : null;
  const flags = claim?.flags;
  const proofs = claim?.evidenceFiles ?? [];
  const firstImage = proofs.find((file) => file.fileType === 'IMAGE');

  function back() {
    setMode('default');
    setText('');
  }

  function submit() {
    const value = text.trim();
    if (mode === 'reject') onReject(value);
    if (mode === 'evidence') onRequestEvidence(value);
  }

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title="Hồ sơ Claim"
      width={460}
      preview={
        firstImage ? (
          <Box
            component="img"
            src={firstImage.url}
            alt="Bằng chứng tại địa điểm"
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <FactCheckOutlinedIcon sx={{ fontSize: 60, color: tokens.color.orange }} />
        )
      }
      footer={
        mode === 'default' ? (
          <>
            <ActionButton
              variant="reject"
              disabled={saving}
              onClick={() => setMode('reject')}
              sx={{ flex: 1 }}
            >
              Từ chối
            </ActionButton>
            <ActionButton
              variant="neutral"
              disabled={saving}
              onClick={() => setMode('evidence')}
              sx={{ flex: 1.2 }}
            >
              Bổ sung
            </ActionButton>
            <ActionButton
              variant="approve"
              disabled={saving || !flags?.eligibleForApprove}
              onClick={() => onApprove()}
              sx={{ flex: 1 }}
            >
              {saving ? 'Đang xử lý' : 'Duyệt'}
            </ActionButton>
          </>
        ) : (
          <>
            <ActionButton variant="neutral" onClick={back} sx={{ flex: 1 }}>
              Quay lại
            </ActionButton>
            <ActionButton
              variant={mode === 'reject' ? 'reject' : 'approve'}
              disabled={saving || text.trim().length < 5}
              onClick={submit}
              sx={{ flex: 1.5 }}
            >
              {saving ? 'Đang gửi' : 'Xác nhận'}
            </ActionButton>
          </>
        )
      }
    >
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="overline">Địa điểm</Typography>
          <Typography sx={{ fontSize: 20, fontWeight: 700 }}>
            {loc?.name ?? 'Không rõ địa điểm'}
          </Typography>
          <Typography sx={{ color: tokens.color.textSecondary, fontSize: 13 }}>
            {loc?.address ?? 'Chưa có địa chỉ'}
          </Typography>
        </Box>

        {flags && (
          <Box>
            <Typography variant="overline">Độ sẵn sàng</Typography>
            <Stack
              direction="row"
              sx={{ flexWrap: 'wrap', gap: 0.75, mt: 0.75 }}
            >
              <StateChip
                ok={flags.otpVerified || flags.needsAdminScrutiny}
                label={flags.otpVerified ? 'OTP hợp lệ' : 'Kiểm tra no-phone'}
              />
              <StateChip ok={flags.hasOnSiteProof} label="Ảnh tại chỗ" />
              <StateChip ok={flags.hasSiteCode} label="Mã tại chỗ" />
              {flags.hasLicense && <StateChip ok label="Có giấy phép" />}
            </Stack>
            {!flags.eligibleForApprove && (
              <Alert severity="warning" sx={{ mt: 1.5 }}>
                Hồ sơ chưa đủ điều kiện duyệt. Hãy yêu cầu vendor bổ sung bằng chứng.
              </Alert>
            )}
          </Box>
        )}

        <Box sx={{ border: `1px solid ${tokens.color.border}` }}>
          <Meta label="Vendor" value={vendor?.fullName ?? vendor?.email ?? '—'} />
          <Divider />
          <Meta label="Email" value={vendor?.email ?? '—'} />
          <Divider />
          <Meta label="Điện thoại" value={loc?.phone ?? 'Không có'} />
          <Divider />
          <Meta
            label="Khoảng cách"
            value={
              typeof claim?.deviceDistanceMeters === 'number'
                ? `${claim.deviceDistanceMeters} m`
                : '—'
            }
          />
        </Box>

        <Box>
          <Typography variant="overline">Bằng chứng</Typography>
          <Stack spacing={1} sx={{ mt: 0.75 }}>
            {proofs.map((file, index) => (
              <Box
                key={`${file.url}-${index}`}
                sx={{
                  border: `1px solid ${tokens.color.border}`,
                  p: 1.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                    {file.fileType} {index + 1}
                  </Typography>
                  <Typography sx={{ color: tokens.color.textMuted, fontSize: 12 }}>
                    {file.geo?.coordinates
                      ? file.geo.coordinates.join(', ')
                      : 'Không có tọa độ'}
                  </Typography>
                  <Typography sx={{ color: tokens.color.textMuted, fontSize: 12 }}>
                    {file.capturedAt
                      ? new Date(file.capturedAt).toLocaleString('vi-VN')
                      : 'Không có thời gian'}
                  </Typography>
                </Box>
                <Link
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  underline="hover"
                  sx={{ fontSize: 12, flexShrink: 0 }}
                >
                  Mở file
                </Link>
              </Box>
            ))}
            {proofs.length === 0 && (
              <Typography sx={{ color: tokens.color.textMuted, fontSize: 13 }}>
                Chưa có bằng chứng.
              </Typography>
            )}
          </Stack>
        </Box>

        {claim?.licenseUrl && (
          <Link
            href={claim.licenseUrl}
            target="_blank"
            rel="noreferrer"
            underline="hover"
            sx={{ fontSize: 13, fontWeight: 700 }}
          >
            Mở giấy phép kinh doanh
          </Link>
        )}

        {mode !== 'default' && (
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label={mode === 'reject' ? 'Lý do từ chối' : 'Nội dung cần bổ sung'}
            value={text}
            onChange={(event) => setText(event.target.value)}
            helperText="Tối thiểu 5 ký tự"
          />
        )}

        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </DetailDrawer>
  );
}

function StateChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Chip
      size="small"
      label={ok ? label : `Thiếu ${label.toLowerCase()}`}
      sx={{
        borderRadius: 0,
        bgcolor: ok ? tokens.color.sage : tokens.color.redSoftBg,
        color: ok ? tokens.color.sageText : tokens.color.red,
        border: `1px solid ${ok ? tokens.color.sage : tokens.color.redSoftBorder}`,
        fontWeight: 700,
      }}
    />
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <Stack
      direction="row"
      sx={{ justifyContent: 'space-between', gap: 2, px: 1.5, py: 1 }}
    >
      <Typography variant="overline" sx={{ color: tokens.color.textMuted }}>
        {label}
      </Typography>
      <Typography
        sx={{
          color: tokens.color.textSecondary,
          fontFamily: tokens.font.mono,
          fontSize: 12,
          textAlign: 'right',
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}
