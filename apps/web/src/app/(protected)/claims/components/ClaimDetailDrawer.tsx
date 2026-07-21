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
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { ActionButton } from '@/components/admin/ActionButton';
import { DetailDrawer } from '@/components/admin/DetailDrawer';
import type { AdminClaim } from '@/lib/admin-api';
import { tokens } from '@/theme/admin-tokens';

type Mode = 'default' | 'reject';

interface Props {
  open: boolean;
  claim: AdminClaim | null;
  saving: boolean;
  error: string | null;
  readOnly?: boolean;
  onClose: () => void;
  onApprove: (reason?: string) => void;
  onReject: (reason: string) => void;
}

export function ClaimDetailDrawer({
  open,
  claim,
  saving,
  error,
  readOnly = false,
  onClose,
  onApprove,
  onReject,
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
  const proofs = [
    ...(claim?.evidenceFiles ?? []).map((file) => ({ ...file, label: null })),
    ...(claim?.licenseUrl
      ? [
          {
            url: claim.licenseUrl,
            fileType: 'DOCUMENT' as const,
            label: 'Giấy phép kinh doanh',
            geo: undefined,
            capturedAt: undefined,
          },
        ]
      : []),
  ];
  const vendorName = vendor?.fullName ?? vendor?.email;
  const textLength = text.trim().length;
  const isEditing = !readOnly && mode !== 'default';

  function back() {
    setMode('default');
    setText('');
  }

  function submit() {
    const value = text.trim();
    if (mode === 'reject') {
      onReject(value);
    }
  }

  function renderFooter() {
    if (readOnly) {
      return (
        <ActionButton variant="neutral" onClick={onClose} sx={{ flex: 1 }}>
          Đóng
        </ActionButton>
      );
    }

    if (mode === 'default') {
      return (
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
            variant="approve"
            disabled={saving || !flags?.eligibleForApprove}
            onClick={() => onApprove()}
            sx={{ flex: 1 }}
          >
            {saving ? 'Đang xử lý' : 'Duyệt'}
          </ActionButton>
        </>
      );
    }

    return (
      <>
        <ActionButton variant="neutral" onClick={back} sx={{ flex: 1 }}>
          Quay lại
        </ActionButton>
        <ActionButton
          variant="reject"
          disabled={saving || textLength < 5}
          onClick={submit}
          sx={{ flex: 1.5 }}
        >
          {saving ? 'Đang gửi' : 'Xác nhận'}
        </ActionButton>
      </>
    );
  }

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title="Hồ sơ Claim"
      width={460}
      footer={renderFooter()}
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
            <Typography variant="overline">Yếu tố xác minh</Typography>
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
                Hồ sơ chưa đủ điều kiện duyệt.
              </Alert>
            )}
          </Box>
        )}

        <Box sx={{ border: `1px solid ${tokens.color.border}` }}>
          <Meta label="Vendor" value={vendorName ?? '—'} />
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

        {readOnly && (
          <Box sx={{ border: `1px solid ${tokens.color.border}` }}>
            <Meta label="Trạng thái" value={claim?.status ?? '—'} />
            <Divider />
            <Meta
              label="Lý do xử lý"
              value={claim?.adminDecision?.reason ?? 'Không có'}
            />
            <Divider />
            <Meta
              label="Xử lý lúc"
              value={
                claim?.adminDecision?.decidedAt
                  ? new Date(claim.adminDecision.decidedAt).toLocaleString(
                    'vi-VN',
                  )
                  : '—'
              }
            />
          </Box>
        )}

        <Box>
          <Typography variant="overline">Bằng chứng</Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
              gap: 1,
              mt: 0.75,
            }}
          >
            {proofs.map((file, index) => (
              <Box
                key={`${file.url}-${index}`}
                sx={{
                  border: `1px solid ${tokens.color.border}`,
                  minWidth: 0,
                }}
              >
                {file.fileType === 'IMAGE' && (
                  <Link
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    sx={{ display: 'block', lineHeight: 0 }}
                  >
                    <Box
                      component="img"
                      src={file.url}
                      alt={`Bằng chứng ${index + 1}`}
                      sx={{
                        width: '100%',
                        aspectRatio: '4 / 3',
                        display: 'block',
                        objectFit: 'cover',
                      }}
                    />
                  </Link>
                )}
                {file.label && (
                  <Box
                    sx={{
                      width: '100%',
                      aspectRatio: '4 / 3',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: tokens.color.preview,
                    }}
                  >
                    <DescriptionOutlinedIcon
                      sx={{ fontSize: 56, color: tokens.color.textMuted }}
                    />
                  </Box>
                )}
                <Box sx={{ p: 1.5 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                    {file.label ?? `${file.fileType} ${index + 1}`}
                  </Typography>
                  {file.geo?.coordinates && (
                    <Typography
                      sx={{ color: tokens.color.textMuted, fontSize: 12 }}
                    >
                      {file.geo.coordinates.join(', ')}
                    </Typography>
                  )}
                  {file.capturedAt && (
                    <Typography
                      sx={{ color: tokens.color.textMuted, fontSize: 12 }}
                    >
                      {new Date(file.capturedAt).toLocaleString('vi-VN')}
                    </Typography>
                  )}
                  <Link
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    underline="hover"
                    sx={{ display: 'inline-block', fontSize: 12, mt: 0.75 }}
                  >
                    Mở file
                  </Link>
                </Box>
              </Box>
            ))}
            {proofs.length === 0 && (
              <Typography sx={{ color: tokens.color.textMuted, fontSize: 13 }}>
                Chưa có bằng chứng.
              </Typography>
            )}
          </Box>
        </Box>

        {isEditing && (
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
