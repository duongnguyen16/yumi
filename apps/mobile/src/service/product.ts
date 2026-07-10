import api from "./aixos";

const getAllProductsByLocation = async (locationId: string) => {
  try {
    const response = await api.get(`/products/${locationId}`);
    return response.data;
  } catch (error) {
    console.log("Error fetching products by location:", error);
    return {
      success: false,
      message:
        error?.response?.data?.message ||
        "Xảy ra lỗi khi lấy danh sách sản phẩm",
    };
  }
};

export { getAllProductsByLocation };
