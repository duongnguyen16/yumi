import { ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AdminCategoryService } from './admin-category.service';

type Chain = {
  sort: () => Chain;
  lean: () => Chain;
  exec: () => Promise<unknown>;
};

function chain(result: unknown): Chain {
  const obj: Chain = {
    sort: () => obj,
    lean: () => obj,
    exec: () => Promise.resolve(result),
  };
  return obj;
}

function query(value: unknown): { exec: () => Promise<unknown> } {
  return { exec: () => Promise.resolve(value) };
}

type CategoryDoc = {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  isActive: boolean;
  save: jest.Mock;
};

type SubDoc = {
  _id: Types.ObjectId;
  categoryId: Types.ObjectId;
  name: string;
  isActive: boolean;
  save: jest.Mock;
};

describe('AdminCategoryService', () => {
  let service: AdminCategoryService;
  let categoryModel: any;
  let subCategoryModel: any;

  beforeEach(() => {
    categoryModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    subCategoryModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    };
    service = new AdminCategoryService(categoryModel, subCategoryModel);
  });

  function makeCategory(over: Partial<CategoryDoc> = {}): CategoryDoc {
    return {
      _id: new Types.ObjectId(),
      name: 'Food',
      description: undefined,
      isActive: true,
      save: jest.fn().mockResolvedValue(undefined),
      ...over,
    };
  }

  function makeSub(over: Partial<SubDoc> = {}): SubDoc {
    return {
      _id: new Types.ObjectId(),
      categoryId: over.categoryId ?? new Types.ObjectId(),
      name: 'Noodle',
      isActive: true,
      save: jest.fn().mockResolvedValue(undefined),
      ...over,
    };
  }

  describe('findAll', () => {
    it('groups subcategories under their parent category', async () => {
      const cat = makeCategory({ name: 'Food' });
      const sub = makeSub({ categoryId: cat._id, name: 'Noodle' });
      categoryModel.find.mockReturnValue(chain([cat]));
      subCategoryModel.find.mockReturnValue(chain([sub]));

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Food');
      expect(result[0].subcategories).toHaveLength(1);
      expect(result[0].subcategories[0].name).toBe('Noodle');
    });

    it('returns categories with no subcategories as an empty list', async () => {
      const cat = makeCategory();
      categoryModel.find.mockReturnValue(chain([cat]));
      subCategoryModel.find.mockReturnValue(chain([]));

      const result = await service.findAll();
      expect(result[0].subcategories).toEqual([]);
    });
  });

  describe('createCategory', () => {
    it('creates a category when the name is unique', async () => {
      categoryModel.findOne.mockReturnValue(query(null));
      const created = makeCategory({ name: 'Drink' });
      categoryModel.create.mockResolvedValue(created);

      const result = await service.createCategory({
        name: 'Drink',
        description: 'Beverages',
      });

      expect(result).toBe(created);
      expect(categoryModel.create).toHaveBeenCalledWith({
        name: 'Drink',
        description: 'Beverages',
      });
    });

    it('rejects a duplicate category name with 409', async () => {
      categoryModel.findOne.mockReturnValue(query(makeCategory({ name: 'Food' })));

      await expect(service.createCategory({ name: 'Food' })).rejects.toThrow(
        ConflictException,
      );
      expect(categoryModel.create).not.toHaveBeenCalled();
    });

    it('rejects with 409 on a race-condition duplicate key from the DB', async () => {
      categoryModel.findOne.mockReturnValue(query(null));
      categoryModel.create.mockRejectedValue({ code: 11000 });

      await expect(service.createCategory({ name: 'Food' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('updateCategory', () => {
    it('updates name and description', async () => {
      const cat = makeCategory({ name: 'Food', description: 'old' });
      categoryModel.findById.mockReturnValue(query(cat));
      categoryModel.findOne.mockReturnValue(query(null));

      await service.updateCategory(String(cat._id), {
        name: 'Foods',
        description: 'new',
      });

      expect(cat.name).toBe('Foods');
      expect(cat.description).toBe('new');
      expect(cat.save).toHaveBeenCalled();
    });

    it('rejects updating to a duplicate name with 409', async () => {
      const cat = makeCategory({ name: 'Food' });
      categoryModel.findById.mockReturnValue(query(cat));
      categoryModel.findOne.mockReturnValue(query(makeCategory({ name: 'Foods' })));

      await expect(
        service.updateCategory(String(cat._id), { name: 'Foods' }),
      ).rejects.toThrow(ConflictException);
      expect(cat.save).not.toHaveBeenCalled();
    });

    it('returns 404 when the category is missing', async () => {
      categoryModel.findById.mockReturnValue(query(null));
      await expect(
        service.updateCategory('missing', { name: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setCategoryStatus', () => {
    it('hides a category and cascades to all its subcategories', async () => {
      const cat = makeCategory({ isActive: true });
      categoryModel.findById.mockReturnValue(query(cat));
      subCategoryModel.updateMany.mockReturnValue(query({}));

      await service.setCategoryStatus(String(cat._id), false);

      expect(cat.isActive).toBe(false);
      expect(cat.save).toHaveBeenCalled();
      expect(subCategoryModel.updateMany).toHaveBeenCalledWith(
        { categoryId: cat._id },
        { $set: { isActive: false } },
      );
    });

    it('restores a category without restoring its subcategories', async () => {
      const cat = makeCategory({ isActive: false });
      categoryModel.findById.mockReturnValue(query(cat));

      await service.setCategoryStatus(String(cat._id), true);

      expect(cat.isActive).toBe(true);
      expect(cat.save).toHaveBeenCalled();
      expect(subCategoryModel.updateMany).not.toHaveBeenCalled();
    });

    it('returns 404 when the category is missing', async () => {
      categoryModel.findById.mockReturnValue(query(null));
      await expect(service.setCategoryStatus('missing', true)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createSubCategory', () => {
    it('creates a subcategory under an existing category', async () => {
      const cat = makeCategory();
      categoryModel.findById.mockReturnValue(query(cat));
      subCategoryModel.findOne.mockReturnValue(query(null));
      const created = makeSub({ categoryId: cat._id, name: 'Noodle' });
      subCategoryModel.create.mockResolvedValue(created);

      const result = await service.createSubCategory(String(cat._id), {
        name: 'Noodle',
      });

      expect(result).toBe(created);
      expect(subCategoryModel.create).toHaveBeenCalledWith({
        categoryId: cat._id,
        name: 'Noodle',
      });
    });

    it('rejects a duplicate subcategory name within the parent with 409', async () => {
      const cat = makeCategory();
      categoryModel.findById.mockReturnValue(query(cat));
      subCategoryModel.findOne.mockReturnValue(
        query(makeSub({ categoryId: cat._id, name: 'Noodle' })),
      );

      await expect(
        service.createSubCategory(String(cat._id), { name: 'Noodle' }),
      ).rejects.toThrow(ConflictException);
      expect(subCategoryModel.create).not.toHaveBeenCalled();
    });

    it('returns 404 when the parent category is missing', async () => {
      categoryModel.findById.mockReturnValue(query(null));
      await expect(
        service.createSubCategory('missing', { name: 'Noodle' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSubCategory', () => {
    it('updates the subcategory name', async () => {
      const cat = makeCategory();
      const sub = makeSub({ categoryId: cat._id, name: 'Noodle' });
      categoryModel.findById.mockReturnValue(query(cat));
      subCategoryModel.findOne
        .mockReturnValueOnce(query(sub))
        .mockReturnValueOnce(query(null));

      await service.updateSubCategory(String(cat._id), String(sub._id), {
        name: 'Noodles',
      });

      expect(sub.name).toBe('Noodles');
      expect(sub.save).toHaveBeenCalled();
    });

    it('rejects a duplicate name within the parent with 409', async () => {
      const cat = makeCategory();
      const sub = makeSub({ categoryId: cat._id, name: 'Noodle' });
      categoryModel.findById.mockReturnValue(query(cat));
      subCategoryModel.findOne
        .mockReturnValueOnce(query(sub))
        .mockReturnValueOnce(query(makeSub({ name: 'Noodles' })));

      await expect(
        service.updateSubCategory(String(cat._id), String(sub._id), {
          name: 'Noodles',
        }),
      ).rejects.toThrow(ConflictException);
      expect(sub.save).not.toHaveBeenCalled();
    });

    it('returns 404 when the subcategory is missing', async () => {
      const cat = makeCategory();
      categoryModel.findById.mockReturnValue(query(cat));
      subCategoryModel.findOne.mockReturnValue(query(null));

      await expect(
        service.updateSubCategory(String(cat._id), 'missing', { name: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setSubCategoryStatus', () => {
    it('hides a subcategory individually', async () => {
      const cat = makeCategory();
      const sub = makeSub({ categoryId: cat._id, isActive: true });
      categoryModel.findById.mockReturnValue(query(cat));
      subCategoryModel.findOne.mockReturnValue(query(sub));

      await service.setSubCategoryStatus(
        String(cat._id),
        String(sub._id),
        false,
      );

      expect(sub.isActive).toBe(false);
      expect(sub.save).toHaveBeenCalled();
    });

    it('restores a subcategory individually', async () => {
      const cat = makeCategory();
      const sub = makeSub({ categoryId: cat._id, isActive: false });
      categoryModel.findById.mockReturnValue(query(cat));
      subCategoryModel.findOne.mockReturnValue(query(sub));

      await service.setSubCategoryStatus(
        String(cat._id),
        String(sub._id),
        true,
      );

      expect(sub.isActive).toBe(true);
      expect(sub.save).toHaveBeenCalled();
    });

    it('returns 404 when the subcategory is missing', async () => {
      const cat = makeCategory();
      categoryModel.findById.mockReturnValue(query(cat));
      subCategoryModel.findOne.mockReturnValue(query(null));

      await expect(
        service.setSubCategoryStatus(String(cat._id), 'missing', true),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
