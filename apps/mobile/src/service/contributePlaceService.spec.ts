import api from './aixos';
import {
  CustomerContributionPayload,
  PendingContributionImage,
  submitCustomerContribution,
  submitVendorRegistration,
} from './contributePlaceService';

jest.mock('./aixos', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
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

describe('submitCustomerContribution', () => {
  const originalFormData = global.FormData;
  const payload = {
    name: 'Quán cà phê thử nghiệm',
    description: 'Địa điểm dùng để kiểm tra luồng đóng góp.',
    categoryId: '64b64c000000000000000002',
    tagIds: [],
    address: '1 Đường Test, Thành phố Hồ Chí Minh',
    latitude: 10.7769,
    longitude: 106.7009,
    deviceLatitude: 10.7769,
    deviceLongitude: 106.7009,
    suspectedDuplicateLocationIds: [],
  } as CustomerContributionPayload;
  const imageFiles: PendingContributionImage[] = [
    {
      uri: 'file:///place.jpg',
      fileName: 'place.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1024,
    },
  ];

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
      data: { success: true, message: 'Đã gửi' },
    });
  });

  it('sends contribution data and local images as multipart form data', async () => {
    const submit = submitCustomerContribution as unknown as (
      contribution: CustomerContributionPayload,
      files: PendingContributionImage[],
    ) => Promise<unknown>;

    await submit(payload, imageFiles);

    expect(RecordingFormData.instances).toHaveLength(1);
    const form = RecordingFormData.instances[0];
    expect(form.entries).toEqual([
      ['data', JSON.stringify(payload)],
      [
        'imageFiles',
        {
          uri: 'file:///place.jpg',
          name: 'place.jpg',
          type: 'image/jpeg',
        },
      ],
    ]);
    expect(api.post).toHaveBeenCalledWith(
      '/location/contribution/submit',
      form,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
  });

  it('does not apply the short API timeout to vendor evidence uploads', async () => {
    await submitVendorRegistration({
      ...payload,
      systemCode: 'ABC123',
      videoFiles: [
        {
          uri: 'file:///evidence.mp4',
          fileName: 'evidence.mp4',
          mimeType: 'video/mp4',
          fileSize: 1024,
        },
      ],
      licenseFiles: [],
      imageFiles,
    });

    expect(api.post).toHaveBeenCalledWith(
      '/location/register',
      expect.anything(),
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 0,
      },
    );
  });
});
