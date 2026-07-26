'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
  type SxProps,
  type Theme,
} from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined';
import KeyboardArrowRightOutlinedIcon from '@mui/icons-material/KeyboardArrowRightOutlined';
import SubdirectoryArrowRightOutlinedIcon from '@mui/icons-material/SubdirectoryArrowRightOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import {
  createCategory,
  createSubCategory,
  listCategories,
  setCategoryStatus,
  setSubCategoryStatus,
  updateCategory,
  updateSubCategory,
  type AdminCategory,
  type AdminSubCategory,
} from '@/lib/admin-api';
import { Topbar } from '@/components/admin/Topbar';
import { SearchInput } from '@/components/admin/SearchInput';
import { AdminCard } from '@/components/admin/AdminCard';
import { ActionButton } from '@/components/admin/ActionButton';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { EmptyState } from '@/components/admin/EmptyState';
import {
  CategoryDetailDrawer,
  type PanelState,
} from './components/CategoryDetailDrawer';
import { tilePalette, tokens } from '@/theme/admin-tokens';

const CLOSED_PANEL: PanelState = {
  open: false,
  mode: 'create',
  kind: 'category',
  name: '',
  description: '',
};

function extractMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message ?? e?.message ?? 'Đã xảy ra lỗi';
}

function formatTime(value?: string): string {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—';
}

function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
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

const filterSx: SxProps<Theme> = {
  minWidth: 160,
  '& .MuiOutlinedInput-root': {
    borderRadius: 0,
    bgcolor: tokens.color.inputBg,
    fontSize: 14,
  },
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [panel, setPanel] = useState<PanelState>(CLOSED_PANEL);
  const [submitting, setSubmitting] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await listCategories();
      setCategories(data);
      setError(null);
    } catch (err) {
      setError(extractMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadCategories() {
      try {
        const data = await listCategories();
        if (!active) return;
        setCategories(data);
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

    void loadCategories();

    return () => {
      active = false;
    };
  }, [fetchCategories]);

  const filtered = useMemo(() => {
    const q = normalizeSearch(search.trim());
    const matchesStatus = (isActive: boolean) =>
      !statusFilter || (statusFilter === 'active' ? isActive : !isActive);
    const result: AdminCategory[] = [];
    for (const cat of categories) {
      const catMatch =
        !q ||
        normalizeSearch([cat.name, cat.description].filter(Boolean).join(' ')).includes(q);
      const searchableSubs = catMatch
        ? cat.subcategories
        : cat.subcategories.filter((s) => normalizeSearch(s.name).includes(q));
      const subs = searchableSubs.filter((s) => matchesStatus(s.isActive));
      if ((catMatch && matchesStatus(cat.isActive)) || subs.length > 0) {
        result.push({ ...cat, subcategories: subs });
      }
    }
    return result;
  }, [categories, search, statusFilter]);

  const hasCategoryFilter = Boolean(search.trim() || statusFilter);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreateCategory() {
    setPanelError(null);
    setPanel({ open: true, mode: 'create', kind: 'category', name: '', description: '' });
  }

  function openEditCategory(cat: AdminCategory) {
    setPanelError(null);
    setPanel({
      open: true,
      mode: 'edit',
      kind: 'category',
      id: cat._id,
      name: cat.name,
      description: cat.description ?? '',
      isActive: cat.isActive,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
      subCount: cat.subcategories.length,
    });
  }

  function openCreateSub(categoryId: string, categoryName: string) {
    setPanelError(null);
    setPanel({
      open: true,
      mode: 'create',
      kind: 'subcategory',
      categoryId,
      categoryName,
      name: '',
      description: '',
    });
  }

  function openEditSub(categoryId: string, categoryName: string, sub: AdminSubCategory) {
    setPanelError(null);
    setPanel({
      open: true,
      mode: 'edit',
      kind: 'subcategory',
      categoryId,
      categoryName,
      id: sub._id,
      name: sub.name,
      description: '',
      isActive: sub.isActive,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
    });
  }

  function closePanel() {
    setPanel((p) => ({ ...p, open: false }));
    setPanelError(null);
  }

  async function handleSubmit(name: string, description: string) {
    setSubmitting(true);
    setPanelError(null);
    try {
      if (panel.kind === 'category') {
        if (panel.mode === 'create') {
          await createCategory(name, description || undefined);
        } else if (panel.id) {
          await updateCategory(panel.id, { name, description: description || undefined });
        }
      } else if (panel.categoryId) {
        if (panel.mode === 'create') {
          await createSubCategory(panel.categoryId, name);
        } else if (panel.id) {
          await updateSubCategory(panel.categoryId, panel.id, name);
        }
      }
      setPanel((p) => ({ ...p, open: false }));
      await fetchCategories();
    } catch (err) {
      setPanelError(extractMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleCategoryStatus(cat: AdminCategory) {
    try {
      await setCategoryStatus(cat._id, !cat.isActive);
      await fetchCategories();
    } catch (err) {
      setError(extractMessage(err));
    }
  }

  async function toggleSubStatus(categoryId: string, sub: AdminSubCategory) {
    try {
      await setSubCategoryStatus(categoryId, sub._id, !sub.isActive);
      await fetchCategories();
    } catch (err) {
      setError(extractMessage(err));
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
        title="Quản lí danh mục"
        subtitle="Danh mục và danh mục con"
        actions={
          <>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Tìm theo tên / mô tả..."
              />
            </Box>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <TextField
                select
                size="small"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={filterSx}
                slotProps={{ select: { displayEmpty: true } }}
              >
                <MenuItem value="">Tất cả trạng thái</MenuItem>
                <MenuItem value="active">Đang hiển thị</MenuItem>
                <MenuItem value="hidden">Đã ẩn</MenuItem>
              </TextField>
            </Box>
            <ActionButton
              variant="approve"
              icon={<AddOutlinedIcon />}
              onClick={openCreateCategory}
              sx={{ borderRadius: 0, height: 44 }}
            >
              Tạo danh mục
            </ActionButton>
          </>
        }
      />

      <Stack spacing={1.5} sx={{ display: { xs: 'flex', sm: 'none' }, mb: 2 }}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Tìm theo tên / mô tả..."
          sx={{ width: '100%' }}
        />
        <TextField
          select
          size="small"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ ...filterSx, width: '100%' }}
          slotProps={{ select: { displayEmpty: true } }}
        >
          <MenuItem value="">Tất cả trạng thái</MenuItem>
          <MenuItem value="active">Đang hiển thị</MenuItem>
          <MenuItem value="hidden">Đã ẩn</MenuItem>
        </TextField>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
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
      ) : (
        <AdminCard
          sx={{
            flex: 1,
            borderRadius: 0,
            animation: 'admin-fade-in 320ms ease both',
          }}
        >
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: tokens.color.card }}>
                  <TableCell sx={headSx}>Tên danh mục</TableCell>
                  <TableCell sx={headSx}>Mô tả</TableCell>
                  <TableCell sx={headSx} align="center">
                    Danh mục con
                  </TableCell>
                  <TableCell sx={headSx}>Trạng thái</TableCell>
                  <TableCell sx={headSx}>Cập nhật</TableCell>
                  <TableCell sx={headSx} align="right">
                    Hành động
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ borderBottom: 'none' }}>
                      <EmptyState
                        icon={<InboxOutlinedIcon sx={{ fontSize: 26 }} />}
                        title="Không có dữ liệu"
                        subtitle={
                          hasCategoryFilter
                            ? 'Chưa có danh mục nào khớp với bộ lọc.'
                            : 'Chưa có danh mục nào.'
                        }
                      />
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((cat, idx) => {
                  const isOpen = expanded.has(cat._id);
                  return (
                    <CategoryRows
                      key={cat._id}
                      cat={cat}
                      index={idx}
                      isOpen={isOpen}
                      onToggleExpand={() => toggleExpand(cat._id)}
                      onEditCategory={() => openEditCategory(cat)}
                      onCreateSub={() => openCreateSub(cat._id, cat.name)}
                      onToggleCategoryStatus={() => toggleCategoryStatus(cat)}
                      onEditSub={(sub) => openEditSub(cat._id, cat.name, sub)}
                      onToggleSubStatus={(sub) => toggleSubStatus(cat._id, sub)}
                    />
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </AdminCard>
      )}

      <CategoryDetailDrawer
        key={`${panel.kind}-${panel.mode}-${panel.categoryId ?? ''}-${panel.id ?? ''}-${panel.open ? 'open' : 'closed'}`}
        state={panel}
        submitting={submitting}
        error={panelError}
        onClose={closePanel}
        onSubmit={handleSubmit}
      />
    </Box>
  );
}

interface CategoryRowsProps {
  cat: AdminCategory;
  index: number;
  isOpen: boolean;
  onToggleExpand: () => void;
  onEditCategory: () => void;
  onCreateSub: () => void;
  onToggleCategoryStatus: () => void;
  onEditSub: (sub: AdminSubCategory) => void;
  onToggleSubStatus: (sub: AdminSubCategory) => void;
}

function CategoryRows({
  cat,
  index,
  isOpen,
  onToggleExpand,
  onEditCategory,
  onCreateSub,
  onToggleCategoryStatus,
  onEditSub,
  onToggleSubStatus,
}: CategoryRowsProps) {
  const tile = tilePalette[index % tilePalette.length];
  const hasSubs = cat.subcategories.length > 0;

  return (
    <>
      <TableRow
        sx={{
          animation: 'admin-fade-in 240ms ease both',
          animationDelay: `${Math.min(index, 12) * 28}ms`,
          '&:hover': { bgcolor: `${tokens.color.rowHover} !important` },
        }}
      >
        <TableCell sx={{ py: 2.25, minWidth: 220 }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
            {hasSubs ? (
              <IconButton
                size="small"
                onClick={onToggleExpand}
                sx={{ p: 0.5, color: tokens.color.textMuted }}
              >
                {isOpen ? (
                  <KeyboardArrowDownOutlinedIcon />
                ) : (
                  <KeyboardArrowRightOutlinedIcon />
                )}
              </IconButton>
            ) : (
              <Box sx={{ width: 29 }} />
            )}
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 0,
                bgcolor: tile,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(37,35,32,0.72)',
                flexShrink: 0,
              }}
            >
              <CategoryOutlinedIcon sx={{ fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: 15, color: tokens.color.textPrimary }}>
              {cat.name}
            </Typography>
          </Stack>
        </TableCell>
        <TableCell sx={{ maxWidth: 280 }}>
          <Typography
            sx={{
              color: cat.description ? tokens.color.textDescription : tokens.color.textMuted,
              fontSize: 14,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {cat.description || '—'}
          </Typography>
        </TableCell>
        <TableCell align="center">
          <Typography
            sx={{ fontFamily: tokens.font.mono, fontSize: 13, color: tokens.color.textSecondary }}
          >
            {cat.subcategories.length}
          </Typography>
        </TableCell>
        <TableCell>
          <StatusBadge isActive={cat.isActive} />
        </TableCell>
        <TableCell>
          <Typography sx={{ fontSize: 14, color: tokens.color.textSecondary, whiteSpace: 'nowrap' }}>
            {formatTime(cat.updatedAt)}
          </Typography>
        </TableCell>
        <TableCell align="right">
          <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
            <Tooltip title="Thêm danh mục con">
              <IconButton
                size="small"
                onClick={onCreateSub}
                sx={{ color: tokens.color.textSecondary }}
              >
                <AddOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Chỉnh sửa">
              <IconButton
                size="small"
                onClick={onEditCategory}
                sx={{ color: tokens.color.textSecondary }}
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={cat.isActive ? 'Ẩn' : 'Khôi phục'}>
              <IconButton
                size="small"
                onClick={onToggleCategoryStatus}
                sx={{
                  color: cat.isActive ? tokens.color.red : tokens.color.green,
                  '&:hover': {
                    bgcolor: cat.isActive
                      ? tokens.color.redSoftBg
                      : 'rgba(46,125,50,0.08)',
                  },
                }}
              >
                {cat.isActive ? (
                  <VisibilityOffOutlinedIcon fontSize="small" />
                ) : (
                  <VisibilityOutlinedIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </Stack>
        </TableCell>
      </TableRow>

      {isOpen &&
        cat.subcategories.map((sub) => (
          <TableRow
            key={sub._id}
            sx={{
              bgcolor: tokens.color.rowSubTint,
              '&:hover': { bgcolor: `${tokens.color.rowHover} !important` },
            }}
          >
            <TableCell sx={{ py: 1.75, minWidth: 220 }}>
              <Stack
                direction="row"
                spacing={1.25}
                sx={{ alignItems: 'center', pl: 5.5 }}
              >
                <SubdirectoryArrowRightOutlinedIcon
                  sx={{ fontSize: 18, color: tokens.color.textMuted }}
                />
                <Typography sx={{ fontWeight: 500, fontSize: 14, color: tokens.color.textPrimary }}>
                  {sub.name}
                </Typography>
              </Stack>
            </TableCell>
            <TableCell>
              <Typography sx={{ color: tokens.color.textMuted, fontSize: 14 }}>
                Danh mục con
              </Typography>
            </TableCell>
            <TableCell align="center">
              <Typography sx={{ color: tokens.color.textMuted, fontFamily: tokens.font.mono, fontSize: 13 }}>
                —
              </Typography>
            </TableCell>
            <TableCell>
              <StatusBadge isActive={sub.isActive} />
            </TableCell>
            <TableCell>
              <Typography sx={{ fontSize: 14, color: tokens.color.textSecondary, whiteSpace: 'nowrap' }}>
                {formatTime(sub.updatedAt)}
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                <Tooltip title="Chỉnh sửa">
                  <IconButton
                    size="small"
                    onClick={() => onEditSub(sub)}
                    sx={{ color: tokens.color.textSecondary }}
                  >
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={sub.isActive ? 'Ẩn' : 'Khôi phục'}>
                  <IconButton
                    size="small"
                    onClick={() => onToggleSubStatus(sub)}
                    sx={{
                      color: sub.isActive ? tokens.color.red : tokens.color.green,
                      '&:hover': {
                        bgcolor: sub.isActive
                          ? tokens.color.redSoftBg
                          : 'rgba(46,125,50,0.08)',
                      },
                    }}
                  >
                    {sub.isActive ? (
                      <VisibilityOffOutlinedIcon fontSize="small" />
                    ) : (
                      <VisibilityOutlinedIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
              </Stack>
            </TableCell>
          </TableRow>
        ))}
    </>
  );
}
