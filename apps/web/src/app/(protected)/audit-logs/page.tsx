"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  Tooltip,
  Typography,
  TablePagination,
  TextField,
  MenuItem,
  type SxProps,
  type Theme,
} from "@mui/material";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import dayjs from "dayjs";
import { listAuditLogs, type AuditLogEntry } from "@/lib/admin-api";
import { Topbar } from "@/components/admin/Topbar";
import { AdminCard } from "@/components/admin/AdminCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { SearchInput } from "@/components/admin/SearchInput";
import { tokens } from "@/theme/admin-tokens";

function extractMessage(err: unknown): string {
  const e = err as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return e?.response?.data?.message ?? e?.message ?? "Đã xảy ra lỗi";
}

function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

const headSx: SxProps<Theme> = {
  fontFamily: tokens.font.mono,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: tokens.color.textSecondary,
  borderBottom: `1px solid ${tokens.color.border}`,
  py: 2,
  whiteSpace: "nowrap",
};

const filterSx: SxProps<Theme> = {
  minWidth: 190,
  "& .MuiOutlinedInput-root": {
    borderRadius: 0,
    bgcolor: tokens.color.inputBg,
    fontSize: 14,
  },
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [actionFilter, setActionFilter] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("");
  const [search, setSearch] = useState("");

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string | number> = {
        page: page + 1,
        limit: rowsPerPage,
      };
      if (actionFilter) params.action = actionFilter;
      const res = await listAuditLogs(params);
      setLogs(res.data);
      setTotal(res.total);
      setActions(res.actions);
    } catch (err) {
      setError(extractMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, actionFilter]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const handleChangePage = useCallback((_: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setRowsPerPage(parseInt(event.target.value, 10));
      setPage(0);
    },
    [],
  );

  const filteredLogs = useMemo(() => {
    const q = normalizeSearch(search.trim());

    return logs.filter(
      (log) =>
        (!collectionFilter || log.targetCollection === collectionFilter) &&
        (!q ||
          normalizeSearch(
            [
              log.actorId?.fullName,
              log.actorId?.email,
              log.action,
              log.targetCollection,
              log.targetId,
              log.reason,
              dayjs(log.createdAt).format("DD/MM/YYYY HH:mm"),
            ]
              .filter(Boolean)
              .join(" "),
          ).includes(q)),
    );
  }, [collectionFilter, logs, search]);

  const collectionOptions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.targetCollection))).sort(),
    [logs],
  );
  const hasAuditFilter = Boolean(search.trim() || actionFilter || collectionFilter);

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Topbar
        title="Lịch sử hoạt động"
        subtitle="Audit log"
        actions={
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Tìm kiếm audit log..."
              sx={{ width: { xs: "100%", sm: 260 } }}
            />
            <TextField
              select
              size="small"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(0);
              }}
              sx={filterSx}
              slotProps={{ select: { displayEmpty: true } }}
            >
              <MenuItem value="">Tất cả hành động</MenuItem>
              {actions.map((a) => (
                <MenuItem key={a} value={a}>
                  {a}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              value={collectionFilter}
              onChange={(e) => setCollectionFilter(e.target.value)}
              sx={filterSx}
              slotProps={{ select: { displayEmpty: true } }}
            >
              <MenuItem value="">Tất cả đối tượng</MenuItem>
              {collectionOptions.map((collection) => (
                <MenuItem key={collection} value={collection}>
                  {collection}
                </MenuItem>
              ))}
            </TextField>
            <Tooltip title="Làm mới">
              <span>
                <IconButton
                  onClick={() => fetchLogs()}
                  disabled={loading}
                  sx={{ color: tokens.color.textSecondary }}
                >
                  <RefreshOutlinedIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        }
      />

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2, borderRadius: 0 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {loading && logs.length === 0 ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
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
            display: "flex",
            flexDirection: "column",
            animation: "admin-fade-in 320ms ease both",
          }}
        >
          <Box sx={{ overflowX: "auto", flex: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: tokens.color.card }}>
                  <TableCell sx={headSx}>Thời gian</TableCell>
                  <TableCell sx={headSx}>Người thực hiện</TableCell>
                  <TableCell sx={headSx}>Hành động</TableCell>
                  <TableCell sx={headSx}>Đối tượng</TableCell>
                  <TableCell sx={headSx}>Lý do</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ borderBottom: "none" }}>
                      <EmptyState
                        icon={<InboxOutlinedIcon sx={{ fontSize: 26 }} />}
                        title="Không có hoạt động"
                        subtitle={
                          search.trim()
                            ? "Không có audit log khớp tìm kiếm."
                            : hasAuditFilter
                              ? "Không có audit log khớp bộ lọc."
                              : "Chưa có audit log nào."
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow
                      key={log._id}
                      sx={{
                        "&:hover": {
                          bgcolor: `${tokens.color.rowHover} !important`,
                        },
                      }}
                    >
                      <TableCell sx={{ py: 2, whiteSpace: "nowrap" }}>
                        <Typography
                          sx={{
                            fontFamily: tokens.font.mono,
                            fontSize: 13,
                            color: tokens.color.textSecondary,
                          }}
                        >
                          {dayjs(log.createdAt).format("DD/MM/YYYY HH:mm")}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Typography
                          sx={{
                            fontSize: 14,
                            color: tokens.color.textPrimary,
                            fontWeight: 500,
                          }}
                        >
                          {log.actorId?.fullName || log.actorId?.email || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Typography
                          sx={{
                            fontFamily: tokens.font.mono,
                            fontSize: 12,
                            color: tokens.color.orange,
                            fontWeight: 600,
                          }}
                        >
                          {log.action}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Typography
                          sx={{
                            fontSize: 14,
                            color: tokens.color.textSecondary,
                          }}
                        >
                          {log.targetCollection}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 2, maxWidth: 280 }}>
                        <Typography
                          sx={{
                            fontSize: 13,
                            color: tokens.color.textDescription,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {log.reason || "—"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>

          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 20, 50, 100]}
            labelRowsPerPage="Số dòng:"
            sx={{
              borderTop: `1px solid ${tokens.color.border}`,
              fontFamily: tokens.font.sans,
              fontSize: 14,
              color: tokens.color.textSecondary,
              "& .MuiTablePagination-toolbar": { minHeight: 52 },
            }}
          />
        </AdminCard>
      )}
    </Box>
  );
}
