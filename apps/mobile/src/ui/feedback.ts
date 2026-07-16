type ApiFailure = {
  message?: string | string[];
  response?: { data?: { message?: string | string[] } };
};

const formatMessage = (message: string | string[] | undefined) => Array.isArray(message) ? message.filter(Boolean).join(". ") : message?.trim();

export function getNoticeMessage(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value instanceof Error && value.message.trim()) return value.message.trim();
  if (typeof value === "object" && value !== null) {
    const failure = value as ApiFailure;
    return formatMessage(failure.response?.data?.message) || formatMessage(failure.message) || fallback;
  }
  return fallback;
}
