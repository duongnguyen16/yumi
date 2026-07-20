import api from "./aixos";

type ProductPayload = {
  name: string;
  description?: string;
  price?: number | null;
  image?: {
    uri: string;
    name: string;
    type: string;
  };
  removeImage?: boolean;
};

const createProduct = async (locationId: string, payload: ProductPayload) => {
  try {
    const response = await api.post(
      `/products/location/${locationId}`,
      toFormData(payload),
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
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
    const response = await api.patch(
      `/products/${productId}`,
      toFormData(payload),
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
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

const toFormData = (payload: ProductPayload) => {
  const formData = new FormData();
  const { image, ...data } = payload;

  formData.append("data", JSON.stringify(data));
  if (image) {
    formData.append("image", image as never);
  }

  return formData;
};

export { createProduct, updateProduct, deleteProduct };
export type { ProductPayload };
