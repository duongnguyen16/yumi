import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BookmarksService } from './bookmarks.service';

@Controller('bookmarks')
@UseGuards(AuthGuard('jwt-at'))
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Get()
  async list(
    @Request() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const userId = this.extractUserId(req);
    return this.bookmarksService.listBookmarks(
      userId,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Get(':locationId/check')
  async check(@Request() req: any, @Param('locationId') locationId: string) {
    const userId = this.extractUserId(req);
    return this.bookmarksService.checkBookmark(userId, locationId);
  }

  @Post(':locationId')
  async add(@Request() req: any, @Param('locationId') locationId: string) {
    const userId = this.extractUserId(req);
    return this.bookmarksService.addBookmark(userId, locationId);
  }

  @Delete(':locationId')
  async remove(@Request() req: any, @Param('locationId') locationId: string) {
    const userId = this.extractUserId(req);
    return this.bookmarksService.removeBookmark(userId, locationId);
  }

  private extractUserId(req: any): string {
    const userId = (req as { user?: { userId?: string } }).user?.userId;
    if (!userId) throw new UnauthorizedException('Không tìm thấy người dùng');
    return userId;
  }
}