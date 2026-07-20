import api from "./aixos";
import {
  createProduct,
  updateProduct,
  type ProductPayload,
} from "./productService";

jest.mock("./aixos", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

class RecordingFormData {
  static instances: RecordingFormData[] = [];

  entries: Array<[string, unknown]> = [];

  constructor() {
    RecordingFormData.instances.push(this);
  }

  append(name: string, value: unknown) {
    this.entries.push([name, value]);
  }
}

describe("productService", () => {
  const originalFormData = global.FormData;

  beforeAll(() => {
    global.FormData = RecordingFormData as unknown as typeof FormData;
  });

  afterAll(() => {
    global.FormData = originalFormData;
  });

  beforeEach(() => {
    RecordingFormData.instances = [];
    jest.clearAllMocks();
    (api.post as jest.Mock).mockResolvedValue({
      data: { success: true, message: "Đã tạo" },
    });
    (api.patch as jest.Mock).mockResolvedValue({
      data: { success: true, message: "Đã cập nhật" },
    });
  });

  it("creates a product with multipart form data", async () => {
    const payload: ProductPayload = {
      name: "Cafe sữa",
      description: "Cốc đầu ngày",
      price: 25000,
      image: {
        uri: "file:///product.png",
        name: "product.png",
        type: "image/png",
      },
    };

    await createProduct("location-1", payload);

    expect(RecordingFormData.instances).toHaveLength(1);
    expect(RecordingFormData.instances[0].entries).toEqual([
      [
        "data",
        JSON.stringify({
          name: "Cafe sữa",
          description: "Cốc đầu ngày",
          price: 25000,
        }),
      ],
      [
        "image",
        {
          uri: "file:///product.png",
          name: "product.png",
          type: "image/png",
        },
      ],
    ]);
    expect(api.post).toHaveBeenCalledWith(
      "/products/location/location-1",
      RecordingFormData.instances[0],
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
  });

  it("updates a product image with multipart form data", async () => {
    const payload: ProductPayload = {
      name: "Cafe đen",
      image: {
        uri: "file:///updated.png",
        name: "updated.png",
        type: "image/png",
      },
    };

    await updateProduct("product-1", payload);

    expect(RecordingFormData.instances).toHaveLength(1);
    expect(RecordingFormData.instances[0].entries).toEqual([
      [
        "data",
        JSON.stringify({
          name: "Cafe đen",
        }),
      ],
      [
        "image",
        {
          uri: "file:///updated.png",
          name: "updated.png",
          type: "image/png",
        },
      ],
    ]);
    expect(api.patch).toHaveBeenCalledWith(
      "/products/product-1",
      RecordingFormData.instances[0],
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
  });
});
