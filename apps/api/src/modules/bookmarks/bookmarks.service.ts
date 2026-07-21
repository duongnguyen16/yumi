import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Bookmark, BookmarkDocument } from 'src/common/schemas/bookmark.schema';
import { Location, LocationDocument } from 'src/common/schemas/location.schema';
import { LocationStatus } from 'src/common/schemas/common.enums';

@Injectable()
export class BookmarksService {
  constructor(
    @InjectModel(Bookmark.name)
    private readonly bookmarkModel: Model<BookmarkDocument>,
    @InjectModel(Location.name)
    private readonly locationModel: Model<LocationDocument>,
  ) {}

  async addBookmark(userId: string, locationId: string) {
    const location = await this.locationModel.findOne({
      _id: new Types.ObjectId(locationId),
      status: LocationStatus.PUBLISHED,
    });
    if (!location) {
      throw new NotFoundException('Không tìm thấy địa điểm');
    }

    const existing = await this.bookmarkModel.findOne({
      userId: new Types.ObjectId(userId),
      locationId: new Types.ObjectId(locationId),
    });
    if (existing) {
      throw new ConflictException('Địa điểm đã được lưu trước đó');
    }

    await this.bookmarkModel.create({
      userId: new Types.ObjectId(userId),
      locationId: new Types.ObjectId(locationId),
    });

    return { success: true, message: 'Đã lưu địa điểm vào yêu thích' };
  }

  async removeBookmark(userId: string, locationId: string) {
    const result = await this.bookmarkModel.findOneAndDelete({
      userId: new Types.ObjectId(userId),
      locationId: new Types.ObjectId(locationId),
    });
    if (!result) {
      throw new NotFoundException('Không tìm thấy bookmark');
    }
    return { success: true, message: 'Đã bỏ lưu địa điểm' };
  }

  async checkBookmark(userId: string, locationId: string) {
    const existing = await this.bookmarkModel.findOne({
      userId: new Types.ObjectId(userId),
      locationId: new Types.ObjectId(locationId),
    });
    return { success: true, isBookmarked: !!existing };
  }

  async listBookmarks(userId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;

  const bookmarks = await this.bookmarkModel
    .find({ userId: new Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate({
      path: 'locationId',
      select: 'name address imagesUrls status categoryId',
      match: { status: LocationStatus.PUBLISHED },
      populate: {
        path: 'categoryId',
        select: 'name',
      },
    })
    .lean();

  // Lọc bookmark trỏ đến location bị ẩn/xóa (populate trả về null)
  const data = bookmarks
    .filter((b) => b.locationId !== null)
    .map((b) => ({
      bookmarkId: b._id,
      location: b.locationId,
    }));

  // Dùng data.length sau khi filter thay vì countDocuments
  // để total phản ánh đúng số địa điểm thực sự hiển thị được
  return { success: true, data, total: data.length, page, limit };
}
}