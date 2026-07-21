export type AppealDecision = 'ACCEPTED_TO_DISPUTE' | 'OVERTURNED' | 'UPHELD';

export interface AppealDecisionOption {
  value: AppealDecision;
  label: string;
  description: string;
  tone: 'positive' | 'warning' | 'neutral';
}

const appealTypeLabels: Record<string, string> = {
  REQUEST_ACCESS_REJECTED: 'Từ chối yêu cầu quyền truy cập',
  LOCATION_REJECTED: 'Từ chối địa điểm',
  OWNERSHIP_REVOKED: 'Thu hồi quyền sở hữu',
  USER_BANNED: 'Khóa tài khoản',
};

const appealStatusLabels: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  ACCEPTED_TO_DISPUTE: 'Đã chuyển sang tranh chấp',
  OVERTURNED: 'Đã đảo quyết định',
  UPHELD: 'Giữ nguyên quyết định',
};

const locationRequestTypeLabels: Record<string, string> = {
  CREATE: 'Tạo địa điểm mới',
  UPDATE: 'Cập nhật địa điểm',
  DELETE: 'Xóa địa điểm',
};

const locationRequestStatusLabels: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Đã từ chối',
  CANCELLED: 'Đã hủy',
  PENDING_RE_APPROVAL: 'Chờ duyệt lại',
};

const locationStatusLabels: Record<string, string> = {
  SUBMITTED: 'Đã gửi duyệt',
  PUBLISHED: 'Đang hiển thị',
  HIDDEN: 'Đã ẩn',
  REJECTED: 'Đã từ chối',
  PENDING_RE_APPROVAL: 'Chờ duyệt lại',
  DELETED: 'Đã xóa',
};

const locationFieldLabels: Record<string, string> = {
  name: 'Tên địa điểm',
  address: 'Địa chỉ',
  categoryId: 'Danh mục',
  category: 'Danh mục',
  location: 'Tọa độ',
  coordinates: 'Tọa độ',
  phone: 'Số điện thoại',
  website: 'Trang web',
  description: 'Mô tả',
  imageUrls: 'Hình ảnh',
  openingHours: 'Giờ mở cửa',
  subCategoryIds: 'Danh mục phụ',
  pinLatitude: 'Vĩ độ ghim',
  pinLongitude: 'Kinh độ ghim',
  deviceLatitude: 'Vĩ độ thiết bị',
  deviceLongitude: 'Kinh độ thiết bị',
  accuracyMeters: 'Độ chính xác',
  systemCode: 'Mã hệ thống',
  sourceEditSuggestionId: 'Mã đề xuất chỉnh sửa',
  ward: 'Phường / xã',
  district: 'Quận / huyện',
  province: 'Tỉnh / thành phố',
};

const disputeOption: AppealDecisionOption = {
  value: 'ACCEPTED_TO_DISPUTE',
  label: 'Chuyển sang tranh chấp',
  description: 'Mở hồ sơ tranh chấp để Admin xem bằng chứng đã nộp.',
  tone: 'positive',
};

const overturnOption: AppealDecisionOption = {
  value: 'OVERTURNED',
  label: 'Đảo quyết định',
  description: 'Khôi phục đối tượng về trạng thái trước quyết định bất lợi.',
  tone: 'positive',
};

const upholdOption: AppealDecisionOption = {
  value: 'UPHELD',
  label: 'Giữ nguyên quyết định',
  description: 'Giữ kết quả ban đầu và kết thúc hồ sơ kháng cáo.',
  tone: 'warning',
};

export function humanizeAdminValue(value?: string | null): string {
  if (!value) return '—';

  const words = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();

  return words ? words.charAt(0).toUpperCase() + words.slice(1) : '—';
}

export function appealTypeLabel(value?: string | null): string {
  return value ? appealTypeLabels[value] ?? humanizeAdminValue(value) : '—';
}

export function appealStatusLabel(value?: string | null): string {
  return value ? appealStatusLabels[value] ?? humanizeAdminValue(value) : '—';
}

export function locationRequestTypeLabel(value?: string | null): string {
  return value ? locationRequestTypeLabels[value] ?? humanizeAdminValue(value) : '—';
}

export function locationRequestStatusLabel(value?: string | null): string {
  return value ? locationRequestStatusLabels[value] ?? humanizeAdminValue(value) : '—';
}

export function locationStatusLabel(value?: string | null): string {
  return value ? locationStatusLabels[value] ?? humanizeAdminValue(value) : '—';
}

export function locationFieldLabel(value?: string | null): string {
  return value ? locationFieldLabels[value] ?? humanizeAdminValue(value) : '—';
}

export function appealDecisionOptions(type?: string | null): AppealDecisionOption[] {
  return type === 'REQUEST_ACCESS_REJECTED'
    ? [disputeOption, upholdOption]
    : [overturnOption, upholdOption];
}

export function appealDecisionLabel(value?: string | null): string {
  return appealStatusLabel(value);
}
