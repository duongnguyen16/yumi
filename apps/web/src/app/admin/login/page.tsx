"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import { login } from "@/lib/admin-api";
import { setAuth } from "@/lib/auth";
import { tokens } from "@/theme/admin-tokens";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.success && res.user?.role === "ADMIN") {
        setAuth({
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
          user: res.user,
        });
        router.push("/admin/categories");
        return;
      }
      setError("Tài khoản không có quyền admin");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg ?? "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: tokens.color.bg,
        backgroundImage:
          "radial-gradient(800px circle at 50% -10%, rgba(233,85,46,0.07), transparent 50%), radial-gradient(600px circle at 10% 105%, rgba(208,223,194,0.08), transparent 50%)",
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          width: 400,
          bgcolor: tokens.color.card,
          border: `1px solid ${tokens.color.border}`,
          borderRadius: 0,
          boxShadow: tokens.shadow.card,
          p: 4,
          animation: "admin-fade-in-up 340ms ease both",
        }}
      >
        <Stack spacing={1.5} sx={{ mb: 3.5, textAlign: "center" }}>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 0.5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 0,
                bgcolor: tokens.color.orange,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                boxShadow: "0 6px 16px rgba(233,85,46,0.30)",
              }}
            >
              <PlaceOutlinedIcon sx={{ fontSize: 24 }} />
            </Box>
          </Box>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: 22,
              color: tokens.color.textPrimary,
            }}
          >
            Yumi Admin
          </Typography>
          <Typography
            sx={{
              fontFamily: tokens.font.mono,
              color: tokens.color.textSecondary,
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Panel quản trị
          </Typography>
        </Stack>

        <Stack spacing={2}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            autoComplete="email"
            autoFocus
          />
          <TextField
            label="Mật khẩu"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            autoComplete="current-password"
          />
          {error && (
            <Alert severity="error" sx={{ borderRadius: 0 }}>
              {error}
            </Alert>
          )}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            sx={{ height: 44, mt: 1 }}
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
