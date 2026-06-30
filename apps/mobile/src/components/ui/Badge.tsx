import { StyleProp, StyleSheet, TextStyle } from "react-native";
import { Badge as PaperBadge } from "react-native-paper";

type LocationStatus =
  | "SUBMITTED"
  | "PUBLISHED"
  | "HIDDEN"
  | "REJECTED"
  | "PENDING_RE_APPROVAL"
  | "DELETED"
  | "OPENING"
  | "CLOSED"
  | (string & {});

type StatusConfig = {
  label: string;
  backgroundColor: string;
  color: string;
};

type BadgeProps = {
  status?: LocationStatus | null;
  size?: number;
  visible?: boolean;
  style?: StyleProp<TextStyle>;
};

const statusConfigs: Record<string, StatusConfig> = {
  SUBMITTED: {
    label: "Chờ duyệt",
    backgroundColor: "#F59E0B",
    color: "#111827",
  },
  PUBLISHED: {
    label: "Đã xác minh",
    backgroundColor: "#16A34A",
    color: "#FFFFFF",
  },
  HIDDEN: {
    label: "Đã ẩn",
    backgroundColor: "#6B7280",
    color: "#FFFFFF",
  },
  REJECTED: {
    label: "Bị từ chối",
    backgroundColor: "#DC2626",
    color: "#FFFFFF",
  },
  PENDING_RE_APPROVAL: {
    label: "Chờ duyệt lại",
    backgroundColor: "#2563EB",
    color: "#FFFFFF",
  },
  DELETED: {
    label: "Đã xóa",
    backgroundColor: "#374151",
    color: "#FFFFFF",
  },
  OPENING: {
    label: "Đang mở",
    backgroundColor: "#10B981",
    color: "#FFFFFF",
  },
  CLOSED: {
    label: "Đã đóng",
    backgroundColor: "#9CA3AF",
    color: "#FFFFFF",
  },
};

export default function Badge({
  status,
  size = 26,
  visible = true,
  style,
}: BadgeProps) {
  const normalizedStatus = status?.trim().toUpperCase() ?? "";
  const config = statusConfigs[normalizedStatus] ?? {
    label: "Không rõ",
    backgroundColor: "#E5E7EB",
    color: "#374151",
  };

  return (
    <PaperBadge
      visible={visible}
      size={size}
      style={[
        styles.badge,
        {
          backgroundColor: config.backgroundColor,
          color: config.color,
        },
        style,
      ]}
    >
      {config.label}
    </PaperBadge>
  );
}

export type { BadgeProps, LocationStatus };

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    fontWeight: "600",
    paddingHorizontal: 10,
  },
});
