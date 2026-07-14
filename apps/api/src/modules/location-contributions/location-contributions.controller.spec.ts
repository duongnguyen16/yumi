import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { SubmitLocationRequestDto } from './dto/submit-location-request.dto';
import { LocationContributionsController } from './location-contributions.controller';

describe('LocationContributionsController', () => {
  const userId = '64b64c000000000000000001';
  const validData = {
    name: 'Quán cà phê thử nghiệm',
    description: 'Địa điểm dùng để kiểm tra luồng đóng góp.',
    categoryId: '64b64c000000000000000002',
    tagIds: [],
    address: '1 Đường Test, Thành phố Hồ Chí Minh',
    latitude: 10.7769,
    longitude: 106.7009,
    deviceLatitude: 10.7769,
    deviceLongitude: 106.7009,
  };
  const imageFiles = [
    {
      originalname: 'place.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from('place'),
    },
  ] as Express.Multer.File[];
  const request = { user: { userId } };

  let service: { submitContribution: jest.Mock };
  let controller: LocationContributionsController;
  let submitContribution: (
    data: string,
    files: Express.Multer.File[],
    req: typeof request,
  ) => Promise<unknown>;

  beforeEach(() => {
    service = {
      submitContribution: jest.fn().mockResolvedValue({ success: true }),
    };
    controller = new LocationContributionsController(service as never);
    submitContribution = controller.submitContribution.bind(controller) as (
      data: string,
      files: Express.Multer.File[],
      req: typeof request,
    ) => Promise<unknown>;
  });

  it('parses multipart data and forwards uploaded images to the service', async () => {
    await submitContribution(JSON.stringify(validData), imageFiles, request);

    expect(service.submitContribution).toHaveBeenCalledWith(
      userId,
      expect.objectContaining(validData) as SubmitLocationRequestDto,
      imageFiles,
    );
  });

  it('rejects malformed multipart data JSON', async () => {
    await expect(
      submitContribution('{', imageFiles, request),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.submitContribution).not.toHaveBeenCalled();
  });

  it('rejects a contribution without image files', async () => {
    await expect(
      submitContribution(JSON.stringify(validData), [], request),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.submitContribution).not.toHaveBeenCalled();
  });
});
