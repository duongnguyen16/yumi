'use client';

import { useState, type FormEvent } from 'react';
import dayjs from 'dayjs';
import { Alert, Box, Divider, Stack, TextField, Typography } from '@mui/material';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import { DetailDrawer } from '@/components/admin/DetailDrawer';
import { ActionButton } from '@/components/admin/ActionButton';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { tokens } from '@/theme/admin-tokens';

export interface PanelState {
  open: boolean;
  mode: 'create' | 'edit';
  kind: 'category' | 'subcategory';
  categoryId?: string;
  categoryName?: string;
  id?: string;
  name: string;
  description: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  subCount?: number;
}

interface Props {
  state: PanelState;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (name: string, description: string) => void;
}

export function CategoryDetailDrawer({
  state,
  submitting,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [name, setName] = useState(state.name);
  const [description, setDescription] = useState(state.description);

  const title =
    state.kind === 'category'
      ? state.mode === 'create'
        ? 'Tạo danh mục mới'
        : 'Chỉnh sửa danh mục'
      : state.mode === 'create'
        ? 'Tạo danh mục con'
        : 'Chỉnh sửa danh mục con';
  const idLabel = state.id ?? '—';
  const createdAtLabel = state.createdAt
    ? dayjs(state.createdAt).format('DD/MM/YYYY HH:mm')
    : '—';
  const updatedAtLabel = state.updatedAt
    ? dayjs(state.updatedAt).format('DD/MM/YYYY HH:mm')
    : '—';

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(name.trim(), description.trim());
  }

  function submitValues() {
    onSubmit(name.trim(), description.trim());
  }

  return (
    <DetailDrawer
      open={state.open}
      onClose={onClose}
      title={title}
      preview={
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: 0,
            bgcolor: 'rgba(255,255,255,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: tokens.color.orange,
          }}
        >
          <CategoryOutlinedIcon sx={{ fontSize: 32 }} />
        </Box>
      }
      footer={
        <>
          <ActionButton variant="neutral" onClick={onClose} sx={{ flex: 1 }}>
            Huỷ
          </ActionButton>
          <ActionButton
            variant="approve"
            onClick={submitValues}
            disabled={submitting || !name.trim()}
            sx={{ flex: 1.4 }}
          >
            {submitting ? 'Đang lưu...' : 'Lưu'}
          </ActionButton>
        </>
      }
    >
      <Stack
        component="form"
        onSubmit={handleSubmit}
        spacing={2.5}
        sx={{ width: '100%' }}
      >
        {state.mode === 'edit' && typeof state.isActive === 'boolean' && (
          <Box>
            <StatusBadge isActive={state.isActive} />
          </Box>
        )}

        <Box>
          <Typography variant="overline" sx={{ display: 'block', mb: 0.75 }}>
            {state.mode === 'create' ? 'Bản ghi mới' : 'Đang chỉnh sửa'}
          </Typography>
          <Typography
            sx={{
              color: tokens.color.textPrimary,
              fontSize: 18,
              fontWeight: 700,
              lineHeight: 1.3,
            }}
          >
            {name.trim() || title}
          </Typography>
          {state.kind === 'subcategory' && state.categoryName && (
            <Typography sx={{ color: tokens.color.textSecondary, fontSize: 13, mt: 0.5 }}>
              Thuộc {state.categoryName}
            </Typography>
          )}
        </Box>

        {state.mode === 'edit' && (
          <Box
            sx={{
              border: `1px solid ${tokens.color.border}`,
              borderRadius: 0,
              overflow: 'hidden',
            }}
          >
            <MetaRow label="ID" value={idLabel} />
            <Divider />
            <MetaRow label="Tạo lúc" value={createdAtLabel} />
            <Divider />
            <MetaRow label="Cập nhật" value={updatedAtLabel} />
            {state.kind === 'category' && (
              <>
                <Divider />
                <MetaRow label="Danh mục con" value={String(state.subCount ?? 0)} />
              </>
            )}
          </Box>
        )}

        <TextField
          label="Tên"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          autoFocus
          slotProps={{
            inputLabel: {
              sx: fieldLabelSx,
            },
            input: {
              sx: fieldInputSx,
            },
          }}
        />

        {state.kind === 'category' && (
          <TextField
            label="Mô tả"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={3}
            slotProps={{
              inputLabel: {
                sx: fieldLabelSx,
              },
              input: {
                sx: fieldInputSx,
              },
            }}
          />
        )}

        {error && <Alert severity="error">{error}</Alert>}

        <Box>
          <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>
            {state.kind === 'subcategory' ? 'Thuộc danh mục' : 'Loại'}
          </Typography>
          <Typography
            sx={{ fontSize: 14, color: tokens.color.textPrimary }}
          >
            {state.kind === 'subcategory'
              ? 'Danh mục con'
              : 'Danh mục chính'}
          </Typography>
        </Box>
      </Stack>
    </DetailDrawer>
  );
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
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
