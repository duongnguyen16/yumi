import { Types } from 'mongoose';
import { ImagesService } from '../images/images.service';
import { ProductsService } from './products.service';

const locationId = new Types.ObjectId().toHexString();
const productId = new Types.ObjectId().toHexString();
const userId = new Types.ObjectId().toHexString();

function createProductDocument(
  overrides: Partial<{
    imageUrl: string;
    imagePath: string;
  }> = {},
) {
  const product = {
    _id: new Types.ObjectId(productId),
    locationId: new Types.ObjectId(locationId),
    name: 'Coffee',
    description: undefined as string | undefined,
    price: 25_000,
    imageUrl: overrides.imageUrl,
    imagePath: overrides.imagePath,
    save: jest.fn().mockResolvedValue(undefined),
    deleteOne: jest.fn().mockResolvedValue(undefined),
    toObject: jest.fn(),
  };
  product.toObject.mockImplementation(() => ({
    _id: product._id,
    locationId: product.locationId,
    name: product.name,
    description: product.description,
    price: product.price,
    imageUrl: product.imageUrl,
    imagePath: product.imagePath,
  }));
  return product;
}

function createService() {
  const productModel = {
    countDocuments: jest.fn().mockResolvedValue(0),
    create: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
  };
  const locationModel = {
    findById: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(locationId),
        ownerId: new Types.ObjectId(userId),
      }),
    }),
    exists: jest.fn(),
  };
  const imagesService = {
    uploadProductImage: jest.fn(),
    deleteProductImage: jest.fn().mockResolvedValue(undefined),
  };

  const service = new ProductsService(
    productModel as never,
    locationModel as never,
    imagesService as unknown as ImagesService,
  );

  return { service, productModel, locationModel, imagesService };
}

const imageFile = {
  originalname: 'coffee.png',
  mimetype: 'image/png',
  size: 1024,
  buffer: Buffer.from('image'),
} as Express.Multer.File;

describe('ProductsService product images', () => {
  it('stores one uploaded image under the location and product', async () => {
    const { service, productModel, imagesService } = createService();
    const product = createProductDocument();
    productModel.create.mockResolvedValue(product);
    imagesService.uploadProductImage.mockResolvedValue({
      url: 'https://storage.example/product.png',
      path: `location-products/${locationId}/${productId}/product.png`,
    });

    await service.create(
      locationId,
      userId,
      { name: ' Coffee ', price: 25_000 },
      imageFile,
    );

    const createdData = productModel.create.mock.calls[0][0];
    expect(imagesService.uploadProductImage).toHaveBeenCalledWith(
      locationId,
      String(createdData._id),
      imageFile,
    );
    expect(createdData).toMatchObject({
      locationId: new Types.ObjectId(locationId),
      name: 'Coffee',
      imageUrl: 'https://storage.example/product.png',
      imagePath: expect.stringMatching(
        new RegExp(`^location-products/${locationId}/`),
      ),
    });
  });

  it('deletes an uploaded object when product creation fails', async () => {
    const { service, productModel, imagesService } = createService();
    const uploaded = {
      url: 'https://storage.example/product.png',
      path: `location-products/${locationId}/${productId}/product.png`,
    };
    imagesService.uploadProductImage.mockResolvedValue(uploaded);
    productModel.create.mockRejectedValue(new Error('database unavailable'));

    await expect(
      service.create(locationId, userId, { name: 'Coffee' }, imageFile),
    ).rejects.toThrow('database unavailable');
    expect(imagesService.deleteProductImage).toHaveBeenCalledWith(
      uploaded.path,
    );
  });

  it('saves a replacement before deleting the previous object', async () => {
    const { service, productModel, imagesService } = createService();
    const product = createProductDocument({
      imageUrl: 'https://storage.example/old.png',
      imagePath: `location-products/${locationId}/${productId}/old.png`,
    });
    const replacement = {
      url: 'https://storage.example/new.png',
      path: `location-products/${locationId}/${productId}/new.png`,
    };
    productModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(product),
    });
    imagesService.uploadProductImage.mockResolvedValue(replacement);

    await service.update(productId, userId, { name: 'Coffee' }, imageFile);

    expect(product.imageUrl).toBe(replacement.url);
    expect(product.imagePath).toBe(replacement.path);
    expect(imagesService.deleteProductImage).toHaveBeenCalledWith(
      `location-products/${locationId}/${productId}/old.png`,
    );
    expect(product.save.mock.invocationCallOrder[0]).toBeLessThan(
      imagesService.deleteProductImage.mock.invocationCallOrder[0],
    );
  });

  it('removes a product image without replacing it', async () => {
    const { service, productModel, imagesService } = createService();
    const oldPath = `location-products/${locationId}/${productId}/old.png`;
    const product = createProductDocument({
      imageUrl: 'https://storage.example/old.png',
      imagePath: oldPath,
    });
    productModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(product),
    });

    await service.update(productId, userId, { removeImage: true });

    expect(product.imageUrl).toBeUndefined();
    expect(product.imagePath).toBeUndefined();
    expect(imagesService.deleteProductImage).toHaveBeenCalledWith(oldPath);
  });

  it('deletes the stored object when deleting its product', async () => {
    const { service, productModel, imagesService } = createService();
    const oldPath = `location-products/${locationId}/${productId}/old.png`;
    const product = createProductDocument({
      imageUrl: 'https://storage.example/old.png',
      imagePath: oldPath,
    });
    productModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(product),
    });

    await service.remove(productId, userId);

    expect(imagesService.deleteProductImage).toHaveBeenCalledWith(oldPath);
    expect(product.deleteOne).toHaveBeenCalled();
  });

  it('blocks product deletion during ownership hold', async () => {
    const { service, productModel, locationModel, imagesService } =
      createService();
    const product = createProductDocument({
      imagePath: `location-products/${locationId}/${productId}/old.png`,
    });
    productModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(product),
    });
    locationModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(locationId),
        ownerId: new Types.ObjectId(userId),
        holdExpiresAt: new Date(Date.now() + 60_000),
      }),
    });

    await expect(service.remove(productId, userId)).rejects.toThrow(
      'đang khóa chuyển quyền',
    );
    expect(imagesService.deleteProductImage).not.toHaveBeenCalled();
    expect(product.deleteOne).not.toHaveBeenCalled();
  });

  it('allows product deletion after ownership hold expires', async () => {
    const { service, productModel, locationModel, imagesService } =
      createService();
    const product = createProductDocument({
      imagePath: `location-products/${locationId}/${productId}/old.png`,
    });
    productModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(product),
    });
    locationModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(locationId),
        ownerId: new Types.ObjectId(userId),
        holdExpiresAt: new Date(Date.now() - 60_000),
      }),
    });

    await service.remove(productId, userId);

    expect(imagesService.deleteProductImage).toHaveBeenCalled();
    expect(product.deleteOne).toHaveBeenCalled();
  });

  it('deletes a legacy product without calling Supabase', async () => {
    const { service, productModel, imagesService } = createService();
    const product = createProductDocument({
      imageUrl: 'https://external.example/product.png',
    });
    productModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(product),
    });

    await service.remove(productId, userId);

    expect(imagesService.deleteProductImage).not.toHaveBeenCalled();
    expect(product.deleteOne).toHaveBeenCalled();
  });

  it('does not expose a legacy external URL without a storage path', async () => {
    const { service, productModel, locationModel } = createService();
    const product = createProductDocument({
      imageUrl: 'https://external.example/product.png',
    });
    locationModel.exists.mockResolvedValue(true);
    productModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([product]),
      }),
    });

    const result = await service.findByLocation(locationId);

    expect(result.products[0].imageUrl).toBeUndefined();
    expect(result.products[0].imagePath).toBeUndefined();
  });

  it('rejects simultaneous image replacement and removal', async () => {
    const { service, productModel, imagesService } = createService();
    const product = createProductDocument({
      imageUrl: 'https://storage.example/old.png',
      imagePath: `location-products/${locationId}/${productId}/old.png`,
    });
    productModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(product),
    });

    await expect(
      service.update(productId, userId, { removeImage: true }, imageFile),
    ).rejects.toThrow('Không thể vừa thay thế vừa xóa ảnh sản phẩm');
    expect(imagesService.uploadProductImage).not.toHaveBeenCalled();
  });

  it('removes a newly uploaded image when the replacement cannot be saved', async () => {
    const { service, productModel, imagesService } = createService();
    const product = createProductDocument({
      imageUrl: 'https://storage.example/old.png',
      imagePath: `location-products/${locationId}/${productId}/old.png`,
    });
    const replacement = {
      url: 'https://storage.example/new.png',
      path: `location-products/${locationId}/${productId}/new.png`,
    };
    productModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(product),
    });
    product.save.mockRejectedValueOnce(new Error('database unavailable'));
    imagesService.uploadProductImage.mockResolvedValue(replacement);

    await expect(
      service.update(productId, userId, { name: 'Coffee' }, imageFile),
    ).rejects.toThrow('database unavailable');
    expect(imagesService.deleteProductImage).toHaveBeenCalledWith(replacement.path);
  });
});
