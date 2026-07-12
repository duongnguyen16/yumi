import api from "./aixos";
import {
  submitVendorRegistration,
  type VendorRegistrationPayload,
} from "./contributePlaceService";

jest.mock("./aixos", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

const validPayload: VendorRegistrationPayload = {
  name: "Quán ăn thử nghiệm",
  description: "Mô tả địa điểm dài hơn mười ký tự.",
  openingHours: "07:00-21:00",
  categoryId: "507f1f77bcf86cd799439011",
  tagIds: [],
  address: "1 Đường Ví Dụ, Đà Nẵng",
  latitude: 16.0544,
  longitude: 108.2022,
  deviceLatitude: 16.0544,
  deviceLongitude: 108.2022,
  accuracyMeters: 8,
  imageUrls: [],
  systemCode: "123456",
  videoFiles: [],
  licenseFiles: [],
  imageFiles: [],
};

describe("submitVendorRegistration", () => {
  it("rejects an unsuccessful API response", async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { success: false, message: "Rejected" },
    });

    await expect(submitVendorRegistration(validPayload)).rejects.toThrow(
      "Rejected",
    );
  });
});
