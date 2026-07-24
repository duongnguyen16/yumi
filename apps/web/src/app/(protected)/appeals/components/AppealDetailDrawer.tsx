"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  ButtonBase,
  Chip,
  Divider,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import { ActionButton } from "@/components/admin/ActionButton";
import { DetailDrawer } from "@/components/admin/DetailDrawer";
import {
  appealDecisionLabel,
  appealDecisionOptions,
  appealStatusLabel,
  appealTypeLabel,
  humanizeAdminValue,
  type AppealDecision,
  type AppealDecisionOption,
} from "@/components/admin/admin-review-labels";
import type { AdminAppeal } from "@/lib/admin-api";
import { tokens } from "@/theme/admin-tokens";

interface Props {
  open: boolean;
  item: AdminAppeal | null;
  saving: boolean;
  error: string | null;
  readOnly?: boolean;
  onClose: () => void;
  onResolve: (decision: AppealDecision, reason: string) => void;
}

export function AppealDetailDrawer({
  open,
  item,
  saving,
  error,
  readOnly = false,
  onClose,
  onResolve,
}: Props) {
  const decisions = appealDecisionOptions(item?.type);
  const [decision, setDecision] = useState<AppealDecision>(decisions[0].value);
  const [reason, setReason] = useState("");
  const user = typeof item?.appellantId === "object" ? item.appellantId : null;
  const selectedDecision =
    decisions.find((option) => option.value === decision) ?? decisions[0];
  const reasonLength = reason.trim().length;
  const userName = user?.fullName ?? user?.email;
  const isPending = item?.status === "PENDING";
  const statusBackground = isPending
    ? tokens.color.pendingBg
    : tokens.color.sage;
  const statusColor = isPending
    ? tokens.color.pendingText
    : tokens.color.sageText;
  const originalDecidedAt = item?.originalDecidedAt
    ? new Date(item.originalDecidedAt).toLocaleString("vi-VN")
    : "—";
  const decidedAt = item?.adminDecision?.decidedAt
    ? new Date(item.adminDecision.decidedAt).toLocaleString("vi-VN")
    : "—";

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      title={readOnly ? "Kết quả kháng cáo" : "Xét duyệt kháng cáo"}
      width={620}
      footer={
        readOnly ? (
          <ActionButton
            variant="neutral"
            onClick={onClose}
            sx={{ flex: 1, minHeight: 46 }}
          >
            Đóng
          </ActionButton>
        ) : (
          <>
            <ActionButton
              variant="neutral"
              onClick={onClose}
              disabled={saving}
              sx={{ flex: 1, minHeight: 46 }}
            >
              Đóng
            </ActionButton>
            <ActionButton
              variant="approve"
              disabled={saving || reasonLength < 5}
              onClick={() => onResolve(decision, reason.trim())}
              sx={{ flex: 1.8, minHeight: 46 }}
            >
              {saving ? "Đang xử lý..." : `Xác nhận: ${selectedDecision.label}`}
            </ActionButton>
          </>
        )
      }
    >
      <Stack spacing={3}>
        <Box>
          <Typography variant="overline">Người kháng cáo</Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            sx={{
              mt: 0.75,
              justifyContent: "space-between",
              alignItems: { sm: "flex-start" },
              gap: 1,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{ fontWeight: 700, fontSize: 20, lineHeight: 1.3 }}
              >
                {userName ?? "Không rõ người gửi"}
              </Typography>
              <Typography
                sx={{ color: tokens.color.textMuted, fontSize: 13, mt: 0.25 }}
              >
                {user?.email ?? "Không có thông tin email"}
              </Typography>
            </Box>
            <Chip
              size="small"
              label={appealStatusLabel(item?.status)}
              sx={{
                flexShrink: 0,
                bgcolor: statusBackground,
                color: statusColor,
                border: `1px solid ${tokens.color.border}`,
              }}
            />
          </Stack>
        </Box>

        <Section title="Quyết định bị kháng cáo" icon={<GavelOutlinedIcon />}>
          <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
            {appealTypeLabel(item?.type)}
          </Typography>
          <Typography
            sx={{
              color: tokens.color.textSecondary,
              fontSize: 14,
              lineHeight: 1.6,
              mt: 0.75,
            }}
          >
            {item?.originalDecisionReason ??
              "Quyết định gốc không ghi nhận lý do."}
          </Typography>
          <Typography
            sx={{ color: tokens.color.textMuted, fontSize: 12, mt: 1 }}
          >
            Thời điểm quyết định: {originalDecidedAt}
          </Typography>
        </Section>

        <Section title="Nội dung kháng cáo" icon={<DescriptionOutlinedIcon />}>
          <Typography
            sx={{
              fontSize: 15,
              lineHeight: 1.65,
              color: tokens.color.textPrimary,
            }}
          >
            {item?.argument ?? "Không có nội dung."}
          </Typography>
        </Section>

        <Section title="Bằng chứng bổ sung" icon={<ShieldOutlinedIcon />}>
          {(item?.additionalEvidenceFiles?.length ?? 0) > 0 ? (
            <Stack spacing={1}>
              {(item?.additionalEvidenceFiles ?? []).map((file, index) => (
                <Link
                  key={`${file.url}-${index}`}
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  sx={{
                    minHeight: 44,
                    px: 1.5,
                    border: `1px solid ${tokens.color.border}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    color: tokens.color.textPrimary,
                    textDecoration: "none",
                    fontWeight: 600,
                    "&:hover": {
                      borderColor: tokens.color.orange,
                      bgcolor: tokens.color.orangeSoft,
                    },
                  }}
                >
                  <DescriptionOutlinedIcon
                    sx={{ color: tokens.color.orange, fontSize: 20 }}
                  />
                  Bằng chứng {index + 1} · {humanizeAdminValue(file.fileType)}
                  <ArrowForwardOutlinedIcon sx={{ ml: "auto", fontSize: 18 }} />
                </Link>
              ))}
            </Stack>
          ) : (
            <Typography sx={{ color: tokens.color.textMuted, fontSize: 14 }}>
              Hồ sơ không có bằng chứng bổ sung.
            </Typography>
          )}
        </Section>

        {!readOnly ? (
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
              Chọn hướng xử lý
            </Typography>
            <Typography
              sx={{
                color: tokens.color.textSecondary,
                fontSize: 13,
                mt: 0.5,
                mb: 1.5,
              }}
            >
              Chọn một kết quả sau khi đã đối chiếu quyết định gốc và bằng chứng
              mới.
            </Typography>
            <Stack spacing={1.25}>
              {decisions.map((option) => (
                <DecisionCard
                  key={option.value}
                  option={option}
                  selected={decision === option.value}
                  onClick={() => setDecision(option.value)}
                />
              ))}
            </Stack>
          </Box>
        ) : null}

        {!readOnly ? (
          <TextField
            fullWidth
            multiline
            minRows={4}
            label="Lý do xử lý"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Nêu căn cứ cho quyết định của bạn..."
            helperText={
              reasonLength < 5
                ? `Cần thêm ${5 - reasonLength} ký tự để xác nhận`
                : "Lý do này sẽ được lưu trong lịch sử xử lý."
            }
            slotProps={{
              htmlInput: {
                "aria-label": "Lý do xử lý kháng cáo",
                maxLength: 500,
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
        ) : null}

        {readOnly ? (
          <Section
            title="Kết quả xử lý"
            icon={<CheckCircleOutlinedIcon />}
            tone="success"
          >
            <Typography sx={{ fontWeight: 700, fontSize: 17 }}>
              {appealDecisionLabel(item?.status)}
            </Typography>
            <Typography
              sx={{
                color: tokens.color.textSecondary,
                fontSize: 14,
                lineHeight: 1.6,
                mt: 0.75,
              }}
            >
              {item?.adminDecision?.reason ?? "Không có lý do xử lý."}
            </Typography>
            <Typography
              sx={{ color: tokens.color.textMuted, fontSize: 12, mt: 1 }}
            >
              Xử lý lúc: {decidedAt}
            </Typography>
          </Section>
        ) : null}

        {error ? <Alert severity="error">{error}</Alert> : null}
      </Stack>
    </DetailDrawer>
  );
}

function DecisionCard({
  option,
  selected,
  onClick,
}: {
  option: AppealDecisionOption;
  selected: boolean;
  onClick: () => void;
}) {
  const positive = option.tone === "positive";
  const accent = positive ? tokens.color.green : tokens.color.red;
  const selectedBg = positive ? "rgba(46,125,50,0.06)" : tokens.color.redSoftBg;

  return (
    <ButtonBase
      aria-pressed={selected}
      aria-label={`${option.label}: ${option.description}`}
      onClick={onClick}
      sx={{
        width: "100%",
        minHeight: 72,
        p: 1.75,
        border: `2px solid ${selected ? accent : tokens.color.border}`,
        bgcolor: selected ? selectedBg : tokens.color.card,
        display: "flex",
        alignItems: "flex-start",
        gap: 1.5,
        textAlign: "left",
        transition: `border-color ${tokens.motion.hover}, background-color ${tokens.motion.hover}`,
        "&:hover": { borderColor: accent, bgcolor: selectedBg },
        "&:focus-visible": { boxShadow: tokens.shadow.focusRing },
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          bgcolor: selected ? accent : tokens.color.inputBg,
          color: selected ? "#fff" : tokens.color.textMuted,
        }}
      >
        {positive ? <ArrowForwardOutlinedIcon /> : <GavelOutlinedIcon />}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontWeight: 700,
            color: tokens.color.textPrimary,
            lineHeight: 1.35,
          }}
        >
          {option.label}
        </Typography>
        <Typography
          sx={{
            color: tokens.color.textSecondary,
            fontSize: 13,
            lineHeight: 1.45,
            mt: 0.35,
          }}
        >
          {option.description}
        </Typography>
      </Box>
      <CheckCircleOutlinedIcon
        sx={{
          color: selected ? accent : tokens.color.border,
          flexShrink: 0,
          mt: 0.25,
        }}
      />
    </ButtonBase>
  );
}

function Section({
  title,
  icon,
  tone = "default",
  children,
}: {
  title: string;
  icon: React.ReactNode;
  tone?: "default" | "success";
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        border: `1px solid ${tone === "success" ? tokens.color.sage : tokens.color.border}`,
        bgcolor:
          tone === "success" ? "rgba(208,223,194,0.24)" : tokens.color.card,
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", px: 1.75, py: 1.25 }}
      >
        <Box
          sx={{
            color:
              tone === "success" ? tokens.color.green : tokens.color.orange,
            display: "flex",
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
