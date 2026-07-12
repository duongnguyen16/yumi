import api from "./aixos";

type ProductPayload = {
  name: string;
  description?: string;
  imageUrl?: string;
  price?: number | null;
};

const createProduct = async (locationId: string, payload: ProductPayload) => {
  try {
    const response = await api.post(`/products/location/${locationId}`, payload);
    return response.data;
  } catch (error) {
    return {
      success: false,
      message:
        error?.response?.data?.message || "Không thể tạo sản phẩm. Hãy thử lại.",
    };
  }
};

const updateProduct = async (productId: string, payload: ProductPayload) => {
  try {
    const response = await api.patch(`/products/${productId}`, payload);
    return response.data;
  } catch (error) {
    return {
      success: false,
      message:
        error?.response?.data?.message ||
        "Không thể cập nhật sản phẩm. Hãy thử lại.",
    };
  }
};

const deleteProduct = async (productId: string) => {
  try {
    const response = await api.delete(`/products/${productId}`);
    return response.data;
  } catch (error) {
    return {
      success: false,
      message:
        error?.response?.data?.message || "Không thể xóa sản phẩm. Hãy thử lại.",
    };
  }
};

export { createProduct, updateProduct, deleteProduct };
export type { ProductPayload };
