const fieldLabels: Record<string, string> = {
  name: 'Tên địa điểm',
  address: 'Địa chỉ',
  openingHours: 'Giờ mở cửa',
  phone: 'Số điện thoại',
  geo: 'Tọa độ',
  flag: 'Cờ trạng thái',
};

const flagLabels: Record<string, string> = {
  DUPLICATE: 'Địa điểm trùng lặp',
  PERMANENTLY_CLOSED: 'Đã đóng cửa vĩnh viễn',
  NON_EXISTENT: 'Địa điểm không tồn tại',
};

const outcomeLabels: Record<string, string> = {
  UPDATED: 'Đã cập nhật',
  PENDING_RE_APPROVAL: 'Chuyển sang duyệt lại',
  PUSHED_TO_DUPLICATE_REVIEW: 'Chuyển sang kiểm tra trùng lặp',
  HIDDEN: 'Đã ẩn địa điểm',
};

function humanize(value: string) {
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();

  return words ? words.charAt(0).toUpperCase() + words.slice(1) : '—';
}

export function editSuggestionFieldLabel(value?: string | null) {
  return value ? fieldLabels[value] ?? humanize(value) : '—';
}

export function editSuggestionValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';

  if (typeof value === 'string') return flagLabels[value] ?? value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(editSuggestionValue).join(', ');

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;

    if ('value' in record) return editSuggestionValue(record.value);

    if (
      typeof record.latitude === 'number' &&
      typeof record.longitude === 'number'
    ) {
      const accuracy =
        typeof record.accuracyMeters === 'number'
          ? ` (±${record.accuracyMeters} m)`
          : '';
      return `${record.latitude}, ${record.longitude}${accuracy}`;
    }

    if (
      record.type === 'Point' &&
      Array.isArray(record.coordinates) &&
      record.coordinates.length >= 2
    ) {
      return `${editSuggestionValue(record.coordinates[1])}, ${editSuggestionValue(record.coordinates[0])}`;
    }

    try {
      return JSON.stringify(record);
    } catch {
      return '—';
    }
  }

  return String(value);
}

export function editSuggestionOutcomeLabel(value?: string | null) {
  return value ? outcomeLabels[value] ?? humanize(value) : '—';
}
