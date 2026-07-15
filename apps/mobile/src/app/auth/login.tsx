import AuthScreen from "@/components/auth/AuthScreen";
import LoginForm from "@/components/auth/LoginForm";
import { userContext } from "@/contexts/userContext";
import { LoadingState, Page } from "@/ui/components";
import { useRouter } from "expo-router";
import { useContext, useEffect } from "react";

export default function Login() {
  const { user, loading } = useContext(userContext);
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/home");
  }, [router, user]);

  if (loading) {
    return <Page><LoadingState /></Page>;
  }

  return (
    <AuthScreen supportingText="Đăng nhập để lưu địa điểm, theo dõi hoạt động và quản lý đóng góp của bạn." title="Chào mừng trở lại">
      <LoginForm />
    </AuthScreen>
  );
}
