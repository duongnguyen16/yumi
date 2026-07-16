import api from "./aixos";

const getAllCategories = async () => {
  try {
    const response = await api.get("/categories");
    return response.data;
  } catch {
    return {
      success: false,
    };
  }
};

const getSubCategory = async (categoryId: string) => {
  try {
    const response = await api.get(`/categories/sub/${categoryId}`);
    return response.data;
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || "Đã có lỗi xảy ra",
    };
  }
};

export { getAllCategories, getSubCategory };
