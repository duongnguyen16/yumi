import { Module } from '@nestjs/common';
import { SchemaModule } from 'src/common/schemas/schema.module';
import { BookmarksController } from './bookmarks.controller';
import { BookmarksService } from './bookmarks.service';

@Module({
  imports: [SchemaModule],
  controllers: [BookmarksController],
  providers: [BookmarksService],
})
export class BookmarksModule {}