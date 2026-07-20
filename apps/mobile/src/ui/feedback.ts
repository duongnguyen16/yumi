type ApiFailure = {
  message?: string | string[];
  response?: { data?: { message?: string | string[] } };
};

function formatMessage(message: string | string[] | undefined) {
  if (Array.isArray(message)) {
    const messages = message.filter(Boolean);
    return messages.join(". ");
  }

  return message?.trim();
}

export function getNoticeMessage(value: unknown, fallback: string) {
  if (typeof value === "string") {
    const message = value.trim();
    if (message) return message;
  }

  if (value instanceof Error) {
    const message = value.message.trim();
    if (message) return message;
  }

  if (typeof value === "object" && value !== null) {
    const failure = value as ApiFailure;
    const responseMessage = formatMessage(failure.response?.data?.message);
    if (responseMessage) return responseMessage;

    const directMessage = formatMessage(failure.message);
    if (directMessage) return directMessage;
  }

  return fallback;
}
