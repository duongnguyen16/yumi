import api from "./aixos";

const toAbsoluteUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const baseUrl = api.defaults.baseURL?.replace(/\/api\/?$/, "") ?? "";
  return `${baseUrl}${url}`;
};

export { toAbsoluteUrl };
