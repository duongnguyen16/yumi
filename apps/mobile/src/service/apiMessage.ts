export function formatApiMessage(message: unknown, fallback: string) {
  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (Array.isArray(message)) {
    const text = message
      .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
      .join("\n");

    if (text) {
      return text;
    }
  }

  return fallback;
}
