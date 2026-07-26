'use client';

import { useState, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { DetailDrawer } from '@/components/admin/DetailDrawer';
import { ActionButton } from '@/components/admin/ActionButton';
import { getOwnershipVerificationView } from '@/components/admin/ownership-verification';
import {
  humanizeAdminValue,
  locationFieldLabel,
  locationRequestStatusLabel,
  locationRequestTypeLabel,
  locationStatusLabel,
} from '@/components/admin/admin-review-labels';
import { tokens } from '@/theme/admin-tokens';
import type { AdminLocationRequest } from '@/lib/admin-api';

interface Props {
  open: boolean;
  request: AdminLocationRequest | null;
  startInRejectMode: boolean;
  submitting: boolean;
  error: string | null;
  readOnly?: boolean;
  onClose: () => void;
  onApprove: () => void;
  onConfirmDuplicate: (reason: string, duplicateOfLocationId?: string) => void;
  onReject: (reason: string, duplicateOfLocationId?: string) => void;
}

export function LocationRequestDetailDrawer({
  open,
  request,
  startInRejectMode,
  submitting,
  error,
  readOnly = false,
  onClose,
  onApprove,
  onConfirmDuplicate,
  onReject,
}: Props) {
  const [rejecting, setRejecting] = useState(startInRejectMode);
  const [confirmingDuplicate, setConfirmingDuplicate] = useState(false);
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
  const verification = getOwnershipVerificationView(request);
  const snapshot = request?.newData ?? {};
  const snapName = typeof snapshot.name === 'string' ? snapshot.name : null;
  const snapAddress =
    typeof snapshot.address === 'string' ? snapshot.address : null;
  const reasonLength = reason.trim().length;
  const locationName = snapName ?? loc?.name;
  const locationAddress = snapAddress ?? loc?.address;
  const submitterName = submitter?.fullName ?? submitter?.email;
  const reviewedAt = request?.reviewedAt
    ? new Date(request.reviewedAt).toLocaleString('vi-VN')
    : '—';
  const showDecisionForm = !readOnly && (rejecting || confirmingDuplicate);

  let title = 'Xét duyệt địa điểm';
  if (readOnly) {
    title = 'Kết quả duyệt địa điểm';
  } else if (rejecting) {
    title = 'Từ chối địa điểm';
  }

  function close() {
    setRejecting(false);
    setConfirmingDuplicate(false);
    setReason('');
    setDuplicateOfLocationId('');
    onClose();
  }

  function handleReject() {
    const trimmedReason = reason.trim();
    const trimmedDuplicateId = duplicateOfLocationId.trim();
    onReject(trimmedReason, trimmedDuplicateId || undefined);
  }

  function handleConfirmDuplicate() {
    const trimmedReason = reason.trim();
    const trimmedDuplicateId = duplicateOfLocationId.trim();
    onConfirmDuplicate(trimmedReason, trimmedDuplicateId || undefined);
  }

  function renderFooter(): ReactNode {
    if (readOnly) {
      return (
        <ActionButton
          variant="neutral"
          onClick={close}
          sx={{ flex: 1, minHeight: 46 }}
        >
          Đóng
        </ActionButton>
      );
    }

    if (!rejecting && !confirmingDuplicate) {
      return (
        <>
          <ActionButton
            variant="neutral"
            onClick={close}
            disabled={submitting}
            sx={{ flex: 1, minHeight: 46 }}
          >
            Đóng
          </ActionButton>
          <ActionButton
            variant="reject"
            onClick={() => setRejecting(true)}
            disabled={submitting}
            sx={{ flex: 1, minHeight: 46 }}
          >
            Từ chối
          </ActionButton>
          {flags?.suspectedDuplicate ? (
            <ActionButton
              variant="reject"
              onClick={() => setConfirmingDuplicate(true)}
              disabled={submitting}
              sx={{ flex: 1.1, minHeight: 46 }}
            >
              Ẩn trùng
            </ActionButton>
          ) : null}
          <ActionButton
            variant="approve"
            onClick={onApprove}
            disabled={submitting}
            sx={{ flex: 1.2, minHeight: 46 }}
          >
            {submitting
              ? 'Đang xử lý...'
              : flags?.ownershipRegistration
                ? 'Duyệt và gán quyền'
                : 'Duyệt địa điểm'}
          </ActionButton>
        </>
      );
    }

    if (confirmingDuplicate) {
      return (
        <>
          <ActionButton
            variant="neutral"
            onClick={() => setConfirmingDuplicate(false)}
            disabled={submitting}
            sx={{ flex: 1, minHeight: 46 }}
          >
            Quay lại
          </ActionButton>
          <ActionButton
            variant="reject"
            onClick={handleConfirmDuplicate}
            disabled={submitting || reasonLength < 5}
            sx={{ flex: 1.8, minHeight: 46 }}
          >
            {submitting ? 'Đang xử lý...' : 'Xác nhận trùng thật'}
          </ActionButton>
        </>
      );
    }

    return (
      <>
        <ActionButton
          variant="neutral"
          onClick={() => setRejecting(false)}
          disabled={submitting}
          sx={{ flex: 1, minHeight: 46 }}
        >
          Quay lại
        </ActionButton>
        <ActionButton
          variant="reject"
          onClick={handleReject}
          disabled={submitting || reasonLength < 5}
          sx={{ flex: 1.6, minHeight: 46 }}
        >
          {submitting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
        </ActionButton>
      </>
    );
  }

  return (
    <DetailDrawer
      open={open}
      onClose={close}
      title={title}
      width={620}
      footer={renderFooter()}
    >
      <Stack spacing={3} sx={{ width: '100%' }}>
        <Box>
          <Typography variant="overline">Địa điểm đề xuất</Typography>
          <Typography
            sx={{
              color: tokens.color.textPrimary,
              fontSize: 22,
              fontWeight: 700,
              mt: 0.5,
            }}
          >
            {locationName ?? 'Chưa có tên địa điểm'}
          </Typography>
          <Typography
            sx={{
              color: tokens.color.textSecondary,
              fontSize: 14,
              lineHeight: 1.5,
              mt: 0.5,
            }}
          >
            {locationAddress ?? 'Chưa có địa chỉ'}
          </Typography>
        </Box>

        <Section title="Kiểm tra tự động" icon={<WarningAmberOutlinedIcon />}>
          <Stack spacing={1}>
            {flags?.suspectedDuplicate ? (
              <Alert severity="error" variant="outlined">
                <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                  Có khả năng trùng địa điểm
                </Typography>
                <Typography sx={{ fontSize: 13, mt: 0.25 }}>
                  Hãy đối chiếu các địa điểm nghi trùng trước khi đưa ra quyết
                  định.
                </Typography>
              </Alert>
            ) : null}
            {flags?.farPin ? (
              <Alert severity="warning" variant="outlined">
                <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                  Vị trí ghim xa thiết bị
                </Typography>
                <Typography sx={{ fontSize: 13, mt: 0.25 }}>
                  Khoảng cách này có thể cần kiểm tra thêm bằng chứng vị trí.
                </Typography>
              </Alert>
            ) : null}
            {!flags?.suspectedDuplicate && !flags?.farPin ? (
              <Alert severity="success" variant="outlined">
                Không phát hiện cảnh báo tự động.
              </Alert>
            ) : null}
          </Stack>
        </Section>

        {flags?.suspectedDuplicate &&
        (flags.suspectedDuplicateLocationIds?.length ?? 0) > 0 ? (
          <Section
            title="Địa điểm nghi trùng"
            icon={<LocationOnOutlinedIcon />}
          >
            <Stack spacing={0.75}>
              {flags.suspectedDuplicateLocationIds?.map((locationId, index) => (
                <Box
                  key={locationId}
                  sx={{
                    px: 1.5,
                    py: 1.25,
                    border: `1px solid ${tokens.color.border}`,
                    bgcolor: tokens.color.inputBg,
                  }}
                >
                  <Typography
                    sx={{ color: tokens.color.textMuted, fontSize: 11 }}
                  >
                    Địa điểm {index + 1}
                  </Typography>
                  <Typography
                    sx={{
                      color: tokens.color.textPrimary,
                      fontFamily: tokens.font.mono,
                      fontSize: 12,
                      mt: 0.25,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {locationId}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Section>
        ) : null}

        <Section title="Thông tin phiếu" icon={<PersonOutlinedIcon />}>
          <MetaRow label="Người gửi" value={submitterName ?? 'Không rõ'} />
          <Divider />
          <MetaRow
            label="Loại phiếu"
            value={locationRequestTypeLabel(request?.type)}
          />
          <Divider />
          <MetaRow
            label="Khoảng cách ghim"
            value={
              typeof request?.deviceDistanceMeters === 'number'
                ? `${request.deviceDistanceMeters.toLocaleString('vi-VN')} m`
                : 'Không có dữ liệu'
            }
          />
          <Divider />
          <MetaRow
            label="Trạng thái địa điểm"
            value={locationStatusLabel(loc?.status)}
          />
        </Section>

        {verification ? (
          <Section
            title="Bằng chứng đăng ký sở hữu"
            icon={<VerifiedUserOutlinedIcon />}
          >
            <MetaRow
              label="Mã hệ thống"
              value={verification.systemCode ?? '—'}
            />
            <Divider />
            <EvidenceLinks
              title="Ảnh tại chỗ"
              urls={verification.imageUrls}
            />
            <Divider />
            <EvidenceLinks
              title="Video xác thực"
              urls={verification.videoUrls}
            />
            <Divider />
            <EvidenceLinks title="Giấy phép" urls={verification.licenseUrls} />
          </Section>
        ) : null}

        {readOnly ? (
          <Section
            title="Kết quả xử lý"
            icon={<InfoOutlinedIcon />}
            tone="success"
          >
            <MetaRow
              label="Trạng thái phiếu"
              value={locationRequestStatusLabel(request?.status)}
            />
            <Divider />
            <MetaRow
              label="Lý do xử lý"
              value={request?.reviewNote ?? 'Không có lý do'}
            />
            <Divider />
            <MetaRow label="Thời điểm xử lý" value={reviewedAt} />
          </Section>
        ) : null}

        {Object.keys(snapshot).length > 0 ? (
          <Section title="Dữ liệu đề xuất" icon={<InfoOutlinedIcon />}>
            {Object.entries(snapshot).map(([key, value], index, entries) => (
              <Box key={key}>
                <MetaRow
                  label={locationFieldLabel(key)}
                  value={renderValue(value)}
                />
                {index < entries.length - 1 ? <Divider /> : null}
              </Box>
            ))}
          </Section>
        ) : null}

        {showDecisionForm ? (
          <Box
            sx={{
              border: `1px solid ${tokens.color.redSoftBorder}`,
              bgcolor: tokens.color.redSoftBg,
              p: 2,
            }}
          >
            <Typography
              sx={{ color: tokens.color.red, fontWeight: 700, fontSize: 17 }}
            >
              {confirmingDuplicate
                ? 'Ghi rõ căn cứ trùng lặp'
                : 'Ghi rõ căn cứ từ chối'}
            </Typography>
            <Typography
              sx={{
                color: tokens.color.textSecondary,
                fontSize: 13,
                lineHeight: 1.5,
                mt: 0.5,
                mb: 2,
              }}
            >
              {confirmingDuplicate
                ? 'Lý do sẽ được lưu và gửi thông báo kháng cáo cho người sở hữu địa điểm.'
                : 'Lý do sẽ được gửi cho người tạo phiếu và lưu trong lịch sử xét duyệt.'}
            </Typography>
            <TextField
              label={
                confirmingDuplicate
                  ? 'Lý do xác nhận trùng lặp'
                  : 'Lý do từ chối'
              }
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              fullWidth
              multiline
              minRows={3}
              placeholder={
                confirmingDuplicate
                  ? 'Nêu căn cứ để ẩn địa điểm vì trùng lặp...'
                  : 'Nêu thông tin cần sửa hoặc căn cứ từ chối...'
              }
              helperText={
                reasonLength < 5
                  ? `Cần thêm ${5 - reasonLength} ký tự để xác nhận`
                  : 'Đã đủ độ dài tối thiểu.'
              }
              slotProps={{
                htmlInput: {
                  'aria-label': confirmingDuplicate
                    ? 'Lý do xác nhận trùng lặp'
                    : 'Lý do từ chối địa điểm',
                },
                formHelperText: {
                  sx: {
                    color:
                      reasonLength < 5
                        ? tokens.color.red
                        : tokens.color.textMuted,
                  },
                },
              }}
            />
            <TextField
              label="ID địa điểm gốc nếu bị trùng"
              value={duplicateOfLocationId}
              onChange={(event) => setDuplicateOfLocationId(event.target.value)}
              fullWidth
              sx={{ mt: 2 }}
              placeholder="Dán ID địa điểm đã tồn tại khi từ chối vì trùng lặp"
              helperText="Có thể bỏ trống nếu lý do từ chối không phải trùng lặp."
              slotProps={{
                htmlInput: { 'aria-label': 'ID địa điểm gốc nếu bị trùng' },
              }}
            />
          </Box>
        ) : null}

        {error ? <Alert severity="error">{error}</Alert> : null}
      </Stack>
    </DetailDrawer>
  );
}

function Section({
  title,
  icon,
  tone = 'default',
  children,
}: {
  title: string;
  icon: ReactNode;
  tone?: 'default' | 'success';
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        border: `1px solid ${tone === 'success' ? tokens.color.sage : tokens.color.border}`,
        bgcolor:
          tone === 'success' ? 'rgba(208,223,194,0.24)' : tokens.color.card,
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', px: 1.75, py: 1.25 }}
      >
        <Box
          sx={{
            color:
              tone === 'success' ? tokens.color.green : tokens.color.orange,
            display: 'flex',
          }}
        >
          {icon}
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{title}</Typography>
      </Stack>
      <Divider />
      <Box sx={{ p: 1.75 }}>{children}</Box>
    </Box>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'minmax(150px, 0.7fr) minmax(0, 1.3fr)',
        },
        gap: { xs: 0.5, sm: 2 },
        px: 0.25,
        py: 1.25,
      }}
    >
      <Typography variant="overline" sx={{ color: tokens.color.textMuted }}>
        {label}
      </Typography>
      <Typography
        sx={{
          minWidth: 0,
          color: tokens.color.textPrimary,
          fontSize: 13,
          lineHeight: 1.55,
          overflowWrap: 'anywhere',
          textAlign: { sm: 'right' },
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function EvidenceLinks({ title, urls }: { title: string; urls: string[] }) {
  return (
    <Box sx={{ px: 0.25, py: 1.25 }}>
      <Typography variant="overline" sx={{ color: tokens.color.textMuted }}>
        {title}
      </Typography>
      {urls.length > 0 ? (
        <Stack spacing={0.75} sx={{ mt: 0.75 }}>
          {urls.map((url, index) => (
            <Typography
              key={`${url}-${index}`}
              component="a"
              href={url}
              target="_blank"
              rel="noreferrer"
              sx={{
                color: tokens.color.green,
                fontSize: 13,
                lineHeight: 1.55,
                overflowWrap: 'anywhere',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {url}
            </Typography>
          ))}
        </Stack>
      ) : (
        <Typography
          sx={{
            color: tokens.color.textPrimary,
            fontSize: 13,
            lineHeight: 1.55,
            mt: 0.75,
          }}
        >
          Không có dữ liệu
        </Typography>
      )}
    </Box>
  );
}

function formatDate(value?: string): string {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('vi-VN');
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return 'Không có dữ liệu';
  if (value === '') return 'Không có dữ liệu';
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  if (typeof value === 'string' || typeof value === 'number')
    return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return 'Không có dữ liệu';
    const labels = value.map((item) => humanizeAdminValue(String(item)));
    return labels.join(', ');
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.coordinates)) {
      return (record.coordinates as number[]).join(', ');
    }
    return JSON.stringify(value);
  }
  return 'Không có dữ liệu';
}
