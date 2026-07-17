import api from "./aixos";

export type BookmarkedLocation = {
  bookmarkId: string;
  location: {
    _id: string;
    name: string;
    address?: string;
    imagesUrls?: { url: string; isCover?: boolean }[];
    rating?: { avgRating: number; reviewCount: number };
    category?: { name: string };
  };
};

const checkBookmark = async (locationId: string) => {
  try {
    const res = await api.get(`/bookmarks/${locationId}/check`);
    return res.data as { success: boolean; isBookmarked: boolean };
  } catch {
    return { success: false, isBookmarked: false };
  }
};

const addBookmark = async (locationId: string) => {
  try {
    const res = await api.post(`/bookmarks/${locationId}`);
    return res.data as { success: boolean; message?: string };
  } catch {
    return { success: false };
  }
};

const removeBookmark = async (locationId: string) => {
  try {
    const res = await api.delete(`/bookmarks/${locationId}`);
    return res.data as { success: boolean; message?: string };
  } catch {
    return { success: false };
  }
};

const listBookmarks = async (page = 1, limit = 20) => {
  try {
    const res = await api.get("/bookmarks", { params: { page, limit } });
    return res.data as {
      success: boolean;
      data: BookmarkedLocation[];
      total: number;
      page: number;
      limit: number;
    };
  } catch {
    return { success: false, data: [], total: 0, page: 1, limit: 20 };
  }
};

export { checkBookmark, addBookmark, removeBookmark, listBookmarks };